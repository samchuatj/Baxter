// Test bot connection and webhook
require('dotenv').config({ path: '.env.local' })

const TelegramBot = require('node-telegram-bot-api')

const botToken = process.env.TELEGRAM_BOT_TOKEN

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found')
  process.exit(1)
}

const bot = new TelegramBot(botToken, { polling: false })

async function testBotConnection() {
  console.log('🔍 Testing bot connection...')

  try {
    // Test 1: Get bot info
    console.log('\n📋 Test 1: Getting bot info...')
    const botInfo = await bot.getMe()
    console.log('✅ Bot info:', botInfo)

    // Test 2: Get webhook info
    console.log('\n📋 Test 2: Getting webhook info...')
    const webhookInfo = await bot.getWebhookInfo()
    console.log('✅ Webhook info:', webhookInfo)

    // Test 3: Check if webhook is set
    if (webhookInfo.url) {
      console.log('✅ Webhook is configured:', webhookInfo.url)
      console.log('✅ Webhook has pending updates:', webhookInfo.pending_update_count)
      console.log('✅ Last error date:', webhookInfo.last_error_date)
      console.log('✅ Last error message:', webhookInfo.last_error_message)
    } else {
      console.log('❌ No webhook configured')
    }

    // Test 4: Send a test message to check if bot can send messages
    console.log('\n📋 Test 4: Testing message sending...')
    console.log('This would send a test message to verify the bot can communicate')
    console.log('Uncomment the line below to actually send a test message')
    
    // Uncomment this to send a test message:
    // const testMessage = await bot.sendMessage(148048437, '🤖 Bot connection test - if you see this, the bot is working!')
    // console.log('✅ Test message sent:', testMessage.message_id)

    console.log('\n🎯 Summary:')
    console.log('- Bot is configured and can get info')
    console.log('- Webhook status:', webhookInfo.url ? 'Configured' : 'Not configured')
    console.log('- Pending updates:', webhookInfo.pending_update_count)
    console.log('- Last error:', webhookInfo.last_error_message || 'None')

    if (webhookInfo.last_error_message) {
      console.log('❌ There was a webhook error:', webhookInfo.last_error_message)
      console.log('This might explain why the bot is not processing messages')
    }

  } catch (error) {
    console.error('❌ Error testing bot connection:', error)
  }
}

testBotConnection() 