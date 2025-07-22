import { TelegramBotService } from '../lib/telegram-bot'

console.log('🤖 Starting Telegram bot in webhook mode...')

// Create bot instance in webhook mode
const bot = new TelegramBotService({ webhookMode: true })

// Set webhook URL (replace with your actual production URL)
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`
const botToken = process.env.TELEGRAM_BOT_TOKEN

if (!webhookUrl || !botToken) {
  console.error('❌ Missing required environment variables for webhook setup')
  process.exit(1)
}

async function setupWebhook() {
  try {
    console.log(`🔗 Setting webhook to: ${webhookUrl}`)
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    })

    const result = await response.json()
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!')
    } else {
      console.error('❌ Failed to set webhook:', result)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error)
    process.exit(1)
  }
}

// Set up webhook and start
setupWebhook()

console.log('✅ Telegram bot webhook service ready!')

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down bot...')
  try {
    // Delete webhook on shutdown
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`)
    console.log('✅ Webhook deleted')
  } catch (error) {
    console.error('❌ Error deleting webhook:', error)
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down bot...')
  try {
    // Delete webhook on shutdown
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`)
    console.log('✅ Webhook deleted')
  } catch (error) {
    console.error('❌ Error deleting webhook:', error)
  }
  process.exit(0)
}) 