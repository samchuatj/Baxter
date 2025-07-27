// Check and fix webhook status
require('dotenv').config({ path: '.env.local' })

const botToken = process.env.TELEGRAM_BOT_TOKEN
const appUrl = process.env.NEXT_PUBLIC_APP_URL

if (!botToken || !appUrl) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

async function checkWebhookStatus() {
  console.log('🔍 Checking webhook status...')

  try {
    // Step 1: Get current webhook info
    console.log('\n📋 Step 1: Getting current webhook info...')
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
    const webhookInfo = await webhookInfoResponse.json()
    
    console.log('Current webhook info:', webhookInfo)

    if (webhookInfo.ok) {
      const info = webhookInfo.result
      console.log('✅ Webhook info retrieved successfully')
      console.log('- URL:', info.url || 'Not set')
      console.log('- Has custom certificate:', info.has_custom_certificate)
      console.log('- Pending update count:', info.pending_update_count)
      console.log('- Last error date:', info.last_error_date)
      console.log('- Last error message:', info.last_error_message)
      console.log('- Max connections:', info.max_connections)
      console.log('- Allowed updates:', info.allowed_updates)

      // Step 2: Check if webhook is set to the correct URL
      const expectedWebhookUrl = `${appUrl}/api/telegram/webhook`
      console.log('\n📋 Step 2: Checking webhook URL...')
      console.log('- Expected URL:', expectedWebhookUrl)
      console.log('- Current URL:', info.url || 'Not set')

      if (info.url !== expectedWebhookUrl) {
        console.log('❌ Webhook URL mismatch! Setting correct webhook...')
        
        // Set the correct webhook
        const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: expectedWebhookUrl,
            allowed_updates: ['message', 'callback_query']
          })
        })

        const setWebhookResult = await setWebhookResponse.json()
        console.log('Set webhook result:', setWebhookResult)

        if (setWebhookResult.ok) {
          console.log('✅ Webhook set successfully!')
        } else {
          console.log('❌ Failed to set webhook:', setWebhookResult)
        }
      } else {
        console.log('✅ Webhook URL is correct')
      }

      // Step 3: Test the webhook endpoint
      console.log('\n📋 Step 3: Testing webhook endpoint...')
      const testResponse = await fetch(expectedWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 148048437,
              username: 'vanpoh',
              first_name: 'Test'
            },
            chat: {
              id: 148048437,
              type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            text: '/start'
          }
        })
      })

      console.log('Webhook test response status:', testResponse.status)
      if (testResponse.ok) {
        console.log('✅ Webhook endpoint is working')
      } else {
        console.log('❌ Webhook endpoint returned error:', testResponse.status)
        const errorText = await testResponse.text()
        console.log('Error response:', errorText)
      }

    } else {
      console.log('❌ Failed to get webhook info:', webhookInfo)
    }

    console.log('\n🎯 Summary:')
    console.log('- Bot token:', botToken ? 'Set' : 'Missing')
    console.log('- App URL:', appUrl)
    console.log('- Expected webhook URL:', `${appUrl}/api/telegram/webhook`)
    console.log('- Webhook status:', webhookInfo.ok ? 'Working' : 'Error')

  } catch (error) {
    console.error('❌ Error checking webhook status:', error)
  }
}

checkWebhookStatus() 