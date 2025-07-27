"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, DollarSign, Receipt, TrendingUp, Calendar } from "lucide-react"

interface PAContext {
  user_id: string
  pa_telegram_id: number
  pa_name: string
  user_name: string
  permissions: {
    add_expenses: boolean
    edit_expenses: boolean
    view_expenses: boolean
    generate_reports: boolean
  }
}

interface Expense {
  id: string
  date: string
  merchant_name: string
  total_amount: number
  business_purpose: string | null
  receipt_filename: string | null
  created_at: string
}

interface ExpenseSummary {
  total: number
  count: number
  average: number
  byPurpose: Record<string, number>
}

function PAAccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState('')
  const [paContext, setPAContext] = useState<PAContext | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)

  useEffect(() => {
    const handlePAAccess = async () => {
      try {
        // Get token from URL
        const token = searchParams.get('token')
        
        if (!token) {
          setStatus('error')
          setMessage('Invalid access link. Missing token.')
          return
        }

        // Validate the token
        const response = await fetch('/api/pa/access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setPAContext(result.data.pa_context)
          
          // Fetch expenses
          const expensesResponse = await fetch(`/api/pa/expenses?token=${token}&limit=20`)
          const expensesResult = await expensesResponse.json()

          if (expensesResponse.ok && expensesResult.success) {
            setExpenses(expensesResult.data.expenses)
            setSummary(expensesResult.data.summary)
          }

          setStatus('success')
          setMessage('Access granted! Welcome to the PA dashboard.')
        } else {
          if (result.error === 'Token expired') {
            setStatus('expired')
            setMessage('This access link has expired. Please request a new one.')
          } else {
            setStatus('error')
            setMessage(result.error || 'Failed to validate access token.')
          }
        }

      } catch (error) {
        console.error('Error during PA access:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handlePAAccess()
  }, [searchParams])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-lg">Validating access...</p>
          </div>
        )

      case 'success':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">PA Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome, {paContext?.pa_name}! You're viewing expenses for {paContext?.user_name}.
              </p>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
                    <p className="text-xs text-muted-foreground">
                      {summary.count} transactions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.average)}</div>
                    <p className="text-xs text-muted-foreground">
                      per transaction
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{expenses.length}</div>
                    <p className="text-xs text-muted-foreground">
                      recent expenses
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Expenses List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>
                  Latest expense transactions for {paContext?.user_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No expenses found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{expense.merchant_name}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(expense.date)}
                            {expense.business_purpose && ` • ${expense.business_purpose}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(expense.total_amount)}</div>
                          {expense.receipt_filename && (
                            <div className="text-xs text-blue-500">📎 Receipt</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permissions Info */}
            <Card>
              <CardHeader>
                <CardTitle>Your Permissions</CardTitle>
                <CardDescription>
                  What you can do as a Personal Assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>View expenses (read-only)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Send receipts via Telegram</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Add expenses via Telegram</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Generate expense reports</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-3">
              <Button 
                onClick={() => window.close()}
                className="w-full md:w-auto"
              >
                Close Dashboard
              </Button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
              <p className="text-gray-600 mt-2">{message}</p>
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

      case 'expired':
        return (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-12 w-12 text-orange-500" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-orange-600">Link Expired</h2>
              <p className="text-gray-600 mt-2">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                Please contact the main user to get a new access link.
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
      <div className="w-full max-w-4xl">
        <Card className="p-6">
          {renderContent()}
        </Card>
      </div>
    </div>
  )
}

export default function PAAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <Card className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-lg">Loading...</p>
            </div>
          </Card>
        </div>
      </div>
    }>
      <PAAccessContent />
    </Suspense>
  )
} 