const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testBusinessPurposeLLM() {
  try {
    console.log('🧪 Testing LLM Business Purpose Management...')
    
    // Test 1: List business purposes
    console.log('\n📋 Test 1: Listing business purposes')
    const { data: purposes, error: listError } = await supabase
      .from('business_purposes')
      .select('name, is_default, created_by')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (listError) {
      console.error('❌ Error listing purposes:', listError)
    } else {
      console.log('✅ Business purposes found:', purposes?.length || 0)
      purposes?.forEach(p => {
        console.log(`  - ${p.name} (${p.is_default ? 'Default' : 'Custom'})`)
      })
    }

    // Test 2: Add a test business purpose
    console.log('\n➕ Test 2: Adding test business purpose')
    const testPurposeName = 'Test Category ' + Date.now()
    const { data: newPurpose, error: addError } = await supabase
      .from('business_purposes')
      .insert({
        name: testPurposeName,
        is_default: false,
        created_by: '00000000-0000-0000-0000-000000000000' // Test user ID
      })
      .select()
      .single()

    if (addError) {
      console.error('❌ Error adding purpose:', addError)
    } else {
      console.log('✅ Test purpose added:', newPurpose.name)
    }

    // Test 3: Remove the test business purpose
    if (newPurpose) {
      console.log('\n🗑️ Test 3: Removing test business purpose')
      const { error: removeError } = await supabase
        .from('business_purposes')
        .delete()
        .eq('id', newPurpose.id)

      if (removeError) {
        console.error('❌ Error removing purpose:', removeError)
      } else {
        console.log('✅ Test purpose removed successfully')
      }
    }

    // Test 4: Check pending business purposes table
    console.log('\n⏳ Test 4: Checking pending_business_purposes table')
    const { data: pendingPurposes, error: pendingError } = await supabase
      .from('pending_business_purposes')
      .select('*')
      .limit(5)

    if (pendingError) {
      console.error('❌ Error checking pending purposes:', pendingError)
    } else {
      console.log('✅ Pending purposes table accessible:', pendingPurposes?.length || 0, 'records')
    }

    console.log('\n🎉 All tests completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBusinessPurposeLLM() 