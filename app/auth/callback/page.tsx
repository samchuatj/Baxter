"use client"

import { useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue ? decodeURIComponent(cookieValue) : null
  }
  return null
}

// Helper function to clear cookie
function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

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
        
        // Check if we have an OAuth code or error
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        
        // Debug: Log all search parameters and URL info
        console.log('🔍 Auth callback page - Full URL:', window.location.href)
        console.log('🔍 Auth callback page - All search parameters:', Object.fromEntries(searchParams.entries()))
        console.log('🔍 Auth callback page - URL parameters:', { 
          code: !!code, 
          error, 
          hasCode: !!code,
          hasError: !!error
        })
        
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
        
        // Ensure session is restored and user is authenticated
        console.log('🔍 Auth callback page - Ensuring session is restored...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Auth callback page - Session error:', sessionError)
          router.replace('/auth/login?error=session_failed')
          return
        }
        
        if (!session) {
          console.log('❌ Auth callback page - No session found, redirecting to login')
          router.replace('/auth/login')
          return
        }
        
        console.log('🔍 Auth callback page - Session restored successfully:', {
          userId: session.user.id,
          email: session.user.email
        })
        
        // Get the next URL from cookie
        const nextUrl = getCookie('oauth_next_url')
        console.log('🔍 Auth callback page - Next URL from cookie:', nextUrl)
        
        // Clear the cookie
        if (nextUrl) {
          clearCookie('oauth_next_url')
          console.log('🔍 Auth callback page - Cleared oauth_next_url cookie')
        }
        
        // Determine redirect URL
        const redirectUrl = nextUrl || '/'
        console.log('🔍 Auth callback page - Redirecting to:', redirectUrl)
        
        console.log('✅ Auth callback page - Final redirect to:', redirectUrl)
        console.log('🔍 Auth callback page - About to call router.replace with:', redirectUrl)
        
        // Add a small delay before redirect to ensure everything is processed
        await new Promise(resolve => setTimeout(resolve, 100))
        
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