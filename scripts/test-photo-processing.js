// Test photo processing flow for PAs
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL

if (!supabaseUrl || !supabaseServiceKey || !appUrl) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPhotoProcessing() {
  console.log('🔍 Testing photo processing flow for PAs...')

  try {
    // Find all PAs for vanpoh
    const { data: paRecords, error: paError } = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('pa_name', 'vanpoh')
      .eq('is_active', true)

    if (paError) {
      console.error('❌ Error fetching PAs:', paError)
      return
    }

    console.log('Found PAs for vanpoh:', paRecords)

    if (paRecords.length === 0) {
      console.log('❌ No PAs found for testing')
      return
    }

    // Use the newer PA record for testing (the one with username)
    const paRecord = paRecords.find(pa => pa.pa_telegram_id === 148048437) || paRecords[0]
    console.log('Using PA record for testing:', paRecord)

    // Simulate the photo processing logic from telegram-bot.ts
    const telegramId = paRecord.pa_telegram_id
    console.log(`\n📸 Simulating photo processing for PA with telegram_id: ${telegramId}`)

    // Step 1: Check if user is linked (from handlePhotoMessage)
    const { data: linkedUser, error: linkError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single()

    console.log('Step 1 - Linked user check:', { linkedUser, linkError })

    if (!linkedUser) {
      console.log('❌ User not linked - this would cause the bot to fail')
      return
    }

    // Step 2: Check if this user is a PA for the main user
    // This is where the issue is - there are multiple PA records
    const { data: paCheck, error: paCheckError } = await supabase
      .from('personal_assistants')
      .select('user_id')
      .eq('pa_telegram_id', telegramId)
      .eq('is_active', true)
      .single()

    console.log('Step 2 - PA check:', { paCheck, paCheckError })

    if (paCheckError) {
      console.log('❌ PA check failed due to multiple records:', paCheckError)
      console.log('This is why the bot is not working for PAs!')
      return
    }

    // Step 3: Determine target user ID
    let targetUserId = linkedUser.user_id // Default to the user's own account
    
    if (paCheck) {
      // This is a PA, so they can create expenses for the main user
      targetUserId = paCheck.user_id
      console.log('✅ PA detected, creating expenses for main user:', { 
        paTelegramId: telegramId, 
        mainUserId: targetUserId ? `${targetUserId.substring(0, 8)}...` : null 
      })
    } else {
      console.log('✅ Regular user, creating expenses for themselves')
    }

    // Step 4: Simulate the API call that would be made
    console.log(`\n🌐 Simulating API call to ${appUrl}/api/telegram/message`)
    console.log('Request payload would be:')
    console.log({
      telegramId,
      userId: targetUserId, // This should be the main user's ID for PAs
      message: 'Image uploaded',
      type: 'image',
      imageData: '[base64_image_data]',
      imageFormat: 'jpg'
    })

    // Step 5: Test the message API logic directly
    console.log(`\n🧪 Testing message API logic directly...`)
    
    // Simulate the PA detection logic from the message API
    const { data: linkedUser2, error: linkError2 } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single()

    const { data: paRecord2, error: paError2 } = await supabase
      .from('personal_assistants')
      .select('user_id')
      .eq('pa_telegram_id', telegramId)
      .eq('is_active', true)
      .single()

    console.log('Message API PA check:', { paRecord2, paError2 })

    if (paError2) {
      console.log('❌ Message API PA check also failed due to multiple records:', paError2)
      return
    }

    let targetUserId2 = targetUserId // Default to the user's own account
    
    if (paRecord2) {
      // This is a PA, so they can create expenses for the main user
      targetUserId2 = paRecord2.user_id
      console.log('✅ Message API - PA detected, creating expenses for main user:', { 
        paTelegramId: telegramId, 
        mainUserId: targetUserId2 ? `${targetUserId2.substring(0, 8)}...` : null 
      })
    } else {
      console.log('✅ Message API - Regular user, creating expenses for themselves')
    }

    console.log('\n🎯 Summary:')
    console.log(`- PA Telegram ID: ${telegramId}`)
    console.log(`- PA's own user ID: ${linkedUser.user_id}`)
    console.log(`- Target user ID (main user): ${targetUserId2}`)
    console.log(`- Should create expenses for: ${targetUserId2 === paRecord.user_id ? '✅ Main user' : '❌ Wrong user'}`)

  } catch (error) {
    console.error('❌ Error in photo processing test:', error)
  }
}

testPhotoProcessing() 