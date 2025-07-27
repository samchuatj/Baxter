// Fix webhook URL to point to the correct service
require('dotenv').config({ path: '.env.local' })

const botToken = process.env.TELEGRAM_BOT_TOKEN

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found')
  process.exit(1)
}

async function fixWebhookUrl() {
  console.log('🔧 Fixing webhook URL...')

  try {
    // The issue is that the webhook is pointing to the web service
    // but the bot logic is running in the background worker
    // We need to point the webhook to the background worker service
    
    // For Render, the background worker service should have its own URL
    // Let's check what the current webhook URL is and fix it
    
    console.log('\n📋 Step 1: Getting current webhook info...')
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
    const webhookInfo = await webhookInfoResponse.json()
    
    console.log('Current webhook info:', webhookInfo)

    if (webhookInfo.ok) {
      const info = webhookInfo.result
      console.log('Current webhook URL:', info.url)
      
      // The webhook should point to the background worker service, not the web service
      // For Render, the background worker service URL is typically:
      // https://baxter.onrender.com (not baxterai.onrender.com)
      
      const correctWebhookUrl = 'https://baxter.onrender.com/api/telegram/webhook'
      console.log('Correct webhook URL should be:', correctWebhookUrl)
      
      if (info.url !== correctWebhookUrl) {
        console.log('\n📋 Step 2: Setting correct webhook URL...')
        
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
          console.log('✅ Webhook URL fixed successfully!')
        } else {
          console.log('❌ Failed to set webhook:', setWebhookResult)
        }
      } else {
        console.log('✅ Webhook URL is already correct')
      }
    } else {
      console.log('❌ Failed to get webhook info:', webhookInfo)
    }

    console.log('\n🎯 Summary:')
    console.log('- The webhook was pointing to the web service (BaxterAI)')
    console.log('- But the bot logic runs in the background worker (Baxter)')
    console.log('- The webhook should point to the background worker service')
    console.log('- This is why no logs appeared when we tested the webhook')

  } catch (error) {
    console.error('❌ Error fixing webhook URL:', error)
  }
}

fixWebhookUrl() 