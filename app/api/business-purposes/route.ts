import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { addBusinessPurpose, getBusinessPurposes } from "@/lib/expenses"

export async function GET() {
  try {
    const purposes = await getBusinessPurposes()
    return NextResponse.json({ purposes })
  } catch (error) {
    console.error("Error fetching business purposes:", error)
    return NextResponse.json(
      { error: "Failed to fetch business purposes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Business purpose name is required" },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    
    // Check if name is too long
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: "Business purpose name must be 100 characters or less" },
        { status: 400 }
      )
    }

    const purpose = await addBusinessPurpose(trimmedName)
    
    if (!purpose) {
      return NextResponse.json(
        { error: "Failed to create business purpose" },
        { status: 500 }
      )
    }

    return NextResponse.json({ purpose }, { status: 201 })
  } catch (error) {
    console.error("Error creating business purpose:", error)
    return NextResponse.json(
      { error: "Failed to create business purpose" },
      { status: 500 }
    )
  }
} 