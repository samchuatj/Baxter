import { createClient } from '@supabase/supabase-js'

// Create a secure client that can only operate on behalf of a specific user
export function createSecureTelegramClient(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return {
    // Only allow operations that are scoped to the specific user
    from: (table: string) => {
      const originalFrom = supabase.from(table)
      
      return {
        ...originalFrom,
        // Override insert to always include user_id
        insert: (data: any) => {
          const dataWithUserId = {
            ...data,
            user_id: userId
          }
          return originalFrom.insert(dataWithUserId)
        },
        // Override select to only return user's data
        select: (columns?: string) => {
          return originalFrom.select(columns).eq('user_id', userId)
        },
        // Override update to only update user's data
        update: (data: any) => {
          return originalFrom.update(data).eq('user_id', userId)
        },
        // Override delete to only delete user's data
        delete: () => {
          return originalFrom.delete().eq('user_id', userId)
        }
      }
    },
    // Expose auth for verification
    auth: supabase.auth
  }
}

// Verify that a Telegram user is linked to a Supabase user
export async function verifyTelegramUser(telegramId: number, userId: string): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
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