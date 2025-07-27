import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  console.log('🔍 [REGISTER_GROUP_API] Starting group registration API request')
  
  try {
    const { token, chatId, telegramId } = await request.json()
    
    console.log('🔍 [REGISTER_GROUP_API] Received request:', { 
      token: token ? `${token.substring(0, 8)}...` : null, 
      chatId, 
      telegramId 
    })

    if (!token || !chatId || !telegramId) {
      console.log('❌ [REGISTER_GROUP_API] Missing parameters')
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if token exists and is not expired
    const supabase = createServiceRoleClient()
    const { data: pending, error: fetchError } = await supabase
      .from('pending_auth')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !pending) {
      console.log('❌ [REGISTER_GROUP_API] Token not found or expired')
      return NextResponse.json(
        { success: false, error: 'expired' },
        { status: 400 }
      )
    }

    // Check if token matches the telegram ID
    if (pending.telegram_id !== telegramId) {
      console.log('❌ [REGISTER_GROUP_API] Token mismatch')
      return NextResponse.json(
        { success: false, error: 'Invalid token for this Telegram user' },
        { status: 400 }
      )
    }

    // Check if token is not expired
    if (new Date() > new Date(pending.expires_at)) {
      console.log('❌ [REGISTER_GROUP_API] Token expired')
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

    // Get the user ID from the linked Telegram user
    const { data: linkedUser, error: linkError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single()

    if (linkError || !linkedUser) {
      console.log('❌ [REGISTER_GROUP_API] User not linked')
      return NextResponse.json(
        { success: false, error: 'User not linked to Baxter account' },
        { status: 400 }
      )
    }

    // Check if this group is already registered
    const { data: existingGroup, error: groupError } = await supabase
      .from('group_chats')
      .select('*')
      .eq('chat_id', chatId)
      .single()

    if (existingGroup) {
      console.log('❌ [REGISTER_GROUP_API] Group already registered')
      return NextResponse.json(
        { success: false, error: 'Group chat already registered' },
        { status: 400 }
      )
    }

    // Register the group chat
    const { data: newGroup, error: insertError } = await supabase
      .from('group_chats')
      .insert({
        user_id: linkedUser.user_id,
        chat_id: chatId,
        chat_title: `Group Chat ${chatId}`, // We'll get the actual title later
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ [REGISTER_GROUP_API] Error registering group:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to register group chat' },
        { status: 500 }
      )
    }

    // Remove the pending auth token
    await supabase
      .from('pending_auth')
      .delete()
      .eq('token', token)

    console.log('✅ [REGISTER_GROUP_API] Group registered successfully:', newGroup)

    return NextResponse.json({
      success: true,
      data: {
        group_id: newGroup.id,
        chat_id: newGroup.chat_id,
        message: 'Group chat registered successfully!'
      }
    })

  } catch (error: any) {
    console.error('❌ [REGISTER_GROUP_API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 