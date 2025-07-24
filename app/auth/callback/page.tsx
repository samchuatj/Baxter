"use client"

import { useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const hasExchangedCode = useRef(false)
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
        
        // Check if we have an OAuth code
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        
        // Handle OAuth errors
        if (error) {
          console.error('❌ Auth callback page - OAuth error:', error)
          router.replace(`/auth/login?error=oauth_${error}`)
          return
        }
        
        if (code && !hasExchangedCode.current) {
          console.log('🔍 Auth callback page - OAuth code present, exchanging for session')
          hasExchangedCode.current = true
          
          // Exchange the code for a session with retry logic
          let retryCount = 0
          const maxRetries = 2
          
          while (retryCount < maxRetries) {
            try {
              const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
              
              console.log('🔍 Auth callback page - Session exchange result:', { 
                success: !exchangeError, 
                error: exchangeError?.message,
                hasSession: !!data.session,
                retryCount
              })

              if (exchangeError) {
                console.error('❌ Auth callback page - Session exchange failed:', exchangeError)
                
                // If it's a PKCE error, don't retry
                if (exchangeError.message.includes('PKCE') || exchangeError.message.includes('invalid_grant')) {
                  console.error('❌ Auth callback page - PKCE error, not retrying')
                  router.replace('/auth/login?error=pkce_failed')
                  return
                }
                
                retryCount++
                if (retryCount < maxRetries) {
                  console.log(`🔍 Auth callback page - Retrying exchange (${retryCount}/${maxRetries})`)
                  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
                  continue
                } else {
                  router.replace('/auth/login?error=auth_failed')
                  return
                }
              }
              
              console.log('✅ Auth callback page - Session exchange successful')
              break
              
            } catch (retryError) {
              console.error('❌ Auth callback page - Exchange retry error:', retryError)
              retryCount++
              if (retryCount >= maxRetries) {
                router.replace('/auth/login?error=exchange_failed')
                return
              }
            }
          }
        } else if (hasExchangedCode.current) {
          console.log('🔍 Auth callback page - Code already exchanged, skipping')
        } else {
          console.log('🔍 Auth callback page - No OAuth code present')
        }
        
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