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
      const totalSpent = userExpenses.reduce((sum, exp) => sum + exp.total_amount, 0)
      const avgSpent = totalSpent / userExpenses.length
      
      // Group by business purpose for insights
      const purposeTotals = userExpenses.reduce((acc, exp) => {
        const purpose = exp.business_purpose || 'Uncategorized'
        acc[purpose] = (acc[purpose] || 0) + exp.total_amount
        return acc
      }, {})

      // Show all transactions for "all" requests, otherwise show recent ones
      const transactionsToShow = contextScope === 'all' ? userExpenses : userExpenses.slice(0, 5)
      
      contextSummary = `${contextScope.toUpperCase()} EXPENSES (${userExpenses.length} transactions):
Total: $${totalSpent.toFixed(2)} | Average: $${avgSpent.toFixed(2)}

${contextScope === 'all' ? 'ALL TRANSACTIONS:' : 'RECENT TRANSACTIONS:'}
${transactionsToShow.map(exp => 
  `${exp.date}: $${exp.total_amount} at ${exp.merchant_name}${exp.business_purpose ? ` (${exp.business_purpose})` : ''}`
).join('\n')}

${Object.keys(purposeTotals).length > 1 ? `SPENDING BY CATEGORY:
${Object.entries(purposeTotals).map(([purpose, total]) => 
  `${purpose}: $${total.toFixed(2)}`
).join('\n')}` : ''}`
    }

    console.log('📊 Message API Debug - User expense context:', {
      expenseCount: userExpenses?.length || 0,
      totalSpent: userExpenses?.reduce((sum, exp) => sum + exp.total_amount, 0) || 0
    })

    // --- Check for pending items ---
    const { data: pendingExpense } = await supabase
      .from('pending_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('telegram_id', telegramId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: pendingBusinessPurpose } = await supabase
      .from('pending_business_purposes')
      .select('*')
      .eq('user_id', userId)
      .eq('telegram_id', telegramId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const pendingContext = []
    if (pendingExpense) {
      pendingContext.push(`PENDING EXPENSE: ${pendingExpense.expense_data.merchant} - $${pendingExpense.expense_data.amount}`)
    }
    if (pendingBusinessPurpose) {
      pendingContext.push(`PENDING BUSINESS PURPOSE: "${pendingBusinessPurpose.purpose_data.name}"`)
    }

    // --- Enhanced system prompt with full context and decision-making ---
    const systemPrompt = `You are an intelligent expense management assistant with full access to the user's expense data.

USER'S RECENT EXPENSES:
${contextSummary}

AVAILABLE BUSINESS PURPOSE CATEGORIES: ${availableCategories}

${pendingContext.length > 0 ? `PENDING ITEMS WAITING FOR CONFIRMATION:
${pendingContext.join('\n')}` : ''}

You can:
1. CREATE new expenses from receipts or transaction descriptions
2. SUMMARIZE expense patterns and insights
3. ANSWER questions about spending habits
4. PROVIDE financial advice and recommendations
5. HELP with expense categorization and organization

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

Use your judgment to decide the best action:

1. For receipts/transactions: Extract details and respond with "create" action to ask for confirmation
2. For confirmations: If user says "yes", "confirm", "ok", "sure", "yep", "yeah", etc., respond with "confirm" action (even if no specific context is mentioned)
3. For cancellations: If user says "no", "cancel", "stop", "nope", "nah", etc., respond with "cancel" action
4. For business purpose requests: If user asks to add a new business purpose, respond with "add_business_purpose" action
5. For questions: Provide detailed insights based on the data provided
6. For "all transactions" requests: Include ALL the transactions shown in the context

SMART CATEGORIZATION: When categorizing expenses, if the merchant/expense doesn't fit existing categories well, suggest a new business purpose using "add_business_purpose" action instead of forcing it into an existing category.

IMPORTANT: When a user responds with "yes", "confirm", "ok", etc., check the pending items above:
- If there's a PENDING BUSINESS PURPOSE, respond with "confirm_business_purpose" action
- If there's a PENDING EXPENSE, respond with "confirm" action
- If no pending items, ask what they want to confirm`

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
          // Handle expense creation with confirmation
          if (extractedAction.amount && extractedAction.date && extractedAction.merchant) {
            // Generate confirmation message
            const confirmationMessage = `📋 Please confirm these expense details:

💰 Amount: $${extractedAction.amount}
🏪 Merchant: ${extractedAction.merchant}
📅 Date: ${extractedAction.date}
🏷️ Category: ${extractedAction.business_purpose || 'Uncategorized'}

Reply with "yes" or "confirm" to create this expense, or "no" to cancel.`

            // Store pending expense data for confirmation
            const pendingExpense = {
              amount: extractedAction.amount,
              date: extractedAction.date,
              merchant: extractedAction.merchant,
              business_purpose: extractedAction.business_purpose,
              imageData: imageData,
              imageFormat: imageFormat,
              timestamp: new Date().toISOString()
            }

            // Store pending expense in database for later confirmation
            const { error: pendingError } = await supabase
              .from('pending_expenses')
              .insert({
                user_id: userId,
                telegram_id: telegramId,
                expense_data: pendingExpense,
                status: 'pending'
              })

            if (!pendingError) {
              responseMessage = confirmationMessage
              console.log('⏳ Message API Debug - Pending expense created, waiting for confirmation:', pendingExpense)
            } else {
              responseMessage = `❌ Error creating pending expense: ${pendingError.message}`
              console.error('❌ Message API Debug - Error creating pending expense:', pendingError)
            }
          } else {
            responseMessage = `❌ Invalid expense data. Please provide amount, date, and merchant.`
          }
          break

        case 'confirm':
          // Handle expense confirmation
          try {
            // Get the most recent pending expense for this user
            const { data: pendingExpense, error: fetchError } = await supabase
              .from('pending_expenses')
              .select('*')
              .eq('user_id', userId)
              .eq('telegram_id', telegramId)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (fetchError || !pendingExpense) {
              responseMessage = `❌ No pending expense found to confirm. Please try creating a new expense.`
              console.log('❌ Message API Debug - No pending expense found')
              break
            }

            const expenseData = pendingExpense.expense_data

            // Map business purpose name to ID
            let businessPurposeId = null
            if (expenseData.business_purpose && businessPurposes) {
              const matchingPurpose = businessPurposes.find((p: any) => 
                p.name.toLowerCase() === expenseData.business_purpose.toLowerCase()
              )
              businessPurposeId = matchingPurpose?.id || null
            }

            // Store the receipt image if we have image data
            let receiptUrl = null
            let receiptFilename = null
            
            if (expenseData.imageData) {
              try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                const filename = `receipt_${expenseData.merchant?.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${expenseData.imageFormat || 'jpg'}`
                
                const dataUrl = `data:image/${expenseData.imageFormat || 'jpeg'};base64,${expenseData.imageData}`
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
                total_amount: expenseData.amount,
                date: expenseData.date,
                merchant_name: expenseData.merchant || 'Unknown',
                business_purpose: expenseData.business_purpose || null,
                business_purpose_id: businessPurposeId,
                receipt_url: receiptUrl,
                receipt_filename: receiptFilename
              })

            if (!expenseInsertError) {
              // Mark pending expense as confirmed
              await supabase
                .from('pending_expenses')
                .update({ status: 'confirmed' })
                .eq('id', pendingExpense.id)

              expenseCreated = true
              responseMessage = `✅ Expense confirmed and created: $${expenseData.amount} at ${expenseData.merchant} on ${expenseData.date}`
              console.log('✅ Message API Debug - Expense confirmed and created:', expenseData)
            } else {
              expenseError = expenseInsertError
              responseMessage = `❌ Failed to create expense: ${expenseInsertError.message}`
              console.error('❌ Message API Debug - Error creating expense:', expenseInsertError)
            }
          } catch (err) {
            expenseError = err
            responseMessage = `❌ Error confirming expense: ${err}`
            console.error('❌ Message API Debug - Exception confirming expense:', err)
          }
          break

        case 'cancel':
          // Handle expense cancellation
          try {
            // Mark the most recent pending expense as cancelled
            const { error: cancelError } = await supabase
              .from('pending_expenses')
              .update({ status: 'cancelled' })
              .eq('user_id', userId)
              .eq('telegram_id', telegramId)
              .eq('status', 'pending')

            if (!cancelError) {
              responseMessage = `❌ Expense creation cancelled.`
              console.log('❌ Message API Debug - Expense creation cancelled')
            } else {
              responseMessage = `❌ Error cancelling expense: ${cancelError.message}`
              console.error('❌ Message API Debug - Error cancelling expense:', cancelError)
            }
          } catch (err) {
            responseMessage = `❌ Error cancelling expense: ${err}`
            console.error('❌ Message API Debug - Exception cancelling expense:', err)
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
            // Get the most recent pending business purpose for this user
            const { data: pendingPurpose, error: fetchError } = await supabase
              .from('pending_business_purposes')
              .select('*')
              .eq('user_id', userId)
              .eq('telegram_id', telegramId)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (fetchError || !pendingPurpose) {
              responseMessage = `❌ No pending business purpose found to confirm. Please try adding a new business purpose.`
              console.log('❌ Message API Debug - No pending business purpose found')
              break
            }

            const purposeData = pendingPurpose.purpose_data

            // Create the actual business purpose
            const { data: newPurpose, error: purposeInsertError } = await supabase
              .from('business_purposes')
              .insert({
                name: purposeData.name,
                is_default: false,
                created_by: userId
              })
              .select()
              .single()

            if (!purposeInsertError && newPurpose) {
              // Mark pending business purpose as confirmed
              await supabase
                .from('pending_business_purposes')
                .update({ status: 'confirmed' })
                .eq('id', pendingPurpose.id)

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