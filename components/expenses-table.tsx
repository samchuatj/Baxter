"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download } from "lucide-react"
import type { Expense } from "@/lib/expenses"

interface ExpensesTableProps {
  expenses: Expense[]
}

export default function ExpensesTable({ expenses }: ExpensesTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getBadgeVariant = (purposeName: string) => {
    switch (purposeName) {
      case "Travel":
        return "default"
      case "Software Subscription":
        return "secondary"
      case "Food":
        return "outline"
      case "Others":
        return "destructive"
      default:
        return "default"
    }
  }

  const handleDownloadReceipt = (expense: Expense) => {
    if (expense.receipt_filename) {
      // Download the receipt using our API endpoint
      const downloadUrl = `/api/receipts/${encodeURIComponent(expense.receipt_filename)}`
      window.open(downloadUrl, "_blank")
    } else if (expense.receipt_url) {
      // If we have a direct URL, open it
      window.open(expense.receipt_url, "_blank")
    } else {
      alert("No receipt available for this expense.")
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No expenses found. Upload your first receipt to get started!</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Merchant Name</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead>Business Purpose</TableHead>
            <TableHead className="text-center">Receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-medium">{formatDate(expense.date)}</TableCell>
              <TableCell>{expense.merchant_name}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(expense.total_amount)}</TableCell>
              <TableCell>
                {expense.business_purpose_name ? (
                  <Badge variant={getBadgeVariant(expense.business_purpose_name)}>
                    {expense.business_purpose_name}
                  </Badge>
                ) : expense.business_purpose ? (
                  <span className="text-sm text-gray-600">{expense.business_purpose}</span>
                ) : (
                  <span className="text-gray-400 italic">No purpose specified</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadReceipt(expense)}
                  disabled={!expense.receipt_filename && !expense.receipt_url}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
