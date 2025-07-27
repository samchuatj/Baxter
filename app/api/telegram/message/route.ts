import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { TelegramBotService } from '@/lib/telegram-bot'
import { Buffer } from 'buffer'
import crypto from 'crypto'

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
    const { telegramId, userId, chatId, message, type, imageData, imageFormat, repliedToMessage } = await request.json()

    console.log('🔍 Message API Debug - Received request:', { 
      telegramId, 
      userId, 
      chatId,
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

    // Verify the user is linked and check if they're a PA
    const { data: linkedUser, error: linkError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single()

    if (linkError || !linkedUser) {
      console.log('❌ Message API Debug - User not linked:', { telegramId, userId })
      return NextResponse.json(
        { success: false, error: 'User not linked' },
        { status: 400 }
      )
    }

    // Check if this is a group message and validate group registration
    let targetUserId: string
    if (chatId && chatId < 0) { // Negative chatId indicates a group
      // Check if this group is registered
      const { data: groupChat, error: groupError } = await supabase
        .from('group_chats')
        .select('user_id')
        .eq('chat_id', chatId)
        .eq('is_active', true)
        .single()

      if (groupError || !groupChat) {
        console.log('❌ Message API Debug - Group not registered:', { chatId, telegramId })
        return NextResponse.json(
          { 
            success: false, 
            error: 'Group not registered',
            message: '❌ This group is not registered for expense tracking. Please use /register to register this group first.'
          },
          { status: 403 }
        )
      }

      // Use the group owner's user ID for expense creation
      targetUserId = groupChat.user_id
      console.log('✅ Message API Debug - Group-based access, creating expenses for group owner:', { 
        chatId,
        telegramId, 
        groupOwnerId: targetUserId ? `${targetUserId.substring(0, 8)}...` : null 
      })
    } else {
      // Direct message - use the user's own account
      targetUserId = linkedUser.user_id
      console.log('✅ Message API Debug - Direct message, creating expenses for user:', { 
        telegramId, 
        userId: targetUserId ? `${targetUserId.substring(0, 8)}...` : null 
      })
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

    const availableCategories = businessPurposes?.map((p: any) => p.name).join(', ') || 'Food, Transport, Software Subscription, Others'
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
      .eq('user_id', targetUserId)

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
    let contextSummary = '😕 No expenses found.'
    
    if (userExpenses && userExpenses.length > 0) {
      const totalSpent = userExpenses.reduce((sum: any, exp: any) => sum + exp.total_amount, 0)
      const avgSpent = totalSpent / userExpenses.length
      
      // Group by business purpose for insights
      const purposeTotals = userExpenses.reduce((acc: any, exp: any) => {
        const purpose = exp.business_purpose || 'Uncategorized'
        acc[purpose] = (acc[purpose] || 0) + exp.total_amount
        return acc
      }, {})

      // Emoji map for categories
      const categoryEmojis: Record<string, string> = {
        'Food': '🍔',
        'Transport': '🚗',
        'Software Subscription': '💻',
        'Others': '🛒',
        'Uncategorized': '❓'
      }

      // Show all transactions for "all" requests, otherwise show recent ones
      const transactionsToShow = contextScope === 'all' ? userExpenses : userExpenses.slice(0, 5)
      
      // Format each transaction line with emojis and bullet points for better readability
      contextSummary = `💸 *${contextScope.toUpperCase()} EXPENSES* (${userExpenses.length} transactions):\n\n` +
        `🧾 *Total*: $${totalSpent.toFixed(2)} | 📊 *Average*: $${avgSpent.toFixed(2)}\n\n` +
        `${contextScope === 'all' ? '📜 *All Transactions*:' : '🕑 *Recent Transactions*:'}\n` +
        transactionsToShow.map((exp: any) => {
          const cat = exp.business_purpose || 'Uncategorized'
          const emoji = categoryEmojis[cat] || '💵'
          return `• ${emoji} ${exp.date}: $${exp.total_amount} at ${exp.merchant_name}${exp.business_purpose ? ` (${exp.business_purpose})` : ''}`
        }).join('\n') +
        (Object.keys(purposeTotals).length > 1 ? `\n\n📂 *Spending by Category:*\n` +
          Object.entries(purposeTotals).map(([purpose, total]: [string, any]) => {
            const emoji = categoryEmojis[purpose] || '💵'
            return `• ${emoji} ${purpose}: $${total.toFixed(2)}`
          }).join('\n') : '')
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

    // --- Fetch last 10 chat messages for context ---
    let chatLog = ''
    try {
      const { data: chatMessages, error: chatLogError } = await supabase
        .from('telegram_messages')
        .select('message, type, created_at, original_message')
        .eq('user_id', userId)
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (!chatLogError && chatMessages && chatMessages.length > 0) {
        // Show most recent last, with better formatting
        const chatLines = chatMessages.reverse().map((msg: any, index: number) => {
          const time = new Date(msg.created_at).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })
          
          // Determine if this is a user message or bot response
          const isUserMessage = msg.type === 'text' || msg.type === 'image'
          const prefix = isUserMessage ? '👤 User' : '🤖 Bot'
          
          // Use original_message for user messages, processed message for bot responses
          const displayMessage = isUserMessage ? (msg.original_message || msg.message) : msg.message
          
          // Truncate very long messages
          const truncatedMessage = displayMessage.length > 200 
            ? displayMessage.substring(0, 200) + '...' 
            : displayMessage
          
          return `${prefix} [${time}]: ${truncatedMessage}`
        })
        chatLog = chatLines.join('\n')
      }
    } catch (e) {
      console.error('Error fetching chat log:', e)
      chatLog = ''
    }

    // --- Enhanced system prompt with full context and decision-making ---
    const systemPrompt = `You are an intelligent expense management assistant for a Telegram bot. You can:
- Receive messages (text or image) from the user
- Create a new expense from a message or receipt image (do this immediately, do not ask for confirmation)
- Edit an existing expense if the user requests
- Send a receipt image or file to the user if requested (see below)
- Answer questions about expenses or provide summaries
- Manage business purposes (add, remove, list, view)

IMPORTANT: When you receive a receipt image, you MUST automatically create an expense using the "create" action. Do not just describe what you see - actually create the expense record. Only use "reply" action for general questions or when you cannot extract expense data.

CONTEXT USAGE: Use the chat log to understand the conversation flow and user intent. Look for:
- Previous expense creation messages that the user might want to edit
- Recent expense summaries or lists that provide context
- User's previous requests and your responses
- Patterns in the user's behavior or preferences

${chatLog ? `CHAT LOG (last 10 messages):\n${chatLog}\n` : ''}${repliedToMessage ? `USER'S REPLIED-TO MESSAGE:\n${repliedToMessage}\n` : ''}USER'S RECENT EXPENSES:
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

NOTE: When analyzing receipt images, ALWAYS use the "create" action to automatically create the expense. Do not use "reply" action for receipts.

For editing an expense (IMPORTANT: Do NOT use an expense_id. Instead, specify a filter object with as much detail as possible to uniquely identify the expense, e.g. by date, merchant, amount, and/or category). You can update ANY field of an expense:

\`\`\`json
{
  "action": "edit",
  "filter": { "date": "2024-07-19", "merchant": "Coffee Shop", "amount": 12.34 },
  "fields_to_update": { 
    "date": "2024-07-20",
    "merchant_name": "New Merchant Name", 
    "total_amount": 20.00,
    "business_purpose": "New Category",
    "business_purpose_id": "uuid-if-known"
  }
}
\`\`\`

You can update any combination of these fields:
- date: Change the expense date
- merchant_name: Change the merchant/store name  
- total_amount: Change the expense amount
- business_purpose: Change the business purpose category
- business_purpose_id: Set the business purpose ID (if you know it)

Examples of edit requests:
- "Change the amount of my coffee expense from yesterday to $15.50"
- "Update the merchant name for my lunch expense to 'New Restaurant'"
- "Change the category of my travel expense to 'Business Travel'"
- "Update the date of my software subscription to January 15th"

Examples of replying to expense messages:
- User replies "update the amount to 15" to a message showing "Amount: $25.3, Merchant: Grab, Date: 2025-07-25" → Use filter { amount: 25.3, merchant: "Grab", date: "2025-07-25" } and update { total_amount: 15 }
- User replies "change the merchant to Starbucks" to a message showing "Coffee Shop, $12.50" → Use filter { merchant: "Coffee Shop", amount: 12.50 } and update { merchant_name: "Starbucks" }
- User replies "that was actually business travel" to a message showing "Travel expense" → Use filter { business_purpose: "Travel" } and update { business_purpose: "Travel" }

For sending a receipt image or file to the user (IMPORTANT: Do NOT use an expense_id. Instead, specify a filter object with as much detail as possible to uniquely identify the expense, e.g. by date, merchant, amount, and/or category):
\`\`\`json
{
  "action": "send_receipt",
  "filter": { "date": "2024-07-19", "merchant": "Coffee Shop", "amount": 12.34 }
}
\`\`\`

For adding new business purposes:
\`\`\`json
{
  "action": "add_business_purpose",
  "purpose_name": "Office Supplies"
}
\`\`\`

For listing business purposes:
\`\`\`json
{
  "action": "list_business_purposes"
}
\`\`\`

For removing business purposes (only custom ones, not default):
\`\`\`json
{
  "action": "remove_business_purpose",
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

For exporting expense reports:
\`\`\`json
{
  "action": "export",
  "format": "pdf|csv|excel",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "businessPurposeIds": ["uuid1", "uuid2"]
}
\`\`\`

When users request exports, support these formats:
- PDF: "export as pdf", "send me a pdf report", "pdf export"
- CSV: "export as csv", "send me a csv file", "csv export" 
- Excel: "export as excel", "send me an excel file", "xlsx export"

You can also filter by date range:
- "export this month" → dateFrom: first day of current month, dateTo: last day of current month
- "export last month" → dateFrom: first day of previous month, dateTo: last day of previous month
- "export this year" → dateFrom: January 1st of current year, dateTo: December 31st of current year
- "export this financial year" or "current financial year" → Calculate dynamically: if current month is Jan-Mar, use previous year's April 1st to current year's March 31st; if current month is Apr-Dec, use current year's April 1st to next year's March 31st
- "export last financial year" → Calculate dynamically: if current month is Jan-Mar, use two years ago's April 1st to previous year's March 31st; if current month is Apr-Dec, use previous year's April 1st to current year's March 31st
- "export from 2024-01-01 to 2024-12-31" → specific date range

IMPORTANT: Financial year runs from April 1st to March 31st of the following year. Calculate the current financial year based on today's date.

Examples (use current date for calculations):
- "Export my expenses as PDF" → { "action": "export", "format": "pdf" }
- "Send me a CSV of this month's expenses" → { "action": "export", "format": "csv", "dateFrom": "2025-07-01", "dateTo": "2025-07-31" }
- "Excel export of last month" → { "action": "export", "format": "excel", "dateFrom": "2025-06-01", "dateTo": "2025-06-30" }
- "Export as excel for current financial year" → { "action": "export", "format": "excel", "dateFrom": "2025-04-01", "dateTo": "2026-03-31" }
- "PDF export of this financial year" → { "action": "export", "format": "pdf", "dateFrom": "2025-04-01", "dateTo": "2026-03-31" }

IMPORTANT: When no expenses are found, always include the date range that was searched in the error message for clarity.

Use your judgment to decide the best action. If the user wants to edit an expense or send a receipt, use the appropriate action and specify a filter object with as much detail as possible to uniquely identify the expense (date, merchant, amount, category, etc). 

CRITICAL: If the user's message is a reply to a previous message (repliedToMessage is provided), ALWAYS extract expense details from the replied-to message to identify which expense they want to edit. The replied-to message typically contains the expense details that the user wants to modify.

For edit requests, be smart about interpreting natural language:
- "Change the amount to $25" → If replying to an expense message, use those details + new amount
- "Update the merchant name" → If replying to an expense message, use those details + new merchant
- "Change the category to Travel" → If replying to an expense message, use those details + new category
- "Fix the date to yesterday" → If replying to an expense message, use those details + new date
- "Update my coffee expense" → Look for coffee-related expenses in recent history

When the user replies to an expense message, they are almost always referring to that specific expense. Use the replied-to message details as your primary filter criteria.

Never invent or use an expense_id. Always return a single JSON object describing the action to take. Do not ask for confirmation before creating an expense.

For business purpose management:
- If user asks to "add business purpose [name]" or "create category [name]", use add_business_purpose action
- If user asks to "list business purposes", "show categories", or "what categories do I have", use list_business_purposes action  
- If user asks to "remove business purpose [name]" or "delete category [name]", use remove_business_purpose action
- If user asks about business purposes in general, use list_business_purposes to show them what they have

CRITICAL: When you receive a receipt image, you MUST use the "create" action to automatically create an expense. Never ask the user if they want to record it - just create it immediately. Only use "reply" for general questions or when you cannot extract expense data from the image.`

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

    // Helper to remove [id: ...] patterns
    function stripExpenseIds(text: string): string {
      return text.replace(/\[id: [^\]]+\]/g, '').replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\n{2,}/g, '\n').trim()
    }

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
            let receiptHash = null
            if (imageData) {
              try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                const filename = `receipt_${extractedAction.merchant?.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${imageFormat || 'jpg'}`
                const dataUrl = `data:image/${imageFormat || 'jpeg'};base64,${imageData}`
                receiptUrl = dataUrl
                receiptFilename = filename
                // Compute hash of the image data (base64 string)
                const hash = crypto.createHash('sha256')
                hash.update(imageData)
                receiptHash = hash.digest('hex')
                // Check for duplicate expense for this user and hash
                const { data, error: dupError } = await supabase
                  .from('expenses')
                  .select('id')
                  .eq('user_id', targetUserId)
                  .eq('receipt_hash', receiptHash)
                  .single()
                if (data) {
                  responseMessage = `⚠️ This receipt has already been submitted as an expense. Duplicate not created.`
                  break
                }
                if (dupError && dupError.code !== 'PGRST116') { // ignore no rows found
                  responseMessage = `❌ Error checking for duplicate receipt. Please try again.`
                  break
                }
              } catch (err) {
                console.error('❌ Message API Debug - Exception storing receipt or checking duplicate:', err)
              }
            }

            // Create the actual expense
            const { error: expenseInsertError } = await supabase
              .from('expenses')
              .insert({
                user_id: targetUserId,
                total_amount: extractedAction.amount,
                date: extractedAction.date,
                merchant_name: extractedAction.merchant || 'Unknown',
                business_purpose: extractedAction.business_purpose || null,
                business_purpose_id: businessPurposeId,
                receipt_url: receiptUrl,
                receipt_filename: receiptFilename,
                receipt_hash: receiptHash
              })

            if (!expenseInsertError) {
              expenseCreated = true
              responseMessage = `✅ Expense created! 🎉\n\n💵 Amount: $${extractedAction.amount}\n🏪 Merchant: ${extractedAction.merchant}\n📅 Date: ${extractedAction.date}${extractedAction.business_purpose ? `\n🏷️ Category: ${extractedAction.business_purpose}` : ''}`
              console.log('✅ Message API Debug - Expense created:', extractedAction)
            } else {
              expenseError = expenseInsertError
              responseMessage = `❌ Failed to create expense. 😢\nReason: ${expenseInsertError.message}`
              console.error('❌ Message API Debug - Error creating expense:', expenseInsertError)
            }
          } else {
            responseMessage = `❌ Invalid expense data. Please provide amount, date, and merchant. 📝`
          }
          break

        case 'edit':
          // Handle editing an existing expense using filter object
          if (extractedAction.filter && extractedAction.fields_to_update && Object.keys(extractedAction.fields_to_update).length > 0) {
            // Build query to find the expense
            let expenseQuery = supabase
              .from('expenses')
              .select('id, date, merchant_name, total_amount, business_purpose')
              .eq('user_id', targetUserId)
            if (extractedAction.filter.date) {
              expenseQuery = expenseQuery.eq('date', extractedAction.filter.date)
            }
            if (extractedAction.filter.amount) {
              expenseQuery = expenseQuery.eq('total_amount', extractedAction.filter.amount)
            }
            // Fetch all possible candidates
            let candidateExpenses: any[] = [];
            let matchError = null;
            const result = await expenseQuery;
            if (result && 'data' in result && 'error' in result) {
              candidateExpenses = result.data || [];
              matchError = result.error;
            } else {
              candidateExpenses = [];
              matchError = null;
            }
            if (matchError) {
              responseMessage = `❌ Error searching for expense. 😢\nReason: ${matchError.message}`
              break
            }
            // Now filter in JS for merchant and business_purpose (case-insensitive)
            let matchExpenses = candidateExpenses || []
            if (extractedAction.filter.merchant) {
              matchExpenses = matchExpenses.filter(exp =>
                exp.merchant_name && exp.merchant_name.toLowerCase().includes(extractedAction.filter.merchant.toLowerCase())
              )
            }
            if (extractedAction.filter.business_purpose) {
              matchExpenses = matchExpenses.filter(exp =>
                exp.business_purpose && exp.business_purpose.toLowerCase().includes(extractedAction.filter.business_purpose.toLowerCase())
              )
            }
            if (!matchExpenses || matchExpenses.length === 0) {
              responseMessage = `❌ Could not find any matching expense to update. 🕵️\nPlease check your details and try again.`
              break
            }
            if (matchExpenses.length > 1) {
              responseMessage = `❌ Multiple expenses match your description. 🧐\nPlease be more specific (e.g., include date, merchant, and amount).`
              break
            }
            
            // Prepare update fields
            const updateFields: any = { ...extractedAction.fields_to_update }
            
            // Handle business purpose mapping if provided
            if (updateFields.business_purpose && !updateFields.business_purpose_id && businessPurposes) {
              const matchingPurpose = businessPurposes.find((p: any) => 
                p.name.toLowerCase() === updateFields.business_purpose.toLowerCase()
              )
              if (matchingPurpose) {
                updateFields.business_purpose_id = matchingPurpose.id
              } else {
                // If business purpose doesn't exist, remove it from update
                delete updateFields.business_purpose
                responseMessage = `⚠️ Business purpose "${updateFields.business_purpose}" not found. Available categories: ${availableCategories}`
                break
              }
            }
            
            // Remove business_purpose field if we have business_purpose_id (to avoid conflicts)
            if (updateFields.business_purpose_id) {
              delete updateFields.business_purpose
            }
            
            // Unique match found
            const expenseId = matchExpenses[0].id
            const { error: editError } = await supabase
              .from('expenses')
              .update(updateFields)
              .eq('id', expenseId)
              .eq('user_id', targetUserId)
            if (!editError) {
              // Build success message with updated fields
              const updatedFields = Object.keys(updateFields).map(field => {
                switch(field) {
                  case 'date': return `📅 Date: ${updateFields[field]}`
                  case 'merchant_name': return `🏪 Merchant: ${updateFields[field]}`
                  case 'total_amount': return `💵 Amount: $${updateFields[field]}`
                  case 'business_purpose_id': 
                    const purpose = businessPurposes?.find((p: any) => p.id === updateFields[field])
                    return `🏷️ Category: ${purpose?.name || 'Unknown'}`
                  default: return `${field}: ${updateFields[field]}`
                }
              }).join('\n')
              
              responseMessage = `✅ Expense updated successfully! ✏️\n\n${updatedFields}`
              console.log('✅ Message API Debug - Expense updated:', extractedAction)
            } else {
              responseMessage = `❌ Failed to update expense. 😢\nReason: ${editError.message}`
              console.error('❌ Message API Debug - Error updating expense:', editError)
            }
          } else {
            responseMessage = `❌ Invalid edit request. Please specify the expense details (date, merchant, amount, etc) and fields to update. 📝`
          }
          break

        case 'add_business_purpose':
          // Handle adding new business purpose
          if (extractedAction.purpose_name) {
            // Generate confirmation message
            const confirmationMessage = `🏷️ *Please confirm adding this new business purpose:*\n\n Name: "${extractedAction.purpose_name}"\n\nReply with "yes" or "confirm" to add this business purpose, or "no" to cancel.`

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
              responseMessage = `❌ Error creating pending business purpose. 😢\nReason: ${pendingError.message}`
              console.error('❌ Message API Debug - Error creating pending business purpose:', pendingError)
            }
          } else {
            responseMessage = `❌ Invalid business purpose data. Please provide a name. 📝`
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
              responseMessage = `❌ No pending business purpose found to confirm. Please try adding a new business purpose. 📝`
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
              responseMessage = `✅ Business purpose "${purposeData.name}" added successfully! 🎉`
              console.log('✅ Message API Debug - Business purpose confirmed and created:', newPurpose)
            } else {
              responseMessage = `❌ Failed to create business purpose. 😢\nReason: ${purposeInsertError?.message || 'Unknown error'}`
              console.error('❌ Message API Debug - Error creating business purpose:', purposeInsertError)
            }
          } catch (err) {
            responseMessage = `❌ Error confirming business purpose. 😢\nReason: ${err}`
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
              responseMessage = `❌ Business purpose creation cancelled. 🚫`
              console.log('❌ Message API Debug - Business purpose creation cancelled')
            } else {
              responseMessage = `❌ Error cancelling business purpose. 😢\nReason: ${cancelError.message}`
              console.error('❌ Message API Debug - Error cancelling business purpose:', cancelError)
            }
          } catch (err) {
            responseMessage = `❌ Error cancelling business purpose. 😢\nReason: ${err}`
            console.error('❌ Message API Debug - Exception cancelling business purpose:', err)
          }
          break

        case 'list_business_purposes':
          // Handle listing business purposes
          try {
            const { data: purposes, error: listError } = await supabase
              .from('business_purposes')
              .select('name, is_default')
              .order('is_default', { ascending: false })
              .order('name', { ascending: true })

            if (!listError && purposes) {
              const defaultPurposes = purposes.filter((p: any) => p.is_default)
              const customPurposes = purposes.filter((p: any) => !p.is_default)
              
              let purposeList = '📋 *Your Business Purpose Categories:*\n\n'
              
              if (defaultPurposes.length > 0) {
                purposeList += '👑 *Default Categories:*\n'
                defaultPurposes.forEach((p: any) => {
                  purposeList += `• ${p.name}\n`
                })
                purposeList += '\n'
              }
              
              if (customPurposes.length > 0) {
                purposeList += '👤 *Your Custom Categories:*\n'
                customPurposes.forEach((p: any) => {
                  purposeList += `• ${p.name}\n`
                })
              } else {
                purposeList += '👤 *Your Custom Categories:*\nNone yet. Use "add business purpose [name]" to create one!'
              }
              
              responseMessage = purposeList
              console.log('📋 Message API Debug - Business purposes listed')
            } else {
              responseMessage = `❌ Error fetching business purposes. 😢\nReason: ${listError?.message || 'Unknown error'}`
              console.error('❌ Message API Debug - Error listing business purposes:', listError)
            }
          } catch (err) {
            responseMessage = `❌ Error listing business purposes. 😢\nReason: ${err}`
            console.error('❌ Message API Debug - Exception listing business purposes:', err)
          }
          break

        case 'remove_business_purpose':
          // Handle removing business purposes (only custom ones)
          if (extractedAction.purpose_name) {
            try {
              // First check if the purpose exists and is custom (not default)
              const { data: purpose, error: findError } = await supabase
                .from('business_purposes')
                .select('id, name, is_default, created_by')
                .eq('name', extractedAction.purpose_name)
                .single()

              if (findError || !purpose) {
                responseMessage = `❌ Business purpose "${extractedAction.purpose_name}" not found. 📝`
                break
              }

              if (purpose.is_default) {
                responseMessage = `❌ Cannot remove default business purpose "${extractedAction.purpose_name}". Default categories cannot be deleted. 🛡️`
                break
              }

              if (purpose.created_by !== userId) {
                responseMessage = `❌ Cannot remove business purpose "${extractedAction.purpose_name}". You can only remove your own custom categories. 🔒`
                break
              }

              // Check if any expenses are using this purpose
              const { data: expensesUsingPurpose, error: checkError } = await supabase
                .from('expenses')
                .select('id')
                .eq('business_purpose_id', purpose.id)
                .limit(1)

              if (!checkError && expensesUsingPurpose && expensesUsingPurpose.length > 0) {
                responseMessage = `❌ Cannot remove "${extractedAction.purpose_name}" because it's being used by existing expenses. Please update those expenses first. 📊`
                break
              }

              // Remove the business purpose
              const { error: deleteError } = await supabase
                .from('business_purposes')
                .delete()
                .eq('id', purpose.id)

              if (!deleteError) {
                responseMessage = `✅ Business purpose "${extractedAction.purpose_name}" removed successfully! 🗑️`
                console.log('✅ Message API Debug - Business purpose removed:', purpose.name)
              } else {
                responseMessage = `❌ Failed to remove business purpose. 😢\nReason: ${deleteError.message}`
                console.error('❌ Message API Debug - Error removing business purpose:', deleteError)
              }
            } catch (err) {
              responseMessage = `❌ Error removing business purpose. 😢\nReason: ${err}`
              console.error('❌ Message API Debug - Exception removing business purpose:', err)
            }
          } else {
            responseMessage = `❌ Invalid remove request. Please specify the business purpose name. 📝`
          }
          break

        case 'summary':
          // Handle summary requests
          responseMessage = extractedAction.text ? `📝 ${stripExpenseIds(extractedAction.text)}` : 'Summary not available.'
          console.log('📊 Message API Debug - Summary requested')
          break

        case 'reply':
          // Handle general replies
          responseMessage = extractedAction.text ? `💬 ${stripExpenseIds(extractedAction.text)}` : aiResponse || 'I understand your message.'
          console.log('💬 Message API Debug - General reply')
          break

        case 'send_receipt':
          // Handle sending a receipt file to the user
          if (extractedAction.filter) {
            // Build query to find the expense
            let expenseQuery = supabase
              .from('expenses')
              .select('id, date, merchant_name, total_amount, business_purpose, receipt_url, receipt_filename')
              .eq('user_id', userId)
            if (extractedAction.filter.date) {
              expenseQuery = expenseQuery.eq('date', extractedAction.filter.date)
            }
            if (extractedAction.filter.amount) {
              expenseQuery = expenseQuery.eq('total_amount', extractedAction.filter.amount)
            }
            // Fetch all possible candidates
            let candidateExpenses: any[] = [];
            let matchError = null;
            const result = await expenseQuery;
            if (result && 'data' in result && 'error' in result) {
              candidateExpenses = result.data || [];
              matchError = result.error;
            } else {
              candidateExpenses = [];
              matchError = null;
            }
            // Now filter in JS for merchant and business_purpose (case-insensitive)
            let matchExpenses = candidateExpenses || []
            if (extractedAction.filter.merchant) {
              matchExpenses = matchExpenses.filter(exp =>
                exp.merchant_name && exp.merchant_name.toLowerCase().includes(extractedAction.filter.merchant.toLowerCase())
              )
            }
            if (extractedAction.filter.business_purpose) {
              matchExpenses = matchExpenses.filter(exp =>
                exp.business_purpose && exp.business_purpose.toLowerCase().includes(extractedAction.filter.business_purpose.toLowerCase())
              )
            }
            if (!matchExpenses || matchExpenses.length === 0) {
              responseMessage = `❌ Could not find any matching expense with a receipt to send. 🕵️\nPlease check your details and try again.`
              break
            }
            if (matchExpenses.length > 1) {
              responseMessage = `❌ Multiple expenses match your description. 🧐\nPlease be more specific (e.g., include date, merchant, and amount).`
              break
            }
            // Unique match found
            const expense = matchExpenses[0];
            if (expense.receipt_url) {
              // Parse data URL
              const dataUrlMatch = expense.receipt_url.match(/^data:(.+);base64,(.+)$/)
              if (!dataUrlMatch) {
                responseMessage = `❌ Could not parse receipt file data. 🛑`
                break
              }
              const mimeType = dataUrlMatch[1]
              const base64Data = dataUrlMatch[2]
              const fileBuffer = Buffer.from(base64Data, 'base64')
              // Send file via Telegram
              const telegramBot = new TelegramBotService({ webhookMode: true })
              const sent = await telegramBot.sendReceiptFile(telegramId, fileBuffer, expense.receipt_filename || 'receipt', mimeType)
              if (sent) {
                responseMessage = `📎 Receipt sent for ${expense.date} at ${expense.merchant_name}!`
              } else {
                responseMessage = `❌ Failed to send receipt file to you on Telegram. 😢`
              }
            } else {
              responseMessage = `❌ No receipt file found for this expense. 📄`
            }
          } else {
            responseMessage = `❌ Invalid receipt request. Please specify the expense details (date, merchant, amount, etc). 📝`
          }
          break;

        case 'export':
          // Handle export requests
          if (extractedAction.format) {
            try {
              console.log('📊 Message API Debug - Export requested:', extractedAction)
              
              // Call the export API
              const exportResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/export`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  telegramId,
                  userId,
                  format: extractedAction.format,
                  dateFrom: extractedAction.dateFrom,
                  dateTo: extractedAction.dateTo,
                  businessPurposeIds: extractedAction.businessPurposeIds
                })
              })

              if (exportResponse.ok) {
                const result = await exportResponse.json()
                responseMessage = result.message // Can be null for successful exports
                console.log('✅ Message API Debug - Export successful:', result)
              } else {
                const errorResult = await exportResponse.json()
                responseMessage = `❌ Export failed: ${errorResult.error || 'Unknown error'}`
                console.error('❌ Message API Debug - Export failed:', errorResult)
              }
            } catch (error) {
              responseMessage = `❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              console.error('❌ Message API Debug - Export exception:', error)
            }
          } else {
            responseMessage = `❌ Invalid export request. Please specify a format (pdf, csv, or excel). 📝`
          }
          break

        default:
          // Fallback to original response
          responseMessage = aiResponse ? `💡 ${stripExpenseIds(aiResponse)}` : processedMessage
          console.log('🔄 Message API Debug - Unknown action, using original response')
      }
    } else {
      // No structured action found, use the LLM response as-is
      responseMessage = aiResponse ? `💬 ${stripExpenseIds(aiResponse)}` : processedMessage
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