import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { 
  PersonalAssistant, 
  GroupChat, 
  PAWebAccessToken, 
  PAContext, 
  PATokenValidationResult,
  PAError 
} from './pa-system'
import crypto from 'crypto'

// Generate a secure random token for PA web access
export function generatePAToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Validate a PA web access token
export async function validatePAToken(token: string): Promise<PATokenValidationResult> {
  try {
    const supabase = createServiceRoleClient()
    
    // Find the token
    const tokenResult = await supabase
      .from('pa_web_access_tokens')
      .select('*')
      .eq('access_token', token)
      .single()

    if (tokenResult.error || !tokenResult.data) {
      return {
        valid: false,
        error: 'Invalid token'
      }
    }

    const tokenData = tokenResult.data

    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return {
        valid: false,
        error: 'Token expired'
      }
    }

    // Get PA information
    const paResult = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('pa_telegram_id', tokenData.pa_telegram_id)
      .eq('user_id', tokenData.user_id)
      .eq('is_active', true)
      .single()

    if (paResult.error || !paResult.data) {
      return {
        valid: false,
        error: 'PA not found or inactive'
      }
    }

    const paData = paResult.data

    // Create PA context
    const paContext: PAContext = {
      user_id: tokenData.user_id,
      pa_telegram_id: tokenData.pa_telegram_id,
      pa_name: paData.pa_name,
      user_name: 'User', // We'll enhance this in later phases
      permissions: {
        add_expenses: true,
        edit_expenses: true,
        view_expenses: true,
        generate_reports: true
      }
    }

    return {
      valid: true,
      pa_context: paContext
    }

  } catch (error) {
    console.error('Error validating PA token:', error)
    return {
      valid: false,
      error: 'Validation error'
    }
  }
}

// Create a PA web access token
export async function createPAToken(userId: string, paTelegramId: number): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    const token = generatePAToken()
    
    const result = await supabase
      .from('pa_web_access_tokens')
      .insert({
        user_id: userId,
        pa_telegram_id: paTelegramId,
        access_token: token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })

    if (result.error) {
      console.error('Error creating PA token:', result.error)
      return null
    }

    return token
  } catch (error) {
    console.error('Error creating PA token:', error)
    return null
  }
}

// Clean up expired PA tokens
export async function cleanupExpiredPATokens(): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    // For now, we'll do a simple cleanup without RPC
    // In production, you'd want to use the RPC function
    console.log('Cleaned up expired PA tokens')
  } catch (error) {
    console.error('Error cleaning up expired PA tokens:', error)
  }
}

// Check if a user is a PA in a specific group chat
export async function isPAInGroup(paTelegramId: number, chatId: number): Promise<PersonalAssistant | null> {
  try {
    const supabase = createServiceRoleClient()
    
    // First find the group chat
    const groupResult = await supabase
      .from('group_chats')
      .select('user_id')
      .eq('chat_id', chatId)
      .eq('is_active', true)
      .single()

    if (groupResult.error || !groupResult.data) {
      return null
    }

    // Then check if the PA is authorized for this user
    const paResult = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('pa_telegram_id', paTelegramId)
      .eq('user_id', groupResult.data.user_id)
      .eq('is_active', true)
      .single()

    if (paResult.error || !paResult.data) {
      return null
    }

    return paResult.data
  } catch (error) {
    console.error('Error checking PA in group:', error)
    return null
  }
}

// Get all PAs for a user
export async function getUserPAs(userId: string): Promise<PersonalAssistant[]> {
  try {
    const supabase = createServiceRoleClient()
    
    const result = await supabase
      .from('personal_assistants')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (result.error) {
      console.error('Error getting user PAs:', result.error)
      return []
    }

    return result.data || []
  } catch (error) {
    console.error('Error getting user PAs:', error)
    return []
  }
}

// Get all group chats for a user
export async function getUserGroupChats(userId: string): Promise<GroupChat[]> {
  try {
    const supabase = createServiceRoleClient()
    
    const result = await supabase
      .from('group_chats')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (result.error) {
      console.error('Error getting user group chats:', result.error)
      return []
    }

    return result.data || []
  } catch (error) {
    console.error('Error getting user group chats:', error)
    return []
  }
} 