import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
  console.log("🔍 [WEBHOOK] Webhook endpoint hit!");
  console.log(`🔍 [WEBHOOK] Request method: ${req.method}`);
  console.log(`🔍 [WEBHOOK] Request URL: ${req.url}`);
  console.log(`🔍 [WEBHOOK] Request headers:`, Object.fromEntries(req.headers.entries()));
  
  try {
    const body = await req.json();
    console.log(`🔍 [WEBHOOK] Request body:`, JSON.stringify(body, null, 2));
    
    // Create bot instance in webhook mode
    console.log(`🔍 [WEBHOOK] Creating bot instance in webhook mode`);
    const bot = new TelegramBotService({ webhookMode: true });
    
    // Set up handlers for webhook mode
    console.log(`🔍 [WEBHOOK] Setting up webhook handlers`);
    bot.setupWebhookHandlers();
    
    // Handle the webhook update with timeout
    console.log(`🔍 [WEBHOOK] Processing webhook update with timeout`);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Webhook timeout')), 25000)
    );
    
    await Promise.race([
      bot.handleWebhookUpdate(body),
      timeoutPromise
    ]);
    
    console.log("✅ [WEBHOOK] Webhook update processed successfully");
  } catch (error: any) {
    console.error('❌ [WEBHOOK] Error processing webhook update:', error);
    console.error(`🔍 [WEBHOOK] Error type: ${error.constructor.name}`);
    console.error(`🔍 [WEBHOOK] Error message: ${error.message}`);
    console.error(`🔍 [WEBHOOK] Error stack: ${error.stack}`);
    // Don't let errors crash the service
  }

  console.log("🔍 [WEBHOOK] Returning webhook response");
  return NextResponse.json({ ok: true });
} 