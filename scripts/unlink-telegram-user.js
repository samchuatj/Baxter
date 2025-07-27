// Unlink a user from Telegram by username
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function unlinkUser(username) {
  console.log(`🔧 Unlinking user @${username} from Telegram...`)
  
  try {
    // First, find the user in telegram_users table
    console.log(`🔍 Looking up user @${username} in telegram_users...`)
    const { data: telegramUser, error: lookupError } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('username', username)
      .single()

    if (lookupError || !telegramUser) {
      console.log(`❌ User @${username} not found in telegram_users table`)
      return
    }

    console.log(`✅ Found user @${username}:`, {
      telegram_id: telegramUser.telegram_id,
      user_id: telegramUser.user_id ? `${telegramUser.user_id.substring(0, 8)}...` : null,
      username: telegramUser.username
    })

    // Remove from telegram_users
    console.log(`🗑️ Removing from telegram_users...`)
    const { error: deleteError } = await supabase
      .from('telegram_users')
      .delete()
      .eq('username', username)

    if (deleteError) {
      console.error('❌ Error removing from telegram_users:', deleteError)
      return
    }

    // Also remove from personal_assistants if they were added as a PA
    console.log(`🗑️ Checking if they were added as a PA...`)
    const { data: paRecords, error: paError } = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('pa_telegram_id', telegramUser.telegram_id)

    if (paError) {
      console.error('❌ Error checking personal_assistants:', paError)
    } else if (paRecords && paRecords.length > 0) {
      console.log(`🗑️ Removing ${paRecords.length} PA record(s)...`)
      const { error: paDeleteError } = await supabase
        .from('personal_assistants')
        .delete()
        .eq('pa_telegram_id', telegramUser.telegram_id)

      if (paDeleteError) {
        console.error('❌ Error removing PA records:', paDeleteError)
      } else {
        console.log(`✅ Removed ${paRecords.length} PA record(s)`)
      }
    } else {
      console.log(`ℹ️ No PA records found for this user`)
    }

    // Clean up any pending auth tokens
    console.log(`🗑️ Cleaning up pending auth tokens...`)
    const { error: pendingError } = await supabase
      .from('pending_auth')
      .delete()
      .eq('telegram_id', telegramUser.telegram_id)

    if (pendingError) {
      console.error('❌ Error cleaning up pending auth:', pendingError)
    } else {
      console.log(`✅ Cleaned up pending auth tokens`)
    }

    console.log(`🎉 Successfully unlinked @${username} from Telegram!`)
    console.log(`\n📋 Next steps for testing:`)
    console.log(`1. Ask @${username} to send /start to the bot in a private chat`)
    console.log(`2. Have them link their account`)
    console.log(`3. Try /add-pa @${username} in your group`)

  } catch (error) {
    console.error('❌ Error unlinking user:', error)
  }
}

// Get username from command line argument
const username = process.argv[2]

if (!username) {
  console.error('❌ Please provide a username')
  console.error('Usage: node scripts/unlink-telegram-user.js <username>')
  console.error('Example: node scripts/unlink-telegram-user.js vanpoh')
  process.exit(1)
}

// Remove @ symbol if present
const cleanUsername = username.startsWith('@') ? username.slice(1) : username

unlinkUser(cleanUsername) 