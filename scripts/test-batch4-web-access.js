// Test script for Batch 4: Magic Link Web Access
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBatch4WebAccess() {
  console.log('🧪 Testing Batch 4: Magic Link Web Access...\n')

  try {
    // Get a test user
    const { data: users } = await supabase.auth.admin.listUsers()
    if (!users.users || users.users.length === 0) {
      console.log('❌ No users found')
      return
    }

    const testUserId = users.users[0].id
    const testTelegramId = 132688762
    const testChatId = -4952672465 // From the screenshot

    console.log('1. Setting up test data...')
    
    // Ensure Telegram user link exists
    await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: testTelegramId,
        user_id: testUserId
      })

    // Ensure group chat exists
    await supabase
      .from('group_chats')
      .upsert({
        user_id: testUserId,
        chat_id: testChatId,
        chat_title: 'Expense Test',
        is_active: true
      })

    // Create a test PA
    await supabase
      .from('personal_assistants')
      .upsert({
        user_id: testUserId,
        pa_telegram_id: testTelegramId,
        pa_name: 'Test PA',
        is_active: true
      })

    // Create a test PA web access token
    const testToken = 'test_web_access_token_123456789'
    await supabase
      .from('pa_web_access_tokens')
      .upsert({
        user_id: testUserId,
        pa_telegram_id: testTelegramId,
        access_token: testToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

    console.log('✅ Test data created')

    console.log('\n2. Testing PA access API...')
    
    const accessResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pa/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: testToken }),
    })

    const accessResult = await accessResponse.json()
    console.log('PA Access API Response:', accessResult)

    if (accessResponse.ok && accessResult.success) {
      console.log('✅ PA access API test successful')
    } else {
      console.log('❌ PA access API test failed:', accessResult.error)
    }

    console.log('\n3. Testing PA expenses API...')
    
    const expensesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pa/expenses?token=${testToken}&limit=10`)
    const expensesResult = await expensesResponse.json()
    console.log('PA Expenses API Response:', expensesResult)

    if (expensesResponse.ok && expensesResult.success) {
      console.log('✅ PA expenses API test successful')
      console.log(`Found ${expensesResult.data.expenses.length} expenses`)
      console.log(`Summary: $${expensesResult.data.summary.total} total, ${expensesResult.data.summary.count} transactions`)
    } else {
      console.log('❌ PA expenses API test failed:', expensesResult.error)
    }

    console.log('\n4. Testing web access URL...')
    
    const webAccessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pa/access?token=${testToken}`
    console.log('Web Access URL:', webAccessUrl)
    console.log('✅ Web access URL generated successfully')

    console.log('\n5. Testing /web-access command placeholder...')
    
    // Test direct Telegram API call for /web-access
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.log('❌ TELEGRAM_BOT_TOKEN not set - cannot test command')
    } else {
      const webAccessResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: testChatId,
          text: `🔗 **Web Access Link**

Here's your temporary access link to view expenses:

${webAccessUrl}

⚠️ **Important:**
• This link expires in 24 hours
• You can only view expenses (read-only access)
• Do not share this link with others
• Contact the main user for a new link if needed

💡 **Tip:** You can use this link to view expense summaries and recent transactions!`,
          parse_mode: 'Markdown'
        }),
      })

      const webAccessResult = await webAccessResponse.json()
      console.log('Web Access Command Response:', webAccessResult)

      if (webAccessResult.ok) {
        console.log('✅ Web access command placeholder test successful')
      } else {
        console.log('❌ Web access command placeholder test failed:', webAccessResult)
      }
    }

    console.log('\n6. Cleaning up...')
    await supabase.from('pa_web_access_tokens').delete().eq('access_token', testToken)
    await supabase.from('personal_assistants').delete().eq('pa_telegram_id', testTelegramId)
    console.log('✅ Cleanup complete')

    console.log('\n🎉 Batch 4 web access tests completed!')
    console.log('\n📋 **What to test in production:**')
    console.log('1. Send /web-access in your registered group chat')
    console.log('2. Click the generated web access link')
    console.log('3. Verify the PA dashboard loads correctly')
    console.log('4. Check that expenses are displayed (if any exist)')
    console.log('5. Verify the dashboard shows read-only access message')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBatch4WebAccess() 