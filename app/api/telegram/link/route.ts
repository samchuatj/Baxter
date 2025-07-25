import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TelegramBotService } from '@/lib/telegram-bot'

export async function POST(request: NextRequest) {
  console.log('🔍 [LINK_API] Starting Telegram link API request');
  console.log(`🔍 [LINK_API] Request method: ${request.method}`);
  console.log(`🔍 [LINK_API] Request URL: ${request.url}`);
  console.log(`🔍 [LINK_API] Request headers:`, Object.fromEntries(request.headers.entries()));
  
  try {
    const { token, telegramId, userId } = await request.json()
    
    console.log('🔍 [LINK_API] Received request body:', { 
      token: token ? `${token.substring(0, 8)}...` : null, 
      telegramId, 
      userId: userId ? `${userId.substring(0, 8)}...` : null 
    })

    if (!token || !telegramId || !userId) {
      console.log('❌ [LINK_API] Missing parameters:', { hasToken: !!token, hasTelegramId: !!telegramId, hasUserId: !!userId })
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if token exists and is not expired in database
    const supabase = await createClient()
    console.log('🔍 [LINK_API] Checking token in database:', token ? `${token.substring(0, 8)}...` : null)
    
    const { data: pending, error: fetchError } = await supabase
      .from('pending_auth')
      .select('*')
      .eq('token', token)
      .single()

    console.log('🔍 [LINK_API] Database response:', { 
      pending: pending ? { ...pending, token: pending.token ? `${pending.token.substring(0, 8)}...` : null } : null, 
      fetchError 
    })

    if (fetchError || !pending) {
      console.log('❌ [LINK_API] Token not found or expired:', { fetchError, hasPending: !!pending })
      return NextResponse.json(
        { success: false, error: 'expired' },
        { status: 400 }
      )
    }

    // Check if token matches the telegram ID
    if (pending.telegram_id !== telegramId) {
      console.log('❌ [LINK_API] Token mismatch:', { expected: pending.telegram_id, received: telegramId })
      return NextResponse.json(
        { success: false, error: 'Invalid token for this Telegram user' },
        { status: 400 }
      )
    }

    // Check if token is not expired
    if (new Date() > new Date(pending.expires_at)) {
      console.log('❌ [LINK_API] Token expired:', { expiresAt: pending.expires_at, currentTime: new Date().toISOString() })
      // Clean up expired token
      await supabase
        .from('pending_auth')
        .delete()
        .eq('token', token)
      
      return NextResponse.json(
        { success: false, error: 'expired' },
        { status: 400 }
      )
    }

    console.log('✅ [LINK_API] Token is valid, proceeding with linking')

    // Link the Telegram user to the Supabase user
    // Check if this Telegram ID is already linked to another user
    console.log('🔍 [LINK_API] Checking for existing link for Telegram ID:', telegramId)
    const { data: existingLink, error: existingError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single()

    console.log('🔍 [LINK_API] Existing link check:', { 
      existingLink: existingLink ? { ...existingLink, user_id: existingLink.user_id ? `${existingLink.user_id.substring(0, 8)}...` : null } : null, 
      existingError 
    })

    if (existingLink) {
      console.log('❌ [LINK_API] Telegram account already linked to user:', existingLink.user_id ? `${existingLink.user_id.substring(0, 8)}...` : null)
      return NextResponse.json(
        { success: false, error: 'This Telegram account is already linked to another user' },
        { status: 400 }
      )
    }

    // Insert the link
    console.log('🔍 [LINK_API] Inserting link:', { telegram_id: telegramId, user_id: userId ? `${userId.substring(0, 8)}...` : null })
    const { error: linkError } = await supabase
      .from('telegram_users')
      .insert({
        telegram_id: telegramId,
        user_id: userId
      })

    console.log('🔍 [LINK_API] Link insert result:', { linkError })

    if (linkError) {
      console.error('❌ [LINK_API] Error linking Telegram user:', linkError)
      return NextResponse.json(
        { success: false, error: 'Failed to link accounts' },
        { status: 500 }
      )
    }

    // Remove the token from pending auth
    console.log('🔍 [LINK_API] Removing token from pending auth')
    const { error: deleteError } = await supabase
      .from('pending_auth')
      .delete()
      .eq('token', token)
      
    console.log('🔍 [LINK_API] Token deletion result:', { deleteError })

    // Send minimal welcome message to satisfy Telegram client expectations
    try {
      const bot = new TelegramBotService({ webhookMode: true })
      const messageSent = await bot.sendMessage(
        telegramId,
        '✅ Account linked successfully! You can now use the bot for expense tracking.'
      )
      
      if (!messageSent) {
        console.log('⚠️ [LINK_API] Could not send welcome message - but linking was successful')
      } else {
        console.log('✅ [LINK_API] Welcome message sent successfully')
      }
    } catch (err) {
      console.error('❌ [LINK_API] Failed to send welcome message:', err)
      // Don't fail the linking process if welcome message fails
    }

    console.log('✅ [LINK_API] Successfully linked accounts')
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ [LINK_API] Unexpected error:', error)
    console.error(`🔍 [LINK_API] Error type: ${error.constructor.name}`)
    console.error(`🔍 [LINK_API] Error message: ${error.message}`)
    console.error(`🔍 [LINK_API] Error stack: ${error.stack}`)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 