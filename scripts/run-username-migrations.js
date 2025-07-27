// Run username migrations for PA system
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('🔧 Running username migrations...')
  
  try {
    // Migration 1: Add username to telegram_users
    console.log('📝 Adding username column to telegram_users table...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE telegram_users ADD COLUMN IF NOT EXISTS username TEXT;
        CREATE INDEX IF NOT EXISTS idx_telegram_users_username ON telegram_users(username);
        DROP POLICY IF EXISTS "Allow select for anonymous users" ON telegram_users;
        CREATE POLICY "Allow select for anonymous users" ON telegram_users
          FOR SELECT USING (true);
      `
    })
    
    if (error1) {
      console.error('❌ Error in migration 1:', error1)
      return
    }
    console.log('✅ Migration 1 completed')
    
    // Migration 2: Add username to pending_auth
    console.log('📝 Adding username column to pending_auth table...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE pending_auth ADD COLUMN IF NOT EXISTS username TEXT;
        CREATE INDEX IF NOT EXISTS idx_pending_auth_username ON pending_auth(username);
      `
    })
    
    if (error2) {
      console.error('❌ Error in migration 2:', error2)
      return
    }
    console.log('✅ Migration 2 completed')
    
    // Verify the changes
    console.log('🔍 Verifying migrations...')
    
    // Check telegram_users table
    const { data: telegramUsers, error: error3 } = await supabase
      .from('telegram_users')
      .select('*')
      .limit(1)
    
    if (error3) {
      console.error('❌ Error checking telegram_users:', error3)
      return
    }
    
    if (telegramUsers && telegramUsers.length > 0) {
      const hasUsername = 'username' in telegramUsers[0]
      console.log(`✅ telegram_users table has username column: ${hasUsername}`)
    }
    
    // Check pending_auth table
    const { data: pendingAuth, error: error4 } = await supabase
      .from('pending_auth')
      .select('*')
      .limit(1)
    
    if (error4) {
      console.error('❌ Error checking pending_auth:', error4)
      return
    }
    
    if (pendingAuth && pendingAuth.length > 0) {
      const hasUsername = 'username' in pendingAuth[0]
      console.log(`✅ pending_auth table has username column: ${hasUsername}`)
    }
    
    console.log('🎉 All migrations completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. The PA system now supports username lookup')
    console.log('2. PAs who link their accounts will have their usernames stored')
    console.log('3. You can now use /add-pa @username to add PAs')
    console.log('4. Existing users will need to re-link their accounts to store usernames')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runMigrations() 