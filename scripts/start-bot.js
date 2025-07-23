console.log('BOT STARTUP: Running start-bot.js (latest code)')
// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import the TelegramBotService from TypeScript source
const { TelegramBotService } = require('../lib/telegram-bot.ts');

console.log('🤖 Starting Telegram bot in webhook mode...');

// Log environment variables (without exposing secrets)
console.log('🔍 Environment check:');
console.log('- NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL ? 'Set' : 'Missing');
console.log('- TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Missing');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');

// Create bot instance in webhook mode
let bot;
try {
  bot = new TelegramBotService({ webhookMode: true });
  console.log('✅ Bot instance created successfully');
} catch (error) {
  console.error('❌ Failed to create bot instance:', error);
  process.exit(1);
}

// Set webhook URL (replace with your actual production URL)
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!webhookUrl || !botToken) {
  console.error('❌ Missing required environment variables for webhook setup');
  console.error('- webhookUrl:', webhookUrl);
  console.error('- botToken:', botToken ? 'Set' : 'Missing');
  process.exit(1);
}

async function setupWebhook() {
  try {
    console.log(`🔗 Setting webhook to: ${webhookUrl}`);
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP error setting webhook:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!');
    } else {
      console.error('❌ Failed to set webhook:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    process.exit(1);
  }
}

// Set up webhook and keep the process alive
setupWebhook().then(() => {
  console.log('✅ Telegram bot webhook service ready!');
  console.log('🔄 Keeping process alive for Render...');
  
  // Keep the process alive with periodic logging
  setInterval(() => {
    console.log('💓 Bot service heartbeat...');
  }, 30000); // Log every 30 seconds
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down bot...');
  try {
    // Delete webhook on shutdown
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    console.log('✅ Webhook deleted');
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down bot...');
  try {
    // Delete webhook on shutdown
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    console.log('✅ Webhook deleted');
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
  }
  process.exit(0);
}); 