"use client"

import { useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const hasProcessed = useRef(false)
  const isProcessing = useRef(false)

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple simultaneous executions
      if (isProcessing.current) {
        console.log('🔍 Auth callback page - Already processing, skipping')
        return
      }
      
      isProcessing.current = true
      
      try {
        console.log('🔍 Auth callback page - Starting callback handling')
        
        // Debug: Check all session storage items
        console.log('🔍 Auth callback page - All session storage items:', {
          oauth_next_url: sessionStorage.getItem('oauth_next_url'),
          allKeys: Object.keys(sessionStorage)
        })
        
        // Check if we have an OAuth code or error
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const state = searchParams.get('state')
        
        console.log('🔍 Auth callback page - URL parameters:', { code: !!code, error, state })
        
        // Handle OAuth errors
        if (error) {
          console.error('❌ Auth callback page - OAuth error:', error)
          router.replace(`/auth/login?error=oauth_${error}`)
          return
        }
        
        // If we have a code, let Supabase handle the exchange automatically
        if (code && !hasProcessed.current) {
          console.log('🔍 Auth callback page - OAuth code present, letting Supabase handle exchange')
          hasProcessed.current = true
          
          // Wait longer for Supabase to process the code automatically
          console.log('🔍 Auth callback page - Waiting for Supabase to process code...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          console.log('🔍 Auth callback page - Finished waiting')
        } else if (hasProcessed.current) {
          console.log('🔍 Auth callback page - Already processed, skipping')
        } else {
          console.log('🔍 Auth callback page - No OAuth code present')
        }
        
        // Wait a bit more before checking session storage
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Get the next URL from session storage or state parameter
        let nextUrl = sessionStorage.getItem('oauth_next_url')
        
        // If not in session storage, try state parameter
        if (!nextUrl && state) {
          try {
            nextUrl = decodeURIComponent(state)
            console.log('🔍 Auth callback page - Retrieved next URL from state parameter:', nextUrl)
          } catch (error) {
            console.error('❌ Auth callback page - Error decoding state parameter:', error)
          }
        }
        
        console.log('🔍 Auth callback page - Final next URL:', nextUrl)
        
        // Clear the session storage
        if (nextUrl) {
          sessionStorage.removeItem('oauth_next_url')
          console.log('🔍 Auth callback page - Cleared session storage')
        }
        
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('🔍 Auth callback page - User check:', {
          hasUser: !!user,
          error: userError?.message,
          userId: user?.id,
          email: user?.email
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
      } finally {
        isProcessing.current = false
      }
    }

    handleCallback()
  }, [router, supabase.auth, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161616]">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-white mb-4" />
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#161616]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
} 