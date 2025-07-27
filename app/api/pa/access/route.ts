import { NextRequest, NextResponse } from 'next/server'
import { validatePAToken } from '@/lib/pa-utils'

export async function POST(request: NextRequest) {
  console.log('🔍 [PA_ACCESS_API] Starting PA access API request')
  
  try {
    const { token } = await request.json()
    
    console.log('🔍 [PA_ACCESS_API] Received request:', { 
      token: token ? `${token.substring(0, 8)}...` : null
    })

    if (!token) {
      console.log('❌ [PA_ACCESS_API] Missing token')
      return NextResponse.json(
        { success: false, error: 'Missing access token' },
        { status: 400 }
      )
    }

    // Validate the PA token
    const validationResult = await validatePAToken(token)

    if (!validationResult.valid) {
      console.log('❌ [PA_ACCESS_API] Token validation failed:', validationResult.error)
      return NextResponse.json(
        { success: false, error: validationResult.error },
        { status: 401 }
      )
    }

    console.log('✅ [PA_ACCESS_API] Token validated successfully')

    return NextResponse.json({
      success: true,
      data: {
        pa_context: validationResult.pa_context
      }
    })

  } catch (error: any) {
    console.error('❌ [PA_ACCESS_API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 