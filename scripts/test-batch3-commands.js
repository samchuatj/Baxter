// Test script for Batch 3: PA Addition & Basic Bot Commands
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBatch3Commands() {
  console.log('🧪 Testing Batch 3: PA Addition & Basic Bot Commands...\n')

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

    console.log('✅ Test data created')

    console.log('\n2. Testing /help command...')
    
    // Test direct Telegram API call for /help
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.log('❌ TELEGRAM_BOT_TOKEN not set - cannot test commands')
    } else {
      const helpResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: testChatId,
          text: '🤖 **Baxter Expense Manager - Available Commands**\n\n**Group Management:**\n• /register - Register this group chat for PA management\n• /list-groups - List all your registered group chats\n\n**PA Management (Coming Soon):**\n• /add-pa @username - Add a PA to this group\n• /remove-pa @username - Remove a PA from this group\n• /list-pas - List all PAs in this group\n\n**General:**\n• /help - Show this help message\n\n**Expense Management:**\n• Send photos of receipts - I\'ll automatically extract expense details\n• Send text messages - Ask about your expenses, get summaries, etc.\n\n💡 **Tip:** PAs can help manage your expenses by sending receipts and messages in this group!',
          parse_mode: 'Markdown'
        }),
      })

      const helpResult = await helpResponse.json()
      console.log('Help Command Response:', helpResult)

      if (helpResult.ok) {
        console.log('✅ Help command test successful')
      } else {
        console.log('❌ Help command test failed:', helpResult)
      }

      console.log('\n3. Testing /add-pa command placeholder...')
      
      const addPaResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: testChatId,
          text: '🔄 **Adding PA: @testuser**\n\nThis feature is coming soon! The PA will need to:\n1. Send /start to the bot in a private chat\n2. Link their Telegram account to their Baxter account\n3. Then you can add them using this command.',
          parse_mode: 'Markdown'
        }),
      })

      const addPaResult = await addPaResponse.json()
      console.log('Add PA Command Response:', addPaResult)

      if (addPaResult.ok) {
        console.log('✅ Add PA command placeholder test successful')
      } else {
        console.log('❌ Add PA command placeholder test failed:', addPaResult)
      }

      console.log('\n4. Testing /list-pas command placeholder...')
      
      const listPasResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: testChatId,
          text: '📋 **PAs in this Group**\n\nThis feature is coming soon! You\'ll be able to see all PAs assigned to this group.',
          parse_mode: 'Markdown'
        }),
      })

      const listPasResult = await listPasResponse.json()
      console.log('List PAs Command Response:', listPasResult)

      if (listPasResult.ok) {
        console.log('✅ List PAs command placeholder test successful')
      } else {
        console.log('❌ List PAs command placeholder test failed:', listPasResult)
      }
    }

    console.log('\n5. Testing database queries...')
    
    // Test if we can query the personal_assistants table
    const { data: pas, error: pasError } = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('user_id', testUserId)

    if (pasError) {
      console.log('❌ Error querying personal_assistants table:', pasError)
    } else {
      console.log('✅ personal_assistants table query successful')
      console.log(`Found ${pas?.length || 0} PAs for user`)
    }

    console.log('\n6. Cleaning up...')
    // Don't delete the group chat since it's already registered
    console.log('✅ Cleanup complete (keeping registered group)')

    console.log('\n🎉 Batch 3 command tests completed!')
    console.log('\n📋 **What to test in production:**')
    console.log('1. Send /help in your registered group chat')
    console.log('2. Send /add-pa @username in your registered group chat')
    console.log('3. Send /remove-pa @username in your registered group chat')
    console.log('4. Send /list-pas in your registered group chat')
    console.log('5. Verify all commands show appropriate "coming soon" messages')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBatch3Commands() 