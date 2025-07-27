// Test webhook call to see if it generates logs
require('dotenv').config({ path: '.env.local' })

const appUrl = process.env.NEXT_PUBLIC_APP_URL

if (!appUrl) {
  console.error('❌ NEXT_PUBLIC_APP_URL not found')
  process.exit(1)
}

async function testWebhookCall() {
  console.log('🔍 Testing webhook call...')

  try {
    const webhookUrl = `${appUrl}/api/telegram/webhook`
    console.log('Calling webhook URL:', webhookUrl)

    // Simulate a photo message from @vanpoh
    const webhookPayload = {
      update_id: 123456789,
      message: {
        message_id: 1,
        from: {
          id: 148048437,
          username: 'vanpoh',
          first_name: 'Test'
        },
        chat: {
          id: -1001234567890, // Group chat ID (negative)
          type: 'group',
          title: 'Test Group'
        },
        date: Math.floor(Date.now() / 1000),
        photo: [
          {
            file_id: 'test_file_id',
            file_unique_id: 'test_unique_id',
            width: 640,
            height: 480,
            file_size: 12345
          }
        ],
        caption: 'Test receipt'
      }
    }

    console.log('Sending webhook payload:', JSON.stringify(webhookPayload, null, 2))

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      const responseData = await response.json()
      console.log('✅ Webhook call successful')
      console.log('Response data:', responseData)
    } else {
      console.log('❌ Webhook call failed:', response.status)
      const errorText = await response.text()
      console.log('Error response:', errorText)
    }

    console.log('\n🎯 Next steps:')
    console.log('1. Check the Render logs for new entries')
    console.log('2. Look for webhook-related logs like:')
    console.log('   - 🔍 [WEBHOOK] Webhook endpoint hit!')
    console.log('   - 🔍 [WEBHOOK] Request body:')
    console.log('   - 🔍 [PHOTO_MESSAGE] Processing photo from user...')
    console.log('3. If no new logs appear, the issue is with the webhook processing')

  } catch (error) {
    console.error('❌ Error testing webhook call:', error)
  }
}

testWebhookCall() 