// Fix webhook URL back to web service
require('dotenv').config({ path: '.env.local' })

const botToken = process.env.TELEGRAM_BOT_TOKEN
const appUrl = process.env.NEXT_PUBLIC_APP_URL

if (!botToken || !appUrl) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

async function fixWebhookBackToWebService() {
  console.log('🔧 Fixing webhook URL back to web service...')

  try {
    const correctWebhookUrl = `${appUrl}/api/telegram/webhook`
    console.log('Correct webhook URL should be:', correctWebhookUrl)
    
    console.log('\n📋 Setting webhook URL...')
    
    const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: correctWebhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    })

    const setWebhookResult = await setWebhookResponse.json()
    console.log('Set webhook result:', setWebhookResult)

    if (setWebhookResult.ok) {
      console.log('✅ Webhook URL fixed back to web service!')
    } else {
      console.log('❌ Failed to set webhook:', setWebhookResult)
    }

    console.log('\n🎯 Summary:')
    console.log('- The webhook endpoint lives in the web service (BaxterAI)')
    console.log('- The bot logic is also in the web service')
    console.log('- The background worker (Baxter) is not needed for webhook processing')
    console.log('- DM flow should now work again')

  } catch (error) {
    console.error('❌ Error fixing webhook URL:', error)
  }
}

fixWebhookBackToWebService() 