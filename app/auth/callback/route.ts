import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('🔍 Auth callback route - Received request:', { 
    url: request.url, 
    code: code ? 'present' : 'missing',
    searchParams: Object.fromEntries(requestUrl.searchParams.entries())
  })

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      console.log('🔍 Auth callback route - About to exchange code for session')
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('🔍 Auth callback route - Session exchange result:', { 
        success: !error, 
        error: error?.message,
        hasSession: !!data.session
      })

      if (error) {
        console.error('❌ Auth callback route - Session exchange failed:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
      }

      console.log('✅ Auth callback route - Session exchange successful, redirecting to callback page')
      // Redirect to the client-side callback page which will handle the next URL from session storage
      return NextResponse.redirect(new URL('/auth/callback', request.url))

    } catch (error) {
      console.error('❌ Auth callback route - Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', request.url))
    }
  } else {
    console.log('❌ Auth callback route - No code provided')
    return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
  }
} 