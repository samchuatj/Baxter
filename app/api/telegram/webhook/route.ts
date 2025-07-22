import { NextRequest } from 'next/server'
import { TelegramBotService } from '@/lib/telegram-bot'

// Singleton instance of the bot service in webhook mode
const botService = new TelegramBotService({ webhookMode: true })

export async function POST(request: NextRequest) {
  console.log("Webhook endpoint hit!");
  return new Response("ok");
} 