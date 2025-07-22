export const dynamic = "force-dynamic";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Plus } from "lucide-react"
import { signOut } from "@/lib/actions"
import { getExpenses, getBusinessPurposes } from "@/lib/expenses"
import ExpensesWithFilters from "@/components/expenses-with-filters"

export default async function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#161616]">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  try {
    // Get the user from the server
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("Error getting user:", userError)
      redirect("/auth/login")
    }

    // If no user, redirect to login
    if (!user) {
      redirect("/auth/login")
    }

    // Fetch initial data
    const [expenses, businessPurposes] = await Promise.all([
      getExpenses(), // Get all expenses initially
      getBusinessPurposes(),
    ])

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Baxter</h1>
                <p className="text-gray-600">Expense Management</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Welcome, {user.email}</span>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Receipt
                </Button>
                <form action={signOut}>
                  <Button type="submit" variant="ghost" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ExpensesWithFilters initialExpenses={expenses} businessPurposes={businessPurposes} />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error in Home page:", error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">There was an error loading your expenses.</p>
          <form action={signOut}>
            <Button type="submit">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out and Try Again
            </Button>
          </form>
        </div>
      </div>
    )
  }
}
