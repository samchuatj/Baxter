import { type NextRequest, NextResponse } from "next/server"
import { getExpenses, type ExpenseFilters } from "@/lib/expenses"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const filters: ExpenseFilters = body.filters || {}

    const expenses = await getExpenses(filters)

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error("Error in expenses API:", error)
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
  }
}
