"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

function TelegramAuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState('')
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleTelegramAuth = async () => {
      try {
        // First check if we have parameters in the URL
        let token = searchParams.get('token')
        let telegramId = searchParams.get('telegram_id')
        
        // If not in URL, check session storage (for users coming back after auth)
        if (!token || !telegramId) {
          token = sessionStorage.getItem('telegram_auth_token')
          telegramId = sessionStorage.getItem('telegram_auth_id')
          console.log('🔍 Telegram auth - Retrieved params from session storage:', { token: !!token, telegramId })
        }

        if (!token || !telegramId) {
          setStatus('error')
          setMessage('Invalid authentication link. Missing required parameters.')
          return
        }

        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          // Store the Telegram auth parameters in session storage
          sessionStorage.setItem('telegram_auth_token', token)
          sessionStorage.setItem('telegram_auth_id', telegramId)
          console.log('🔍 Telegram auth - Stored auth params in session storage')
          
          // Redirect to login with next param pointing to telegram auth
          const loginUrl = '/auth/login?next=/auth/telegram'
          console.log('🔍 Telegram auth - Redirecting to login:', loginUrl)
          router.replace(loginUrl)
          return
        }

        // Clear session storage since we're now authenticated
        sessionStorage.removeItem('telegram_auth_token')
        sessionStorage.removeItem('telegram_auth_id')
        console.log('🔍 Telegram auth - Cleared session storage')

        // Call the API to link the Telegram user
        const response = await fetch('/api/telegram/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            telegramId: parseInt(telegramId),
            userId: user.id
          }),
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setStatus('success')
          setMessage('Your Telegram account has been successfully linked to your Baxter account!')
        } else {
          if (result.error === 'expired') {
            setStatus('expired')
            setMessage('This authentication link has expired. Please try again with a new link.')
          } else {
            setStatus('error')
            setMessage(result.error || 'Failed to link your Telegram account. Please try again.')
          }
        }

      } catch (error) {
        console.error('Error during Telegram authentication:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleTelegramAuth()
  }, [searchParams, supabase.auth])

  const handleRedirect = () => {
    router.push('/')
  }

  const handleRetry = () => {
    router.push('/auth/login')
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
          {status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
          {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
          {status === 'expired' && <XCircle className="h-6 w-6 text-orange-600" />}
        </div>
        <CardTitle className="text-2xl">
          {status === 'loading' && 'Linking Telegram Account...'}
          {status === 'success' && 'Successfully Linked!'}
          {status === 'error' && 'Link Failed'}
          {status === 'expired' && 'Link Expired'}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {status === 'loading' && 'Please wait while we link your Telegram account to your Baxter account.'}
          {status === 'success' && 'Your Telegram account is now connected to your Baxter account.'}
          {status === 'error' && 'We encountered an issue while linking your accounts.'}
          {status === 'expired' && 'The authentication link has expired.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-gray-600">{message}</p>
        
        <div className="space-y-2">
          {status === 'success' && (
            <Button onClick={handleRedirect} className="w-full">
              Go to Dashboard
            </Button>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Sign In Again
              </Button>
              <Button onClick={handleRedirect} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}
          
          {status === 'expired' && (
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Get New Link
              </Button>
              <Button onClick={handleRedirect} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TelegramAuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161616] px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
            <CardDescription className="text-gray-600">
              Please wait while we load the authentication page.
            </CardDescription>
          </CardHeader>
        </Card>
      }>
        <TelegramAuthContent />
      </Suspense>
    </div>
  )
} 