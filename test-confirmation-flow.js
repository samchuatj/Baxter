const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const API_URL = 'http://localhost:3000/api/telegram/message'
const TEST_USER_ID = '73a74c90-fe77-46e6-8cde-21c3e987940a'
const TEST_TELEGRAM_ID = 132688762

async function testConfirmationFlow() {
  console.log('🧪 Testing Expense Confirmation Flow\n')

  const testCases = [
    {
      name: '📋 New Receipt - Should Ask for Confirmation',
      message: 'I spent $45.99 at Starbucks yesterday for coffee',
      type: 'text',
      expectedAction: 'create'
    },
    {
      name: '✅ Confirmation - Should Create Expense',
      message: 'yes',
      type: 'text',
      expectedAction: 'confirm'
    },
    {
      name: '❌ Cancellation - Should Cancel',
      message: 'no',
      type: 'text',
      expectedAction: 'cancel'
    },
    {
      name: '🍕 Another Receipt - Should Ask for Confirmation Again',
      message: 'I spent $28.50 at Pizza Palace today',
      type: 'text',
      expectedAction: 'create'
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log(`Message: "${testCase.message}"`)
    console.log(`Expected Action: ${testCase.expectedAction}`)
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: TEST_TELEGRAM_ID,
          userId: TEST_USER_ID,
          message: testCase.message,
          type: testCase.type
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Response:', result.message)
        if (result.expenseCreated) {
          console.log('💰 New expense created!')
        }
      } else {
        console.log('❌ Error:', result.error)
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message)
    }
    
    console.log('─'.repeat(50))
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

// Run the test
testConfirmationFlow().catch(console.error) 