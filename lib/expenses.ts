import { createClient } from "@/lib/supabase/server"

export interface BusinessPurpose {
  id: string
  name: string
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  date: string
  merchant_name: string
  total_amount: number
  business_purpose: string | null // Keep for backward compatibility
  business_purpose_id: string | null
  business_purpose_name?: string // Add this for the joined data
  receipt_url: string | null
  receipt_filename: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseFilters {
  dateFrom?: string
  dateTo?: string
  businessPurposeIds?: string[]
}

export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  try {
    const supabase = await createClient()

    // First check if we have a user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("Error getting user:", userError)
      return []
    }

    if (!user) {
      console.error("No authenticated user found")
      return []
    }

    // Build the query with filters
    let query = supabase
      .from("expenses")
      .select(`
        id,
        date,
        merchant_name,
        total_amount,
        business_purpose,
        business_purpose_id,
        receipt_url,
        receipt_filename,
        created_at,
        updated_at
      `)
      .eq("user_id", user.id)

    // Apply date filters
    if (filters?.dateFrom) {
      query = query.gte("date", filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte("date", filters.dateTo)
    }

    // Apply business purpose filters
    if (filters?.businessPurposeIds && filters.businessPurposeIds.length > 0) {
      query = query.in("business_purpose_id", filters.businessPurposeIds)
    }

    // Order by date
    query = query.order("date", { ascending: false })

    const { data: expenses, error } = await query

    if (error) {
      console.error("Error fetching expenses:", error)
      return []
    }

    if (!expenses || expenses.length === 0) {
      return []
    }

    // Get all business purposes
    const { data: purposes, error: purposesError } = await supabase.from("business_purposes").select("id, name")

    if (purposesError) {
      console.error("Error fetching business purposes:", purposesError)
      // Return expenses without purpose names if we can't fetch purposes
      return expenses
    }

    // Create a map of purpose IDs to names
    const purposeMap = new Map(purposes?.map((p) => [p.id, p.name]) || [])

    // Add business purpose names to expenses
    const expensesWithPurposes = expenses.map((expense) => ({
      ...expense,
      business_purpose_name: expense.business_purpose_id ? purposeMap.get(expense.business_purpose_id) : null,
    }))

    console.log(`Successfully fetched ${expensesWithPurposes.length} expenses with filters:`, filters)
    return expensesWithPurposes
  } catch (error) {
    console.error("Unexpected error in getExpenses:", error)
    return []
  }
}

export async function getBusinessPurposes(): Promise<BusinessPurpose[]> {
  try {
    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("Error getting user:", userError)
      return []
    }

    if (!user) {
      console.error("No authenticated user found")
      return []
    }

    // The RLS policies will automatically filter to show:
    // 1. All default purposes (is_default = true)
    // 2. User's own custom purposes (created_by = user.id)
    const { data: purposes, error } = await supabase
      .from("business_purposes")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching business purposes:", error)
      return []
    }

    return purposes || []
  } catch (error) {
    console.error("Unexpected error in getBusinessPurposes:", error)
    return []
  }
}

export async function addBusinessPurpose(name: string): Promise<BusinessPurpose | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Error getting user for adding business purpose:", userError)
      return null
    }

    const { data: purpose, error } = await supabase
      .from("business_purposes")
      .insert({
        name: name.trim(),
        is_default: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding business purpose:", error)
      return null
    }

    return purpose
  } catch (error) {
    console.error("Unexpected error in addBusinessPurpose:", error)
    return null
  }
}

export async function addExpense(expenseData: {
  date: string
  merchant_name: string
  total_amount: number
  business_purpose?: string
  receipt_url?: string
  receipt_filename?: string
}): Promise<Expense | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Error getting user for adding expense:", userError)
      return null
    }

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        date: expenseData.date,
        merchant_name: expenseData.merchant_name,
        total_amount: expenseData.total_amount,
        business_purpose: expenseData.business_purpose || null,
        receipt_url: expenseData.receipt_url || null,
        receipt_filename: expenseData.receipt_filename || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding expense:", error)
      return null
    }

    return expense
  } catch (error) {
    console.error("Unexpected error in addExpense:", error)
    return null
  }
}
