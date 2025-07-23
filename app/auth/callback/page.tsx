"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔍 Auth callback page - Starting callback handling')
        
        // Get the next URL from session storage
        const nextUrl = sessionStorage.getItem('oauth_next_url')
        console.log('🔍 Auth callback page - Next URL from session storage:', nextUrl)
        
        // Clear the session storage
        if (nextUrl) {
          sessionStorage.removeItem('oauth_next_url')
          console.log('🔍 Auth callback page - Cleared session storage')
        }
        
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('🔍 Auth callback page - User check:', {
          hasUser: !!user,
          error: userError?.message
        })
        
        if (userError || !user) {
          console.log('❌ Auth callback page - User not authenticated, redirecting to login')
          router.replace('/auth/login')
          return
        }
        
        // Determine redirect URL
        let redirectUrl: string
        if (nextUrl) {
          redirectUrl = nextUrl
          console.log('🔍 Auth callback page - Redirecting to next URL:', redirectUrl)
        } else {
          redirectUrl = '/'
          console.log('🔍 Auth callback page - No next URL, redirecting to home')
        }
        
        console.log('✅ Auth callback page - Final redirect to:', redirectUrl)
        router.replace(redirectUrl)
        
      } catch (error) {
        console.error('❌ Auth callback page - Error during callback handling:', error)
        router.replace('/auth/login?error=callback_failed')
      }
    }

    handleCallback()
  }, [router, supabase.auth])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161616]">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-white mb-4" />
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  )
} 