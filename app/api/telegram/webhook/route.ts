import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
  console.log("Webhook endpoint hit!");
  
  try {
    const body = await req.json();
    
    // Create bot instance in webhook mode
    const bot = new TelegramBotService({ webhookMode: true });
    
    // Set up handlers for webhook mode
    bot.setupWebhookHandlers();
    
    // Handle the webhook update with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Webhook timeout')), 25000)
    );
    
    await Promise.race([
      bot.handleWebhookUpdate(body),
      timeoutPromise
    ]);
    
    console.log("Webhook update processed successfully");
  } catch (error) {
    console.error('Error processing webhook update:', error);
    // Don't let errors crash the service
  }

  return NextResponse.json({ ok: true });
} 