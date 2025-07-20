import { config } from 'dotenv'
import { resolve } from 'path'
import { telegramBot } from '../lib/telegram-bot'

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local')
config({ path: envPath })

// Verify environment variables are loaded
console.log('🔍 Checking environment variables...')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set')
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not set')
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL ? '✅ Set' : '❌ Not set')

// Check if required environment variables are set
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env.local')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Supabase environment variables are not set in .env.local')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

// Start the bot
try {
  telegramBot.start()
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Telegram bot...')
    telegramBot.stop()
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Telegram bot...')
    telegramBot.stop()
    process.exit(0)
  })
  
} catch (error) {
  console.error('❌ Failed to start Telegram bot:', error)
  process.exit(1)
} 