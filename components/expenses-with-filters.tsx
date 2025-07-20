"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ExpenseFilters, { type FilterValues } from "./expense-filters"
import ExpensesTable from "./expenses-table"
import type { Expense, BusinessPurpose } from "@/lib/expenses"

interface ExpensesWithFiltersProps {
  initialExpenses: Expense[]
  businessPurposes: BusinessPurpose[]
}

export default function ExpensesWithFilters({ initialExpenses, businessPurposes }: ExpensesWithFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<FilterValues>({
    dateFrom: "",
    dateTo: "",
    businessPurposeIds: [],
  })

  // Initialize filters from URL params on client side only
  useEffect(() => {
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""
    const businessPurposeIds = searchParams.get("purposes")?.split(",").filter(Boolean) || []

    setFilters({
      dateFrom,
      dateTo,
      businessPurposeIds,
    })
  }, [searchParams])

  // Update URL when filters change
  const updateURL = (newFilters: FilterValues) => {
    const params = new URLSearchParams()

    if (newFilters.dateFrom) params.set("dateFrom", newFilters.dateFrom)
    if (newFilters.dateTo) params.set("dateTo", newFilters.dateTo)
    if (newFilters.businessPurposeIds.length > 0) {
      params.set("purposes", newFilters.businessPurposeIds.join(","))
    }

    const queryString = params.toString()
    const newURL = queryString ? `?${queryString}` : window.location.pathname

    router.replace(newURL, { scroll: false })
  }

  // Fetch filtered expenses
  const fetchFilteredExpenses = async (filterValues: FilterValues) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            dateFrom: filterValues.dateFrom || undefined,
            dateTo: filterValues.dateTo || undefined,
            businessPurposeIds:
              filterValues.businessPurposeIds.length > 0 ? filterValues.businessPurposeIds : undefined,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
      } else {
        console.error("Failed to fetch filtered expenses")
      }
    } catch (error) {
      console.error("Error fetching filtered expenses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters)
    updateURL(newFilters)
    fetchFilteredExpenses(newFilters)
  }

  // Apply initial filters if they exist
  useEffect(() => {
    const hasInitialFilters = filters.dateFrom || filters.dateTo || filters.businessPurposeIds.length > 0
    if (hasInitialFilters) {
      fetchFilteredExpenses(filters)
    }
  }, [filters]) // Run when filters change

  return (
    <div>
      <ExpenseFilters
        businessPurposes={businessPurposes}
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
      />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Expenses</h2>
        <p className="text-gray-600">
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} found
            </>
          )}
        </p>
      </div>

      <ExpensesTable expenses={expenses} />
    </div>
  )
}
