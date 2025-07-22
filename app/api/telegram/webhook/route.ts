import { NextRequest, NextResponse } from 'next/server'
import { TelegramBotService } from '@/lib/telegram-bot'

// Singleton instance of the bot service in webhook mode
const botService = new TelegramBotService({ webhookMode: true })

export async function POST(req: NextRequest) {
  try {
    console.log("Webhook endpoint hit!");
    const update = await req.json()
    // Pass the update to the bot for processing
    await botService.handleWebhookUpdate(update)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error handling Telegram webhook:', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
} 