import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { token, telegramId, userId } = await request.json()
    
    console.log('🔍 API Debug - Received request:', { token, telegramId, userId })

    if (!token || !telegramId || !userId) {
      console.log('❌ API Debug - Missing parameters')
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if token exists and is not expired in database
    const supabase = await createClient()
    console.log('🔍 API Debug - Checking token in database:', token)
    
    const { data: pending, error: fetchError } = await supabase
      .from('pending_auth')
      .select('*')
      .eq('token', token)
      .single()

    console.log('🔍 API Debug - Database response:', { pending, fetchError })

    if (fetchError || !pending) {
      console.log('❌ API Debug - Token not found or expired')
      return NextResponse.json(
        { success: false, error: 'expired' },
        { status: 400 }
      )
    }

    // Check if token matches the telegram ID
    if (pending.telegram_id !== telegramId) {
      console.log('❌ API Debug - Token mismatch:', { expected: pending.telegram_id, received: telegramId })
      return NextResponse.json(
        { success: false, error: 'Invalid token for this Telegram user' },
        { status: 400 }
      )
    }

    // Check if token is not expired
    if (new Date() > new Date(pending.expires_at)) {
      console.log('❌ API Debug - Token expired')
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

    console.log('✅ API Debug - Token is valid, proceeding with linking')

    // Link the Telegram user to the Supabase user
    // Check if this Telegram ID is already linked to another user
    const { data: existingLink, error: existingError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single()

    console.log('🔍 API Debug - Existing link check:', { existingLink, existingError })

    if (existingLink) {
      console.log('❌ API Debug - Telegram account already linked')
      return NextResponse.json(
        { success: false, error: 'This Telegram account is already linked to another user' },
        { status: 400 }
      )
    }

    // Insert the link
    console.log('🔍 API Debug - Inserting link:', { telegram_id: telegramId, user_id: userId })
    const { error: linkError } = await supabase
      .from('telegram_users')
      .insert({
        telegram_id: telegramId,
        user_id: userId
      })

    console.log('🔍 API Debug - Link insert result:', { linkError })

    if (linkError) {
      console.error('❌ API Debug - Error linking Telegram user:', linkError)
      return NextResponse.json(
        { success: false, error: 'Failed to link accounts' },
        { status: 500 }
      )
    }

    // Remove the token from pending auth
    await supabase
      .from('pending_auth')
      .delete()
      .eq('token', token)

    console.log('✅ API Debug - Successfully linked accounts')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ API Debug - Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 