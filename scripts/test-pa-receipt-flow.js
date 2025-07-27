// Test the complete PA receipt processing flow
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

async function testPAReceiptFlow() {
  console.log('🔍 Testing complete PA receipt processing flow...')

  try {
    // Step 1: Verify PA setup
    console.log('\n📋 Step 1: Verifying PA setup...')
    const { data: paRecord, error: paError } = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('pa_name', 'vanpoh')
      .eq('is_active', true)
      .single()

    if (paError || !paRecord) {
      console.error('❌ PA not found:', paError)
      return
    }

    console.log('✅ PA found:', paRecord)

    // Step 2: Verify Telegram user link
    console.log('\n📋 Step 2: Verifying Telegram user link...')
    const { data: telegramUser, error: tuError } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', paRecord.pa_telegram_id)
      .single()

    if (tuError || !telegramUser) {
      console.error('❌ Telegram user not linked:', tuError)
      return
    }

    console.log('✅ Telegram user linked:', telegramUser)

    // Step 3: Simulate photo processing in telegram-bot.ts
    console.log('\n📋 Step 3: Simulating photo processing...')
    const telegramId = paRecord.pa_telegram_id
    
    // Check if user is linked
    const { data: linkedUser, error: linkError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single()

    if (linkError || !linkedUser) {
      console.error('❌ User not linked in photo processing')
      return
    }

    // Check if this user is a PA for the main user
    const { data: paCheck, error: paCheckError } = await supabase
      .from('personal_assistants')
      .select('user_id')
      .eq('pa_telegram_id', telegramId)
      .eq('is_active', true)
      .single()

    if (paCheckError) {
      console.error('❌ PA check failed:', paCheckError)
      return
    }

    // Determine target user ID
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

    // Step 4: Simulate the API call to /api/telegram/message
    console.log('\n📋 Step 4: Simulating API call to /api/telegram/message...')
    
    const requestPayload = {
      telegramId,
      userId: targetUserId,
      message: 'Image uploaded',
      type: 'image',
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      imageFormat: 'jpg'
    }

    console.log('Request payload:', {
      ...requestPayload,
      imageData: requestPayload.imageData.substring(0, 50) + '...'
    })

    // Step 5: Test the message API logic directly
    console.log('\n📋 Step 5: Testing message API logic...')
    
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

    let targetUserId2 = requestPayload.userId // Default to the user's own account
    
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

    // Step 6: Check if there are any existing expenses for the target user
    console.log('\n📋 Step 6: Checking existing expenses...')
    const { data: existingExpenses, error: expError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', targetUserId2)
      .order('created_at', { ascending: false })
      .limit(5)

    if (expError) {
      console.error('❌ Error fetching expenses:', expError)
    } else {
      console.log('Recent expenses for target user:', existingExpenses?.length || 0)
      if (existingExpenses && existingExpenses.length > 0) {
        console.log('Latest expense:', {
          id: existingExpenses[0].id,
          merchant: existingExpenses[0].merchant_name,
          amount: existingExpenses[0].total_amount,
          date: existingExpenses[0].date,
          created_at: existingExpenses[0].created_at
        })
      }
    }

    // Step 7: Summary
    console.log('\n🎯 Summary:')
    console.log(`- PA Telegram ID: ${telegramId}`)
    console.log(`- PA's own user ID: ${linkedUser.user_id}`)
    console.log(`- Target user ID (main user): ${targetUserId2}`)
    console.log(`- Should create expenses for: ${targetUserId2 === paRecord.user_id ? '✅ Main user' : '❌ Wrong user'}`)
    console.log(`- API endpoint: ${appUrl}/api/telegram/message`)
    console.log(`- Bot should be running and processing messages`)

    // Step 8: Check if the bot is actually running
    console.log('\n📋 Step 8: Checking bot status...')
    console.log('The bot should be running on Render. Check the logs for:')
    console.log('- Bot service heartbeat messages')
    console.log('- Any error messages when processing photos')
    console.log('- Memory usage (should be stable)')

  } catch (error) {
    console.error('❌ Error in PA receipt flow test:', error)
  }
}

testPAReceiptFlow() 