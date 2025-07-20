const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const API_URL = 'http://localhost:3000/api/telegram/message'
const TEST_USER_ID = '73a74c90-fe77-46e6-8cde-21c3e987940a'
const TEST_TELEGRAM_ID = 132688762

async function testEnhancedLLM() {
  console.log('🧪 Testing Enhanced LLM Capabilities\n')

  const testCases = [
    {
      name: '📊 Recent Spending Summary',
      message: 'Can you give me a summary of my recent spending?',
      type: 'text'
    },
    {
      name: '📅 This Month Analysis',
      message: 'How much did I spend this month?',
      type: 'text'
    },
    {
      name: '📈 Annual Overview',
      message: 'Show me my spending for this year',
      type: 'text'
    },
    {
      name: '🍕 New Receipt (Text)',
      message: 'I spent $25.50 at Pizza Palace yesterday for lunch',
      type: 'text'
    },
    {
      name: '❓ Category Analysis',
      message: 'What categories do I spend the most on?',
      type: 'text'
    },
    {
      name: '💡 Financial Advice',
      message: 'I want to reduce my food expenses, any tips?',
      type: 'text'
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log(`Message: "${testCase.message}"`)
    
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
  }
}

// Run the test
testEnhancedLLM().catch(console.error) 