import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
  console.log("Webhook endpoint hit!");
  const body = await req.json();

  try {
    // Create bot instance in webhook mode
    const bot = new TelegramBotService({ webhookMode: true });
    
    // Set up handlers for webhook mode
    bot.setupWebhookHandlers();
    
    // Handle the webhook update
    await bot.handleWebhookUpdate(body);
    
    console.log("Webhook update processed successfully");
  } catch (error) {
    console.error('Error processing webhook update:', error);
  }

  return NextResponse.json({ ok: true });
} 