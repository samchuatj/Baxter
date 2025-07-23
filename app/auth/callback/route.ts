import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('🔍 Auth callback - Received request:', { 
    url: request.url, 
    code: code ? 'present' : 'missing',
    searchParams: Object.fromEntries(requestUrl.searchParams.entries())
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

  console.log('✅ Auth callback - Redirecting to home page')
  // URL to redirect to after sign in process completes
  // Use environment variable or fallback to production URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://baxterai.onrender.com'
  const redirectUrl = new URL('/', baseUrl)
  console.log('🔍 Auth callback - Redirect URL:', redirectUrl.toString())
  return NextResponse.redirect(redirectUrl)
} 