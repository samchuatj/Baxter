const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testPendingBusinessPurposes() {
  console.log('🧪 Testing pending_business_purposes table access\n')

  try {
    // Test 1: Check if table exists by trying to select from it
    console.log('1️⃣ Testing table existence...')
    const { data, error } = await supabase
      .from('pending_business_purposes')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Table access error:', error)
      return
    }

    console.log('✅ Table exists and is accessible')
    console.log('📊 Current records:', data?.length || 0)

    // Test 2: Try to insert a test record
    console.log('\n2️⃣ Testing insert capability...')
    const testRecord = {
      user_id: '73a74c90-fe77-46e6-8cde-21c3e987940a',
      telegram_id: 132688762,
      purpose_data: {
        name: 'Test Purpose',
        timestamp: new Date().toISOString()
      },
      status: 'pending'
    }

    const { data: insertData, error: insertError } = await supabase
      .from('pending_business_purposes')
      .insert(testRecord)
      .select()

    if (insertError) {
      console.log('❌ Insert error:', insertError)
      return
    }

    console.log('✅ Insert successful:', insertData)

    // Test 3: Clean up test record
    console.log('\n3️⃣ Cleaning up test record...')
    const { error: deleteError } = await supabase
      .from('pending_business_purposes')
      .delete()
      .eq('id', insertData[0].id)

    if (deleteError) {
      console.log('❌ Delete error:', deleteError)
    } else {
      console.log('✅ Test record cleaned up')
    }

    console.log('\n🎉 All tests passed! The table is working correctly.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testPendingBusinessPurposes() 