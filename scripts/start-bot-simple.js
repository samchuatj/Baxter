// Simple webhook setup script
console.log('🤖 Starting simple webhook setup...');

// Check environment variables
const requiredVars = [
  'TELEGRAM_BOT_TOKEN',
  'NEXT_PUBLIC_APP_URL',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

console.log('🔍 Checking environment variables:');
let allVarsSet = true;
requiredVars.forEach(varName => {
  const isSet = process.env[varName] ? 'Set' : 'Missing';
  console.log(`- ${varName}: ${isSet}`);
  if (!process.env[varName]) {
    allVarsSet = false;
  }
});

if (!allVarsSet) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Set webhook URL
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

console.log(`🔗 Setting webhook to: ${webhookUrl}`);

// Set webhook with Telegram
async function setupWebhook() {
  try {
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
      console.log('✅ Simple webhook service ready!');
    } else {
      console.error('❌ Failed to set webhook:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    process.exit(1);
  }
}

// Keep the process alive
setupWebhook().then(() => {
  console.log('🔄 Webhook service running...');
  
  // Keep the process alive
  setInterval(() => {
    console.log('💓 Heartbeat...');
  }, 30000); // Log every 30 seconds
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    console.log('✅ Webhook deleted');
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    console.log('✅ Webhook deleted');
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
  }
  process.exit(0);
}); 