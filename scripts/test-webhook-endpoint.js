// Test webhook endpoint accessibility
require('dotenv').config({ path: '.env.local' })

const appUrl = process.env.NEXT_PUBLIC_APP_URL

if (!appUrl) {
  console.error('❌ NEXT_PUBLIC_APP_URL not found')
  process.exit(1)
}

async function testWebhookEndpoint() {
  console.log('🔍 Testing webhook endpoint...')

  try {
    const webhookUrl = `${appUrl}/api/telegram/webhook`
    console.log('Testing webhook URL:', webhookUrl)

    // Test 1: Check if the endpoint is accessible
    console.log('\n📋 Test 1: Checking endpoint accessibility...')
    
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      console.log('✅ Webhook endpoint is accessible')
    } else {
      console.log('❌ Webhook endpoint returned error:', response.status)
    }

    // Test 2: Check if the message endpoint is accessible
    console.log('\n📋 Test 2: Checking message endpoint...')
    
    const messageUrl = `${appUrl}/api/telegram/message`
    console.log('Testing message URL:', messageUrl)

    const messageResponse = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telegramId: 148048437,
        userId: '73a74c90-fe77-46e6-8cde-21c3e987940a',
        message: 'Test message',
        type: 'text'
      })
    })

    console.log('Message response status:', messageResponse.status)
    
    if (messageResponse.ok) {
      const responseData = await messageResponse.json()
      console.log('✅ Message endpoint is accessible')
      console.log('Response data:', responseData)
    } else {
      console.log('❌ Message endpoint returned error:', messageResponse.status)
      const errorText = await messageResponse.text()
      console.log('Error response:', errorText)
    }

    console.log('\n🎯 Summary:')
    console.log('- Webhook URL:', webhookUrl)
    console.log('- Message URL:', messageUrl)
    console.log('- Both endpoints should be accessible for the bot to work')

  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error)
  }
}

testWebhookEndpoint() 