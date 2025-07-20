import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filename = decodeURIComponent(params.filename)
    
    // Verify the user owns this receipt by checking the expenses table
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('receipt_filename, receipt_url')
      .eq('user_id', user.id)
      .eq('receipt_filename', filename)
      .single()

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // If we have a data URL, serve it directly
    if (expense.receipt_url && expense.receipt_url.startsWith('data:')) {
      // Extract the data URL parts
      const [header, base64Data] = expense.receipt_url.split(',')
      const contentType = header.split(':')[1].split(';')[0]
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64')
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, max-age=3600'
        }
      })
    }

    // If we have a direct URL, redirect to it
    if (expense.receipt_url) {
      return NextResponse.redirect(expense.receipt_url)
    }

    // If no receipt data, return 404
    return NextResponse.json({ error: 'Receipt data not found' }, { status: 404 })

  } catch (error) {
    console.error('Error downloading receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 