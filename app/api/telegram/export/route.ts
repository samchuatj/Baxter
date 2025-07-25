import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { TelegramBotService } from '@/lib/telegram-bot'

interface ExportRequest {
  telegramId: number
  userId: string
  format: 'pdf' | 'csv' | 'excel'
  dateFrom?: string
  dateTo?: string
  businessPurposeIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { telegramId, userId, format, dateFrom, dateTo, businessPurposeIds }: ExportRequest = await request.json()

    console.log('🔍 Export API Debug - Received request:', { 
      telegramId, 
      userId, 
      format,
      dateFrom,
      dateTo,
      businessPurposeIds
    })

    if (!telegramId || !userId || !format) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Create a service role client for API operations
    const supabase = createServiceRoleClient()

    // Verify the user is linked
    const { data: linkedUser, error: linkError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .eq('user_id', userId)
      .single()

    if (linkError || !linkedUser) {
      console.log('❌ Export API Debug - User not linked:', { telegramId, userId })
      return NextResponse.json(
        { success: false, error: 'User not linked' },
        { status: 400 }
      )
    }

    console.log('✅ Export API Debug - User verified, fetching expenses')

    // Build the query for expenses
    let expensesQuery = supabase
      .from('expenses')
      .select(`
        id,
        date,
        merchant_name,
        total_amount,
        business_purpose,
        business_purpose_id,
        receipt_filename,
        created_at
      `)
      .eq('user_id', userId)

    // Apply date filters
    if (dateFrom) {
      expensesQuery = expensesQuery.gte('date', dateFrom)
    }
    if (dateTo) {
      expensesQuery = expensesQuery.lte('date', dateTo)
    }

    // Apply business purpose filters
    if (businessPurposeIds && businessPurposeIds.length > 0) {
      expensesQuery = expensesQuery.in('business_purpose_id', businessPurposeIds)
    }

    // Get all expenses ordered by date
    const { data: expenses, error: expensesError } = await expensesQuery
      .order('date', { ascending: false })

    if (expensesError) {
      console.error('❌ Export API Debug - Error fetching expenses:', expensesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expenses' },
        { status: 500 }
      )
    }

    if (!expenses || expenses.length === 0) {
      const dateRangeText = dateFrom && dateTo ? ` from ${dateFrom} to ${dateTo}` : ' for all time'
      return NextResponse.json(
        { success: false, error: `No expenses found${dateRangeText}` },
        { status: 404 }
      )
    }

    // Get business purposes for display names
    const { data: businessPurposes } = await supabase
      .from('business_purposes')
      .select('id, name')

    const purposeMap = new Map(businessPurposes?.map((p: any) => [p.id, p.name]) || [])

    // Prepare data for export
    const exportData = expenses.map((expense: any) => ({
      date: expense.date,
      merchant: expense.merchant_name,
      amount: expense.total_amount,
      category: expense.business_purpose_id ? purposeMap.get(expense.business_purpose_id) : (expense.business_purpose || 'Uncategorized'),
      receipt: expense.receipt_filename ? 'Yes' : 'No'
    }))

    let fileBuffer: Buffer
    let filename: string
    let mimeType: string

    const totalAmount = exportData.reduce((sum: number, exp: any) => sum + exp.amount, 0)
    const dateRange = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time'

    switch (format) {
      case 'pdf':
        const pdf = new jsPDF()
        
        // Add title
        pdf.setFontSize(18)
        pdf.text('Baxter Expense Report', 14, 20)
        
        pdf.setFontSize(12)
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
        pdf.text(`Date range: ${dateRange}`, 14, 37)
        pdf.text(`Total expenses: ${exportData.length}`, 14, 44)
        pdf.text(`Total amount: $${totalAmount.toFixed(2)}`, 14, 51)

        // Add table
        const tableData = exportData.map((exp: any) => [
          exp.date,
          exp.merchant,
          `$${exp.amount.toFixed(2)}`,
          exp.category,
          exp.receipt
        ])

        ;(pdf as any).autoTable({
          head: [['Date', 'Merchant', 'Amount', 'Category', 'Receipt']],
          body: tableData,
          startY: 60,
          styles: {
            fontSize: 10,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255
          }
        })

        fileBuffer = Buffer.from(pdf.output('arraybuffer'))
        filename = `expenses_${dateRange.replace(/\s+/g, '_')}.pdf`
        mimeType = 'application/pdf'
        break

      case 'csv':
        const csvHeaders = 'Date,Merchant,Amount,Category,Receipt\n'
        const csvRows = exportData.map((exp: any) => 
          `"${exp.date}","${exp.merchant}",${exp.amount},"${exp.category}","${exp.receipt}"`
        ).join('\n')
        const csvContent = csvHeaders + csvRows
        
        fileBuffer = Buffer.from(csvContent, 'utf-8')
        filename = `expenses_${dateRange.replace(/\s+/g, '_')}.csv`
        mimeType = 'text/csv'
        break

      case 'excel':
        const workbook = XLSX.utils.book_new()
        
        // Create worksheet data with better formatting
        const wsData = [
          ['Date', 'Merchant', 'Amount', 'Category', 'Receipt'],
          ...exportData.map((exp: any) => [
            exp.date,
            exp.merchant,
            exp.amount,
            exp.category,
            exp.receipt
          ])
        ]
        
        const worksheet = XLSX.utils.aoa_to_sheet(wsData)
        
        // Set column widths for better readability
        const colWidths = [
          { wch: 12 }, // Date
          { wch: 25 }, // Merchant
          { wch: 12 }, // Amount
          { wch: 20 }, // Category
          { wch: 10 }  // Receipt
        ]
        worksheet['!cols'] = colWidths
        
        // Add metadata
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses')
        
        // Generate buffer with compression
        fileBuffer = XLSX.write(workbook, { 
          type: 'buffer', 
          bookType: 'xlsx',
          compression: true
        })
        filename = `expenses_${dateRange.replace(/\s+/g, '_')}.xlsx`
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported format' },
          { status: 400 }
        )
    }

    // Send file via Telegram
    const bot = new TelegramBotService({ webhookMode: true })
    
    try {
      const success = await bot.sendDocument(telegramId, fileBuffer, filename, {
        caption: `📊 *Expense Report*\n\n📅 *Period:* ${dateRange}\n💰 *Total:* $${totalAmount.toFixed(2)}\n📋 *Transactions:* ${exportData.length}\n📁 *Format:* ${format.toUpperCase()}`
      })

      if (success) {
        console.log('✅ Export API Debug - File sent successfully via Telegram')
        
        return NextResponse.json({
          success: true,
          message: `✅ Your expense report has been sent! 📊\n\n📅 Period: ${dateRange}\n💰 Total: $${totalAmount.toFixed(2)}\n📋 Transactions: ${exportData.length}\n📁 Format: ${format.toUpperCase()}`
        })
      } else {
        console.error('❌ Export API Debug - Failed to send file via Telegram')
        return NextResponse.json(
          { success: false, error: 'Failed to send file via Telegram' },
          { status: 500 }
        )
      }

    } catch (telegramError) {
      console.error('❌ Export API Debug - Error sending file via Telegram:', telegramError)
      return NextResponse.json(
        { success: false, error: 'Failed to send file via Telegram' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Export API Debug - Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 