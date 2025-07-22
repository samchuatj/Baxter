import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log("Webhook endpoint hit!");
  const body = await req.json();

  if (body.message && body.message.chat && body.message.chat.id) {
    const chatId = body.message.chat.id;
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Hello from your production bot!",
        }),
      });
      console.log(`Sent reply to chat_id: ${chatId}`);
    } catch (err) {
      console.error('Error sending reply to Telegram:', err);
    }
  }

  return NextResponse.json({ ok: true });
} 