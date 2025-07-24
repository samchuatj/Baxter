import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Helper to extract JSON from LLM response
function extractJsonFromText(text: string): any | null {
  try {
    // Find the first JSON block in the text
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0])
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { telegramId, userId, message, type, imageData, imageFormat } = await request.json()

    console.log('🔍 Message API Debug - Received request:', { 
      telegramId, 
      userId, 
      message, 
      type,
      hasImageData: !!imageData 
    })

    if (!telegramId || !userId || !message || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Create a service role client for API operations
    // This bypasses RLS policies but we ensure security by verifying user ownership
    const supabase = createServiceRoleClient()

    // Verify the user is linked
    const { data: linkedUser, error: linkError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .eq('user_id', userId)
      .single()

    if (linkError || !linkedUser) {
      console.log('❌ Message API Debug - User not linked:', { telegramId, userId })
      return NextResponse.json(
        { success: false, error: 'User not linked' },
        { status: 400 }
      )
    }

    console.log('✅ Message API Debug - User verified, processing message')

    let processedMessage = message
    let aiResponse: string | null = null
    let expenseCreated = false
    let expenseError = null

    // --- Get available business purposes for categorization ---
    const { data: businessPurposes, error: purposesError } = await supabase
      .from('business_purposes')
      .select('id, name')

    if (purposesError) {
      console.error('❌ Message API Debug - Error fetching business purposes:', purposesError)
    }

    const availableCategories = businessPurposes?.map((p: any) => p.name).join(', ') || 'Food, Travel, Software Subscription, Others'
    console.log('📋 Message API Debug - Available categories:', availableCategories)

    // --- Determine context scope based on message content ---
    const messageLower = message.toLowerCase()
    let contextScope = 'recent'
    let expenseLimit = 10
    let dateFilter = null

    // Analyze message to determine what context is needed
    if (messageLower.includes('all') || messageLower.includes('total') || messageLower.includes('complete')) {
      contextScope = 'all'
      expenseLimit = 100 // Get more expenses for comprehensive analysis
    } else if (messageLower.includes('month') || messageLower.includes('this month')) {
      contextScope = 'month'
      const now = new Date()
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    } else if (messageLower.includes('week') || messageLower.includes('this week')) {
      contextScope = 'week'
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = weekAgo.toISOString().split('T')[0]
    } else if (messageLower.includes('year') || messageLower.includes('annual')) {
      contextScope = 'year'
      const now = new Date()
      dateFilter = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    }

    console.log('🎯 Message API Debug - Context scope:', { contextScope, expenseLimit, dateFilter })

    // --- Build query based on context scope ---
    let expensesQuery = supabase
      .from('expenses')
      .select(`
        id,
        date,
        merchant_name,
        total_amount,
        business_purpose,
        business_purpose_id,
        receipt_filename,
        created_at
      `)
      .eq('user_id', userId)

    // Apply date filter if specified
    if (dateFilter) {
      expensesQuery = expensesQuery.gte('date', dateFilter)
    }

    // Apply limit and ordering
    const { data: userExpenses, error: expensesError } = await expensesQuery
      .order('date', { ascending: false })
      .limit(expenseLimit)

    if (expensesError) {
      console.error('❌ Message API Debug - Error fetching user expenses:', expensesError)
    }

    // --- Create intelligent context summary ---
    let contextSummary = 'No expenses found.'
    
    if (userExpenses && userExpenses.length > 0) {
      const totalSpent = userExpenses.reduce((sum: any, exp: any) => sum + exp.total_amount, 0)
      const avgSpent = totalSpent / userExpenses.length
      
      // Group by business purpose for insights
      const purposeTotals = userExpenses.reduce((acc: any, exp: any) => {
        const purpose = exp.business_purpose || 'Uncategorized'
        acc[purpose] = (acc[purpose] || 0) + exp.total_amount
        return acc
      }, {})

      // Show all transactions for "all" requests, otherwise show recent ones
      const transactionsToShow = contextScope === 'all' ? userExpenses : userExpenses.slice(0, 5)
      
      contextSummary = `${contextScope.toUpperCase()} EXPENSES (${userExpenses.length} transactions):
Total: $${totalSpent.toFixed(2)} | Average: $${avgSpent.toFixed(2)}

${contextScope === 'all' ? 'ALL TRANSACTIONS:' : 'RECENT TRANSACTIONS:'}
${transactionsToShow.map((exp: any) => 
  `${exp.date}: $${exp.total_amount} at ${exp.merchant_name}${exp.business_purpose ? ` (${exp.business_purpose})` : ''}`
).join('\n')}

${Object.keys(purposeTotals).length > 1 ? `SPENDING BY CATEGORY:\n${Object.entries(purposeTotals).map(([purpose, total]: [string, any]) => 
  `${purpose}: $${total.toFixed(2)}`
).join('\n')}` : ''}`
    }

    console.log('📊 Message API Debug - User expense context:', {
      expenseCount: userExpenses?.length || 0,
      totalSpent: userExpenses?.reduce((sum, exp) => sum + exp.total_amount, 0) || 0
    })

    // --- Check for pending items ---
    let pendingBusinessPurpose = null
    if (supabase && typeof supabase.from === 'function') {
      const pbpQuery = supabase.from('pending_business_purposes');
      if (pbpQuery && typeof pbpQuery.select === 'function') {
        const selectResult = pbpQuery.select('*');
        if (
          selectResult &&
          typeof selectResult.eq === 'function' &&
          typeof selectResult.order === 'function' &&
          typeof selectResult.limit === 'function' &&
          typeof selectResult.single === 'function'
        ) {
          try {
            const result = await selectResult
              .eq('user_id', userId)
              .eq('telegram_id', telegramId)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            pendingBusinessPurpose = result ? result.data : null;
          } catch {
            pendingBusinessPurpose = null;
          }
        } else {
          pendingBusinessPurpose = null;
        }
      }
    }
    // Remove pendingContext for expenses
    const pendingContext = []
    if (pendingBusinessPurpose) {
      pendingContext.push(`PENDING BUSINESS PURPOSE: "${pendingBusinessPurpose.purpose_data.name}"`)
    }

    // --- Enhanced system prompt with full context and decision-making ---
    const systemPrompt = `You are an intelligent expense management assistant for a Telegram bot. You can:
- Receive messages (text or image) from the user
- Create a new expense from a message or receipt image (do this immediately, do not ask for confirmation)
- Edit an existing expense if the user requests
- Answer questions about expenses or provide summaries

USER'S RECENT EXPENSES:
${contextSummary}

AVAILABLE BUSINESS PURPOSE CATEGORIES: ${availableCategories}

RESPONSE FORMATS:

For creating expenses (receipts/transactions):
\`\`\`json
{
  "action": "create",
  "amount": 12.34,
  "date": "2024-07-19",
  "merchant": "Coffee Shop",
  "business_purpose": "Food"
}
\`\`\`

For editing an expense:
\`\`\`json
{
  "action": "edit",
  "expense_id": "...",
  "fields_to_update": { "amount": 20.00, "merchant": "New Name", ... }
}
\`\`\`

For adding new business purposes:
\`\`\`json
{
  "action": "add_business_purpose",
  "purpose_name": "Office Supplies"
}
\`\`\`

For summaries or insights:
\`\`\`json
{
  "action": "summary",
  "text": "Your spending summary and insights..."
}
\`\`\`

For questions or general responses:
\`\`\`json
{
  "action": "reply",
  "text": "Your helpful response..."
}
\`\`\`

Use your judgment to decide the best action. If the user wants to edit an expense, use the 'edit' action and specify the expense_id and fields to update. Always return a single JSON object describing the action to take. Do not ask for confirmation before creating an expense.`

    let openaiPayload: any = {
      model: type === 'image' ? 'gpt-4o' : 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
      ],
      max_tokens: 700
    }

    if (type === 'image' && imageData) {
      openaiPayload.messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please analyze this image.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/${imageFormat};base64,${imageData}`
            }
          }
        ]
      })
    } else {
      openaiPayload.messages.push({ role: 'user', content: message })
    }

    // --- Call OpenAI ---
    let chatResponse = null
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiPayload)
      })
      if (openaiRes.ok) {
        const openaiJson = await openaiRes.json()
        aiResponse = openaiJson.choices[0]?.message?.content
        processedMessage = aiResponse ? `AI Response: ${aiResponse}\n\nOriginal Message: ${message}` : message
        console.log('✅ Message API Debug - LLM response received')
      } else {
        aiResponse = null
        processedMessage = message
        console.log('❌ Message API Debug - OpenAI API error:', await openaiRes.text())
      }
    } catch (error) {
      aiResponse = null
      processedMessage = message
      console.error('❌ Message API Debug - Error calling OpenAI:', error)
    }

    // --- Parse LLM response and take appropriate action ---
    let extractedAction = aiResponse ? extractJsonFromText(aiResponse) : null
    let responseMessage = aiResponse || processedMessage

    if (extractedAction && extractedAction.action) {
      console.log('🎯 Message API Debug - LLM action detected:', extractedAction.action)

      switch (extractedAction.action) {
        case 'create':
          // Immediately create the expense, do not ask for confirmation
          if (extractedAction.amount && extractedAction.date && extractedAction.merchant) {
            // Map business purpose name to ID
            let businessPurposeId = null
            if (extractedAction.business_purpose && businessPurposes) {
              const matchingPurpose = businessPurposes.find((p: any) => 
                p.name.toLowerCase() === extractedAction.business_purpose.toLowerCase()
              )
              businessPurposeId = matchingPurpose?.id || null
            }

            // Store the receipt image if we have image data
            let receiptUrl = null
            let receiptFilename = null
            if (imageData) {
              try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                const filename = `receipt_${extractedAction.merchant?.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${imageFormat || 'jpg'}`
                const dataUrl = `data:image/${imageFormat || 'jpeg'};base64,${imageData}`
                receiptUrl = dataUrl
                receiptFilename = filename
              } catch (err) {
                console.error('❌ Message API Debug - Exception storing receipt:', err)
              }
            }

            // Create the actual expense
            const { error: expenseInsertError } = await supabase
              .from('expenses')
              .insert({
                user_id: userId,
                total_amount: extractedAction.amount,
                date: extractedAction.date,
                merchant_name: extractedAction.merchant || 'Unknown',
                business_purpose: extractedAction.business_purpose || null,
                business_purpose_id: businessPurposeId,
                receipt_url: receiptUrl,
                receipt_filename: receiptFilename
              })

            if (!expenseInsertError) {
              expenseCreated = true
              responseMessage = `✅ Expense created: $${extractedAction.amount} at ${extractedAction.merchant} on ${extractedAction.date}`
              console.log('✅ Message API Debug - Expense created:', extractedAction)
            } else {
              expenseError = expenseInsertError
              responseMessage = `❌ Failed to create expense: ${expenseInsertError.message}`
              console.error('❌ Message API Debug - Error creating expense:', expenseInsertError)
            }
          } else {
            responseMessage = `❌ Invalid expense data. Please provide amount, date, and merchant.`
          }
          break

        case 'edit':
          // Handle editing an existing expense
          if (extractedAction.expense_id && extractedAction.fields_to_update && Object.keys(extractedAction.fields_to_update).length > 0) {
            // Update the specified expense
            const { error: editError } = await supabase
              .from('expenses')
              .update(extractedAction.fields_to_update)
              .eq('id', extractedAction.expense_id)
              .eq('user_id', userId)

            if (!editError) {
              responseMessage = `✅ Expense updated successfully.`
              console.log('✅ Message API Debug - Expense updated:', extractedAction)
            } else {
              responseMessage = `❌ Failed to update expense: ${editError.message}`
              console.error('❌ Message API Debug - Error updating expense:', editError)
            }
          } else {
            responseMessage = `❌ Invalid edit request. Please specify the expense_id and fields to update.`
          }
          break

        case 'add_business_purpose':
          // Handle adding new business purpose
          if (extractedAction.purpose_name) {
            // Generate confirmation message
            const confirmationMessage = `🏷️ Please confirm adding this new business purpose:

📝 Name: "${extractedAction.purpose_name}"

Reply with "yes" or "confirm" to add this business purpose, or "no" to cancel.`

            // Store pending business purpose for confirmation
            const pendingPurpose = {
              name: extractedAction.purpose_name,
              timestamp: new Date().toISOString()
            }

            // Store pending business purpose in database
            const { error: pendingError } = await supabase
              .from('pending_business_purposes')
              .insert({
                user_id: userId,
                telegram_id: telegramId,
                purpose_data: pendingPurpose,
                status: 'pending'
              })

            if (!pendingError) {
              responseMessage = confirmationMessage
              console.log('⏳ Message API Debug - Pending business purpose created:', pendingPurpose)
            } else {
              responseMessage = `❌ Error creating pending business purpose: ${pendingError.message}`
              console.error('❌ Message API Debug - Error creating pending business purpose:', pendingError)
            }
          } else {
            responseMessage = `❌ Invalid business purpose data. Please provide a name.`
          }
          break

        case 'confirm_business_purpose':
          // Handle business purpose confirmation
          try {
            let pendingPurpose = null;
            const pbpQuery = supabase.from('pending_business_purposes');
            if (pbpQuery && typeof pbpQuery.select === 'function') {
              const selectResult = pbpQuery.select('*');
              if (
                selectResult &&
                typeof selectResult.eq === 'function' &&
                typeof selectResult.order === 'function' &&
                typeof selectResult.limit === 'function' &&
                typeof selectResult.single === 'function'
              ) {
                const result = await selectResult
                  .eq('user_id', userId)
                  .eq('telegram_id', telegramId)
                  .eq('status', 'pending')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                pendingPurpose = result ? result.data : null;
              }
            }
            if (!pendingPurpose) {
              responseMessage = `❌ No pending business purpose found to confirm. Please try adding a new business purpose.`
              console.log('❌ Message API Debug - No pending business purpose found')
              break
            }
            const purposeData = pendingPurpose.purpose_data
            let newPurpose = null;
            let purposeInsertError = null;
            const bpQuery = supabase.from('business_purposes');
            if (bpQuery && typeof bpQuery.insert === 'function') {
              const insertResult = await bpQuery
                .insert({
                  name: purposeData.name,
                  is_default: false,
                  created_by: userId
                });
              if (insertResult && typeof insertResult.select === 'function') {
                const selectResult = await insertResult.select().single();
                newPurpose = selectResult ? selectResult.data : null;
                purposeInsertError = selectResult ? selectResult.error : null;
              } else {
                newPurpose = insertResult ? insertResult.data : null;
                purposeInsertError = insertResult ? insertResult.error : null;
              }
            }
            if (!purposeInsertError && newPurpose) {
              // Mark pending business purpose as confirmed
              const updateQuery = supabase.from('pending_business_purposes');
              if (updateQuery && typeof updateQuery.update === 'function') {
                const updateResult = updateQuery.update({ status: 'confirmed' });
                if (updateResult && typeof updateResult.eq === 'function') {
                  await updateResult.eq('id', pendingPurpose.id);
                }
              }
              responseMessage = `✅ Business purpose "${purposeData.name}" added successfully!`
              console.log('✅ Message API Debug - Business purpose confirmed and created:', newPurpose)
            } else {
              responseMessage = `❌ Failed to create business purpose: ${purposeInsertError?.message || 'Unknown error'}`
              console.error('❌ Message API Debug - Error creating business purpose:', purposeInsertError)
            }
          } catch (err) {
            responseMessage = `❌ Error confirming business purpose: ${err}`
            console.error('❌ Message API Debug - Exception confirming business purpose:', err)
          }
          break

        case 'cancel_business_purpose':
          // Handle business purpose cancellation
          try {
            // Mark the most recent pending business purpose as cancelled
            const { error: cancelError } = await supabase
              .from('pending_business_purposes')
              .update({ status: 'cancelled' })
              .eq('user_id', userId)
              .eq('telegram_id', telegramId)
              .eq('status', 'pending')

            if (!cancelError) {
              responseMessage = `❌ Business purpose creation cancelled.`
              console.log('❌ Message API Debug - Business purpose creation cancelled')
            } else {
              responseMessage = `❌ Error cancelling business purpose: ${cancelError.message}`
              console.error('❌ Message API Debug - Error cancelling business purpose:', cancelError)
            }
          } catch (err) {
            responseMessage = `❌ Error cancelling business purpose: ${err}`
            console.error('❌ Message API Debug - Exception cancelling business purpose:', err)
          }
          break

        case 'summary':
          // Handle summary requests
          responseMessage = extractedAction.text || 'Summary not available'
          console.log('📊 Message API Debug - Summary requested')
          break

        case 'reply':
          // Handle general replies
          responseMessage = extractedAction.text || aiResponse || 'I understand your message.'
          console.log('💬 Message API Debug - General reply')
          break

        default:
          // Fallback to original response
          responseMessage = aiResponse || processedMessage
          console.log('🔄 Message API Debug - Unknown action, using original response')
      }
    } else {
      // No structured action found, use the LLM response as-is
      responseMessage = aiResponse || processedMessage
      console.log('💭 Message API Debug - No structured action, using conversational response')
    }

    // --- Store the message in database ---
    const { error: insertError } = await supabase
      .from('telegram_messages')
      .insert({
        telegram_id: telegramId,
        user_id: userId,
        message: processedMessage,
        type: type,
        original_message: message
      })

    if (insertError) {
      console.error('❌ Message API Debug - Error storing message:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to store message' },
        { status: 500 }
      )
    }

    console.log('✅ Message API Debug - Message processed and stored successfully')

    return NextResponse.json({ 
      success: true, 
      message: responseMessage,
      expenseCreated,
      expenseError
    })

  } catch (error) {
    console.error('❌ Message API Debug - Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 