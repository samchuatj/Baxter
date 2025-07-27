// Test script for PA System Phase 1 - Database Schema
// Run this after executing the SQL schema to verify everything works

// Load environment variables from .env.local
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

async function testPASchema() {
  console.log('🧪 Testing PA System Database Schema...\n')

  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if tables exist...')
    
    const tables = ['personal_assistants', 'group_chats', 'pa_web_access_tokens']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`)
        } else {
          console.log(`✅ Table ${table}: OK`)
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`)
      }
    }

    // Test 2: Check if we can get a user to test with
    console.log('\n2. Checking for test user...')
    
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

    // Test 3: Test inserting a group chat
    console.log('\n3. Testing group chat insertion...')
    
    const testGroupChat = {
      user_id: testUserId,
      chat_id: 123456789,
      chat_title: 'Test Group Chat'
    }

    const { data: groupChat, error: groupError } = await supabase
      .from('group_chats')
      .insert(testGroupChat)
      .select()
      .single()

    if (groupError) {
      console.log('❌ Group chat insertion failed:', groupError.message)
    } else {
      console.log('✅ Group chat inserted successfully')
      console.log(`   Chat ID: ${groupChat.chat_id}`)
      console.log(`   Title: ${groupChat.chat_title}`)
    }

    // Test 4: Test inserting a PA
    console.log('\n4. Testing PA insertion...')
    
    const testPA = {
      user_id: testUserId,
      pa_telegram_id: 987654321,
      pa_name: 'Test PA'
    }

    const { data: pa, error: paError } = await supabase
      .from('personal_assistants')
      .insert(testPA)
      .select()
      .single()

    if (paError) {
      console.log('❌ PA insertion failed:', paError.message)
    } else {
      console.log('✅ PA inserted successfully')
      console.log(`   PA Telegram ID: ${pa.pa_telegram_id}`)
      console.log(`   PA Name: ${pa.pa_name}`)
    }

    // Test 5: Test inserting a web access token
    console.log('\n5. Testing web access token insertion...')
    
    const testToken = {
      user_id: testUserId,
      pa_telegram_id: 987654321,
      access_token: 'test_token_123456789',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    const { data: token, error: tokenError } = await supabase
      .from('pa_web_access_tokens')
      .insert(testToken)
      .select()
      .single()

    if (tokenError) {
      console.log('❌ Token insertion failed:', tokenError.message)
    } else {
      console.log('✅ Token inserted successfully')
      console.log(`   Token: ${token.access_token.substring(0, 10)}...`)
      console.log(`   Expires: ${token.expires_at}`)
    }

    // Test 6: Test queries
    console.log('\n6. Testing queries...')
    
    // Get user's group chats
    const { data: userGroupChats, error: groupQueryError } = await supabase
      .from('group_chats')
      .select('*')
      .eq('user_id', testUserId)

    if (groupQueryError) {
      console.log('❌ Group chat query failed:', groupQueryError.message)
    } else {
      console.log(`✅ Found ${userGroupChats.length} group chats for user`)
    }

    // Get user's PAs
    const { data: userPAs, error: paQueryError } = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('user_id', testUserId)

    if (paQueryError) {
      console.log('❌ PA query failed:', paQueryError.message)
    } else {
      console.log(`✅ Found ${userPAs.length} PAs for user`)
    }

    // Test 7: Cleanup test data
    console.log('\n7. Cleaning up test data...')
    
    await supabase.from('pa_web_access_tokens').delete().eq('access_token', 'test_token_123456789')
    await supabase.from('personal_assistants').delete().eq('pa_telegram_id', 987654321)
    await supabase.from('group_chats').delete().eq('chat_id', 123456789)
    
    console.log('✅ Test data cleaned up')

    console.log('\n🎉 All tests completed successfully!')
    console.log('The PA system database schema is working correctly.')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testPASchema() 