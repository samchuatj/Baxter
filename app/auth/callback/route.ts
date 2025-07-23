import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')

  console.log('🔍 Auth callback - Received request:', { 
    url: request.url, 
    code: code ? 'present' : 'missing',
    state: state || 'not provided',
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
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('🔍 Auth callback - Session exchange result:', { 
        success: !error, 
        error: error?.message,
        hasSession: !!data.session
      })

      if (error) {
        console.error('❌ Auth callback - Session exchange failed:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
      }
    } catch (error) {
      console.error('❌ Auth callback - Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', request.url))
    }
  } else {
    console.log('❌ Auth callback - No code provided')
    return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
  }

  // Determine redirect URL using state parameter (OAuth standard)
  let redirectUrl: string
  if (state) {
    // Decode the state parameter to get the next URL
    try {
      const nextUrl = decodeURIComponent(state)
      redirectUrl = nextUrl
      console.log('🔍 Auth callback - Redirecting using state parameter:', redirectUrl)
    } catch (error) {
      console.error('❌ Auth callback - Error decoding state parameter:', error)
      // Fallback to home page if state decoding fails
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://baxterai.onrender.com'
      redirectUrl = new URL('/', baseUrl).toString()
      console.log('🔍 Auth callback - Fallback to home page:', redirectUrl)
    }
  } else {
    // Fallback to home page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://baxterai.onrender.com'
    redirectUrl = new URL('/', baseUrl).toString()
    console.log('🔍 Auth callback - No state parameter, redirecting to home page:', redirectUrl)
  }

  console.log('✅ Auth callback - Final redirect URL:', redirectUrl)
  console.log('🔍 Auth callback - Request headers:', Object.fromEntries(request.headers.entries()))
  
  return NextResponse.redirect(redirectUrl)
} 