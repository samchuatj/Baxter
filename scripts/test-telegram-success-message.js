// Test script to verify Telegram success message functionality
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTelegramSuccessMessage() {
  console.log('🧪 Testing Telegram success message functionality...\n')

  try {
    // Get a test user
    const { data: users } = await supabase.auth.admin.listUsers()
    if (!users.users || users.users.length === 0) {
      console.log('❌ No users found')
      return
    }

    const testUserId = users.users[0].id
    const testTelegramId = 132688762 // From the URL in the screenshot
    const testChatId = -4915099799 // From the URL in the screenshot
    const testToken = 'test_success_message_token'

    console.log('1. Creating test data...')
    
    // Ensure Telegram user link exists
    await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: testTelegramId,
        user_id: testUserId
      })

    // Create the pending auth token
    await supabase
      .from('pending_auth')
      .upsert({
        token: testToken,
        telegram_id: testTelegramId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })

    console.log('✅ Test data created')

    console.log('\n2. Testing API with success message...')
    
    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pa/register-group`
    console.log(`API URL: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: testToken,
        chatId: testChatId,
        telegramId: testTelegramId
      }),
    })

    const result = await response.json()
    console.log('API Response:', result)

    if (response.ok && result.success) {
      console.log('✅ API call successful - should have sent Telegram success message')
      console.log('📱 Check your Telegram group chat for the success message!')
    } else {
      console.log('❌ API call failed:', result.error)
    }

    console.log('\n3. Testing direct Telegram API...')
    
    // Test direct Telegram API call
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.log('❌ TELEGRAM_BOT_TOKEN not set - cannot test direct API')
    } else {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: testChatId,
          text: '🧪 Test message from API - if you see this, Telegram API is working!',
          parse_mode: 'Markdown'
        }),
      })

      const telegramResult = await telegramResponse.json()
      console.log('Telegram API Response:', telegramResult)

      if (telegramResult.ok) {
        console.log('✅ Direct Telegram API call successful')
      } else {
        console.log('❌ Direct Telegram API call failed:', telegramResult)
      }
    }

    console.log('\n4. Cleaning up...')
    await supabase.from('group_chats').delete().eq('chat_id', testChatId)
    await supabase.from('pending_auth').delete().eq('token', testToken)
    console.log('✅ Cleanup complete')

    console.log('\n🎉 Telegram success message test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testTelegramSuccessMessage() 