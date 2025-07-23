"use client"

import { isSupabaseConfigured } from "@/lib/supabase/server"
import SignUpForm from "@/components/signup-form"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SignUpPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#161616]">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  const router = useRouter()
  const searchParams = useSearchParams()
  const [signedUp, setSignedUp] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClientComponentClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace("/")
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    if (signedUp) {
      const next = searchParams.get('next')
      if (next) {
        router.push(next)
      } else {
        router.push("/")
      }
    }
  }, [signedUp, router, searchParams])

  if (checkingSession) {
    return null
  }

  // Pass a callback to SignUpForm to set signedUp to true on success
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161616] px-4 py-12 sm:px-6 lg:px-8">
      <SignUpForm onSuccess={() => setSignedUp(true)} />
    </div>
  )
}
