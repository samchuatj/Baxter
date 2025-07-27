// Clean up duplicate PA records
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupDuplicatePAs() {
  console.log('🧹 Cleaning up duplicate PA records...')

  try {
    // Find all PAs for vanpoh
    const { data: paRecords, error: paError } = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('pa_name', 'vanpoh')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (paError) {
      console.error('❌ Error fetching PAs:', paError)
      return
    }

    console.log('Found PAs for vanpoh:', paRecords)

    if (paRecords.length <= 1) {
      console.log('✅ No duplicates found')
      return
    }

    // Keep the newest record (with username) and delete the older one
    const newerRecord = paRecords.find(pa => pa.pa_telegram_id === 148048437)
    const olderRecord = paRecords.find(pa => pa.pa_telegram_id === 132688762)

    if (newerRecord && olderRecord) {
      console.log('🗑️ Deleting older PA record:', olderRecord)
      
      const { error: deleteError } = await supabase
        .from('personal_assistants')
        .delete()
        .eq('id', olderRecord.id)

      if (deleteError) {
        console.error('❌ Error deleting older PA record:', deleteError)
        return
      }

      console.log('✅ Successfully deleted older PA record')
      console.log('✅ Kept newer PA record:', newerRecord)
    } else {
      console.log('❌ Could not identify which record to keep')
    }

  } catch (error) {
    console.error('❌ Error in cleanup:', error)
  }
}

cleanupDuplicatePAs() 