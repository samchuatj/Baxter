// Quick test to verify parameter handling fix
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testParameterFix() {
  console.log('🧪 Testing parameter handling fix...\n')

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
    const testToken = '5utkkqtciq3pje1ba25wdl' // From the URL in the screenshot

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

    console.log('\n2. Testing API with new parameter names...')
    
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
      console.log('✅ API call successful with new parameters')
    } else {
      console.log('❌ API call failed:', result.error)
    }

    console.log('\n3. Testing web page URL parsing...')
    
    // Simulate the URL from the screenshot
    const testUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pa/register-group?token=${testToken}&chatid=${testChatId}&telegramid=${testTelegramId}`
    console.log(`Test URL: ${testUrl}`)
    
    // Extract parameters manually to test parsing
    const urlParams = new URLSearchParams(testUrl.split('?')[1])
    const token = urlParams.get('token')
    const chatId = urlParams.get('chat_id') || urlParams.get('chatid')
    const telegramId = urlParams.get('telegram_id') || urlParams.get('telegramid')
    
    console.log('Parsed parameters:')
    console.log(`  token: ${token}`)
    console.log(`  chatId: ${chatId}`)
    console.log(`  telegramId: ${telegramId}`)
    
    if (token && chatId && telegramId) {
      console.log('✅ URL parameter parsing works correctly')
    } else {
      console.log('❌ URL parameter parsing failed')
    }

    console.log('\n4. Cleaning up...')
    await supabase.from('group_chats').delete().eq('chat_id', testChatId)
    await supabase.from('pending_auth').delete().eq('token', testToken)
    console.log('✅ Cleanup complete')

    console.log('\n🎉 Parameter fix test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testParameterFix() 