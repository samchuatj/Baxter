const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testTelegramPage() {
  try {
    console.log('🔍 Testing Telegram page functionality...')
    
    // Generate a test token
    const testToken = 'test-token-' + Date.now()
    const testTelegramId = 123456789
    
    console.log('🔍 Generated test parameters:', { testToken, testTelegramId })
    
    // Store test token in pending_auth
    const { error: insertError } = await supabase
      .from('pending_auth')
      .insert({
        token: testToken,
        telegram_id: testTelegramId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
    
    if (insertError) {
      console.error('❌ Error inserting test token:', insertError)
      return
    }
    
    console.log('✅ Test token stored successfully')
    
    // Create the test URL using the deployed Render URL
    const testUrl = `https://baxterai.onrender.com/auth/telegram?token=${testToken}&telegram_id=${testTelegramId}`
    
    console.log('🔍 Test URL created:', testUrl)
    console.log('')
    console.log('📋 Instructions:')
    console.log('1. Open this URL in your browser:', testUrl)
    console.log('2. Check the console logs for Telegram page debugging')
    console.log('3. You should see: "🔍 Telegram auth - Redirecting to login: /auth/login?next=/auth/telegram"')
    console.log('4. Then you should be redirected to the login page with the next parameter')
    console.log('')
    console.log('🧹 Cleanup: This test token will expire in 10 minutes automatically')
    
  } catch (error) {
    console.error('❌ Error during test:', error)
  }
}

testTelegramPage() 