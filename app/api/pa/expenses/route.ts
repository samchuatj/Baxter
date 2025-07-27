import { NextRequest, NextResponse } from 'next/server'
import { validatePAToken, getPAExpenses, getPAExpenseSummary } from '@/lib/pa-utils'

export async function GET(request: NextRequest) {
  console.log('🔍 [PA_EXPENSES_API] Starting PA expenses API request')
  
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    console.log('🔍 [PA_EXPENSES_API] Received request:', { 
      token: token ? `${token.substring(0, 8)}...` : null,
      limit
    })

    if (!token) {
      console.log('❌ [PA_EXPENSES_API] Missing token')
      return NextResponse.json(
        { success: false, error: 'Missing access token' },
        { status: 400 }
      )
    }

    // Validate the PA token
    const validationResult = await validatePAToken(token)

    if (!validationResult.valid) {
      console.log('❌ [PA_EXPENSES_API] Token validation failed:', validationResult.error)
      return NextResponse.json(
        { success: false, error: validationResult.error },
        { status: 401 }
      )
    }

    const paContext = validationResult.pa_context!

    // Get expenses for the main user
    const expenses = await getPAExpenses(paContext.user_id, limit)
    
    // Get expense summary
    const summary = await getPAExpenseSummary(paContext.user_id)

    console.log('✅ [PA_EXPENSES_API] Expenses fetched successfully')

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        summary,
        pa_context: paContext
      }
    })

  } catch (error: any) {
    console.error('❌ [PA_EXPENSES_API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 