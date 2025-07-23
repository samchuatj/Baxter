"use client"

import SignUpForm from "@/components/signup-form"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function SignUpPageContent() {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161616] px-4 py-12 sm:px-6 lg:px-8">
      <SignUpForm onSuccess={() => setSignedUp(true)} />
    </div>
  )
}

export default function SignUpPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#161616]">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  return (
    <Suspense>
      <SignUpPageContent />
    </Suspense>
  )
}
