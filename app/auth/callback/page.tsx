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
        
        // Check if we have an OAuth code or error
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const next = searchParams.get('next')
        
        // Debug: Log all search parameters
        console.log('🔍 Auth callback page - All search parameters:', Object.fromEntries(searchParams.entries()))
        console.log('🔍 Auth callback page - URL parameters:', { 
          code: !!code, 
          error, 
          next,
          hasCode: !!code,
          hasError: !!error,
          hasNext: !!next
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
        
        // Determine redirect URL from the next parameter
        let redirectUrl: string
        if (next) {
          redirectUrl = next
          console.log('🔍 Auth callback page - Redirecting to next URL:', redirectUrl)
        } else {
          redirectUrl = '/'
          console.log('🔍 Auth callback page - No next URL found, redirecting to home')
        }
        
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