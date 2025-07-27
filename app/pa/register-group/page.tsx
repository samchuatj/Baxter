"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react"

function RegisterGroupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState('')
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleGroupRegistration = async () => {
      try {
        // Get parameters from URL
        const token = searchParams.get('token')
        const chatId = searchParams.get('chat_id') || searchParams.get('chatid')
        const telegramId = searchParams.get('telegram_id') || searchParams.get('telegramid')
        
        if (!token || !chatId || !telegramId) {
          setStatus('error')
          setMessage('Invalid registration link. Missing required parameters.')
          return
        }

        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          // Store the registration parameters in session storage
          sessionStorage.setItem('pa_registration_token', token)
          sessionStorage.setItem('pa_registration_chatid', chatId)
          sessionStorage.setItem('pa_registration_telegramid', telegramId)
          
          // Redirect to login with next param pointing to group registration
          const loginUrl = '/auth/login?next=/pa/register-group'
          router.replace(loginUrl)
          return
        }

        // Clear session storage since we're now authenticated
        sessionStorage.removeItem('pa_registration_token')
        sessionStorage.removeItem('pa_registration_chatid')
        sessionStorage.removeItem('pa_registration_telegramid')

        // Call the API to register the group
        const response = await fetch('/api/pa/register-group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            chatId: parseInt(chatId),
            telegramId: parseInt(telegramId)
          }),
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setStatus('success')
          setMessage('Group chat registered successfully! You can now add PAs to this group.')
        } else {
          if (result.error === 'expired') {
            setStatus('expired')
            setMessage('This registration link has expired. Please try again with a new link.')
          } else {
            setStatus('error')
            setMessage(result.error || 'Failed to register group chat. Please try again.')
          }
        }

      } catch (error) {
        console.error('Error during group registration:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleGroupRegistration()
  }, [searchParams, router, supabase.auth])

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-lg">Registering your group chat...</p>
          </div>
        )

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-600">Success!</h2>
              <p className="text-gray-600 mt-2">{message}</p>
            </div>
            <div className="mt-6 space-y-3">
              <Button 
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.close()}
                className="w-full"
              >
                Close Window
              </Button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600">Registration Failed</h2>
              <p className="text-gray-600 mt-2">{message}</p>
            </div>
            <div className="mt-6 space-y-3">
              <Button 
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.close()}
                className="w-full"
              >
                Close Window
              </Button>
            </div>
          </div>
        )

      case 'expired':
        return (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-12 w-12 text-orange-500" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-orange-600">Link Expired</h2>
              <p className="text-gray-600 mt-2">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                Please go back to your Telegram group and send /register again to get a new link.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <Button 
                onClick={() => window.close()}
                className="w-full"
              >
                Close Window
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Group Chat Registration</CardTitle>
          <CardDescription>
            Register your Telegram group chat for PA management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterGroupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <RegisterGroupContent />
    </Suspense>
  )
} 