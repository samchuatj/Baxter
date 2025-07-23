"use client"

import { isSupabaseConfigured } from "@/lib/supabase/server"
import LoginForm from "@/components/login-form"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
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
  const [loginSuccess, setLoginSuccess] = useState(false)

  useEffect(() => {
    if (loginSuccess) {
      const next = searchParams.get('next')
      if (next) {
        router.push(next)
      } else {
        router.push("/")
      }
    }
  }, [loginSuccess, router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161616] px-4 py-12 sm:px-6 lg:px-8">
      <LoginForm onSuccess={() => setLoginSuccess(true)} />
    </div>
  )
}
