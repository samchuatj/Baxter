"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { signUp } from "@/lib/actions"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { FcGoogle } from "react-icons/fc"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#2b725e] hover:bg-[#235e4c] text-white py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing up...
        </>
      ) : (
        "Sign Up"
      )}
    </Button>
  )
}

export default function SignUpForm({ onSuccess }: { onSuccess?: () => void }) {
  // Initialize with null as the initial state
  const [state, formAction] = useActionState(signUp, null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  // Handler for Google sign-up
  const handleGoogleSignIn = async () => {
    console.log('🔍 Google OAuth - Starting sign in process')

    // Get the next parameter from the URL
    const next = searchParams.get('next')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://baxterai.onrender.com'

    // Store the next parameter in session storage before OAuth
    if (next) {
      sessionStorage.setItem('oauth_next_url', next)
      console.log('🔍 Google OAuth - Stored next URL in session storage:', next)
    }
    
    // Use the standard Supabase auth callback URL
    const callbackUrl = `${baseUrl}/auth/callback`
    console.log('🔍 Google OAuth - Callback URL:', callbackUrl)
    
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    })
  }

  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess()
    }
  }, [state, onSuccess])

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Create an account</h1>
        <p className="text-lg text-gray-400">Sign up to get started</p>
      </div>

      {/* Google Sign-Up Button at the top */}
      <Button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full bg-white text-black border border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-2 mb-6"
      >
        <FcGoogle className="w-5 h-5" />
        Sign up with Google
      </Button>

      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-700" />
        <span className="mx-2 text-gray-400">or</span>
        <div className="flex-grow border-t border-gray-700" />
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-700 px-4 py-3 rounded">{state.error}</div>
        )}

        {state?.success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-700 px-4 py-3 rounded">
            {state.success}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="bg-[#1c1c1c] border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-[#1c1c1c] border-gray-800 text-white"
            />
          </div>
        </div>

        <SubmitButton />

        <div className="text-center text-gray-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-white hover:underline">
            Log in
          </Link>
        </div>
      </form>
    </div>
  )
}
