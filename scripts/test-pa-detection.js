// Test PA detection logic
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPADetection() {
  console.log('🔍 Testing PA detection logic...')

  try {
    // First, let's see what PAs exist
    console.log('\n📋 Current PAs in the system:')
    const { data: allPAs, error: paError } = await supabase
      .from('personal_assistants')
      .select('*')

    if (paError) {
      console.error('❌ Error fetching PAs:', paError)
      return
    }

    console.log('Found PAs:', allPAs)

    // Let's also check telegram_users
    console.log('\n📋 Current Telegram users:')
    const { data: telegramUsers, error: tuError } = await supabase
      .from('telegram_users')
      .select('*')

    if (tuError) {
      console.error('❌ Error fetching telegram users:', tuError)
      return
    }

    console.log('Found Telegram users:', telegramUsers)

    // Now let's test the PA detection logic for a specific user
    // We'll use the first PA we found
    if (allPAs && allPAs.length > 0) {
      const testPA = allPAs[0]
      console.log(`\n🧪 Testing PA detection for PA:`, testPA)

      // Simulate the PA detection logic from the message API
      const { data: linkedUser, error: linkError } = await supabase
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', testPA.pa_telegram_id)
        .single()

      console.log('Linked user result:', { linkedUser, linkError })

      if (linkedUser) {
        // Check if this user is a PA for the main user
        const { data: paRecord, error: paError } = await supabase
          .from('personal_assistants')
          .select('user_id')
          .eq('pa_telegram_id', testPA.pa_telegram_id)
          .eq('is_active', true)
          .single()

        console.log('PA record result:', { paRecord, paError })

        if (paRecord) {
          console.log('✅ PA detection working!')
          console.log(`PA ${testPA.pa_name} (${testPA.pa_telegram_id}) can create expenses for user ${paRecord.user_id}`)
        } else {
          console.log('❌ PA detection failed - no PA record found')
        }
      } else {
        console.log('❌ PA detection failed - user not linked')
      }
    } else {
      console.log('❌ No PAs found in the system')
    }

  } catch (error) {
    console.error('❌ Error in PA detection test:', error)
  }
}

testPADetection() 