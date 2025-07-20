import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Create a service role client for admin operations
const createServiceRoleClient = () => {
  // For now, we'll use the anon key but with a different approach
  // In production, you should use a service role key
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Verify that a Telegram user is linked to a Supabase user
export async function verifyTelegramUser(telegramId: number, userId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      console.error('❌ Telegram user verification failed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Error verifying Telegram user:', error)
    return false
  }
}

// Create an authenticated client for a specific user
export async function createAuthenticatedClient(userId: string) {
  // For now, we'll use the service role client
  // In a production environment, you should implement proper JWT token generation
  const supabase = createServiceRoleClient()
  
  return {
    ...supabase,
    // Override the auth context to act as the specific user
    auth: {
      ...supabase.auth,
      getUser: () => Promise.resolve({ 
        data: { 
          user: { 
            id: userId,
            email: null,
            role: 'authenticated'
          } 
        }, 
        error: null 
      })
    }
  }
} 