import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  console.log('🔍 Auth callback - Received request:', { 
    url: request.url, 
    code: code ? 'present' : 'missing',
    next: next || 'not provided',
    searchParams: Object.fromEntries(requestUrl.searchParams.entries()),
    env: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    }
  })

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      console.log('🔍 Auth callback - About to exchange code for session')
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('🔍 Auth callback - Session exchange result:', { 
        success: !error, 
        error: error?.message,
        hasSession: !!data.session,
        sessionData: data.session ? {
          userId: data.session.user.id,
          email: data.session.user.email,
          expiresAt: data.session.expires_at
        } : null
      })

      if (error) {
        console.error('❌ Auth callback - Session exchange failed:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
      }

      // Check if session was actually created
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 Auth callback - Session after exchange:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      })

    } catch (error) {
      console.error('❌ Auth callback - Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', request.url))
    }
  } else {
    console.log('❌ Auth callback - No code provided')
    return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
  }

  // Determine redirect URL using next parameter
  let redirectUrl: string
  if (next) {
    // Use the next parameter if provided
    redirectUrl = next
    console.log('🔍 Auth callback - Redirecting to next parameter:', redirectUrl)
  } else {
    // Fallback to home page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://baxterai.onrender.com'
    redirectUrl = new URL('/', baseUrl).toString()
    console.log('🔍 Auth callback - No next parameter, redirecting to home page:', redirectUrl)
  }

  console.log('✅ Auth callback - Final redirect URL:', redirectUrl)
  console.log('🔍 Auth callback - Request headers:', Object.fromEntries(request.headers.entries()))
  
  return NextResponse.redirect(redirectUrl)
} 