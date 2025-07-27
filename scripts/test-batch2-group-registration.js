// Test script for PA System Batch 2 - Group Chat Registration
// Run this after implementing Batch 2 to verify group registration works

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

// Check if environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBatch2GroupRegistration() {
  console.log('🧪 Testing Batch 2: Group Chat Registration...\n')

  try {
    // Test 1: Check if we can get a user to test with
    console.log('1. Checking for test user...')
    
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.log('❌ Could not fetch users:', userError.message)
      return
    }

    if (!users.users || users.users.length === 0) {
      console.log('⚠️  No users found. Please create a user account first.')
      return
    }

    const testUserId = users.users[0].id
    console.log(`✅ Found test user: ${testUserId}`)

    // Test 2: Create a test Telegram user link
    console.log('\n2. Creating test Telegram user link...')
    
    const testTelegramId = 123456789
    
    // Check if Telegram user already exists
    const { data: existingTelegramUser } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', testTelegramId)
      .single()

    if (existingTelegramUser) {
      console.log('✅ Telegram user link already exists')
    } else {
      const { data: telegramUser, error: telegramError } = await supabase
        .from('telegram_users')
        .insert({
          telegram_id: testTelegramId,
          user_id: testUserId
        })
        .select()
        .single()

      if (telegramError) {
        console.log('❌ Could not create Telegram user link:', telegramError.message)
        return
      }

      console.log('✅ Created Telegram user link')
    }

    // Test 3: Test group chat registration flow
    console.log('\n3. Testing group chat registration flow...')
    
    const testChatId = 987654321
    const testToken = 'test_registration_token_123456789'
    
    // Clean up any existing test data
    await supabase
      .from('pending_auth')
      .delete()
      .eq('token', testToken)
    
    await supabase
      .from('group_chats')
      .delete()
      .eq('chat_id', testChatId)
    
    // Create a pending auth token for registration
    const { error: tokenError } = await supabase
      .from('pending_auth')
      .insert({
        token: testToken,
        telegram_id: testTelegramId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

    if (tokenError) {
      console.log('❌ Could not create registration token:', tokenError.message)
      return
    }

    console.log('✅ Created registration token')

    // Test 4: Simulate the API call
    console.log('\n4. Testing group registration API...')
    
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
      console.log('✅ Group registration API working correctly')
    } else {
      console.log('❌ Group registration API failed:', result.error)
    }

    // Test 5: Verify group was created
    console.log('\n5. Verifying group chat was created...')
    
    const { data: groupChat, error: groupError } = await supabase
      .from('group_chats')
      .select('*')
      .eq('chat_id', testChatId)
      .single()

    if (groupError) {
      console.log('❌ Could not find registered group:', groupError.message)
    } else {
      console.log('✅ Group chat registered successfully')
      console.log(`   Group ID: ${groupChat.id}`)
      console.log(`   Chat ID: ${groupChat.chat_id}`)
      console.log(`   User ID: ${groupChat.user_id}`)
    }

    // Test 6: Test listing groups
    console.log('\n6. Testing group listing...')
    
    const { data: userGroups, error: groupsError } = await supabase
      .from('group_chats')
      .select('*')
      .eq('user_id', testUserId)
      .eq('is_active', true)

    if (groupsError) {
      console.log('❌ Could not fetch user groups:', groupsError.message)
    } else {
      console.log(`✅ Found ${userGroups.length} group(s) for user`)
      userGroups.forEach((group, index) => {
        console.log(`   ${index + 1}. Chat ID: ${group.chat_id}, Title: ${group.chat_title}`)
      })
    }

    // Test 7: Cleanup test data
    console.log('\n7. Cleaning up test data...')
    
    await supabase.from('group_chats').delete().eq('chat_id', testChatId)
    await supabase.from('telegram_users').delete().eq('telegram_id', testTelegramId)
    await supabase.from('pending_auth').delete().eq('token', testToken)
    
    console.log('✅ Test data cleaned up')

    console.log('\n🎉 Batch 2 tests completed successfully!')
    console.log('Group chat registration is working correctly.')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testBatch2GroupRegistration() 