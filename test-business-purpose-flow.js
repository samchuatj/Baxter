const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const API_URL = 'http://localhost:3000/api/telegram/message'
const TEST_USER_ID = '73a74c90-fe77-46e6-8cde-21c3e987940a'
const TEST_TELEGRAM_ID = 132688762

async function testBusinessPurposeFlow() {
  console.log('🧪 Testing Business Purpose Creation Flow\n')

  const testCases = [
    {
      name: '🏷️ Request New Business Purpose',
      message: 'Add a new business purpose called "Office Supplies"',
      type: 'text',
      expectedAction: 'add_business_purpose'
    },
    {
      name: '✅ Confirm Business Purpose',
      message: 'yes',
      type: 'text',
      expectedAction: 'confirm_business_purpose'
    },
    {
      name: '📋 Expense with New Category',
      message: 'I spent $25.99 at Staples for office supplies',
      type: 'text',
      expectedAction: 'create'
    },
    {
      name: '🏷️ Request Another Business Purpose',
      message: 'Add "Client Entertainment" as a business purpose',
      type: 'text',
      expectedAction: 'add_business_purpose'
    },
    {
      name: '❌ Cancel Business Purpose',
      message: 'no',
      type: 'text',
      expectedAction: 'cancel_business_purpose'
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
testBusinessPurposeFlow().catch(console.error) 