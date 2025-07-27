// Utility functions for sending Telegram messages from API endpoints

const botToken = process.env.TELEGRAM_BOT_TOKEN

if (!botToken) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set - Telegram API functions will not work')
}

export async function sendTelegramMessage(chatId: number, message: string, options?: any): Promise<boolean> {
  if (!botToken) {
    console.error('❌ Cannot send Telegram message: TELEGRAM_BOT_TOKEN not set')
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: options?.parse_mode || 'Markdown',
        ...options
      }),
    })

    const result = await response.json()
    
    if (result.ok) {
      console.log(`✅ Telegram message sent successfully to chat ${chatId}`)
      return true
    } else {
      console.error(`❌ Failed to send Telegram message to chat ${chatId}:`, result)
      return false
    }
  } catch (error) {
    console.error(`❌ Error sending Telegram message to chat ${chatId}:`, error)
    return false
  }
}

export async function sendTelegramSuccessMessage(chatId: number, groupTitle?: string): Promise<boolean> {
  const message = `🎉 **Group Registration Successful!**

✅ Your group chat has been successfully registered for PA management.

${groupTitle ? `📋 **Group:** ${groupTitle}` : ''}

**What's next?**
• Add PAs to this group using /add-pa @username
• PAs can now help manage expenses in this group
• Use /list-pas to see all PAs in this group
• Send /help for more commands

💡 **Tip:** PAs can send photos of receipts and I'll automatically extract expense details!`

  return sendTelegramMessage(chatId, message)
}

export async function sendTelegramErrorMessage(chatId: number, error: string): Promise<boolean> {
  const message = `❌ **Registration Failed**

${error}

Please try again with /register to get a new registration link.`

  return sendTelegramMessage(chatId, message)
} 