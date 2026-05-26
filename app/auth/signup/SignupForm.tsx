'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('token')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    const redirectTo = inviteToken
      ? `${window.location.origin}/auth/callback?redirectTo=/invite/${inviteToken}`
      : `${window.location.origin}/auth/callback?redirectTo=/dashboard`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: inviteToken
          ? `${window.location.origin}/invite/${inviteToken}`
          : `${window.location.origin}/dashboard`,
      }
    })
    if (error) {
      setError(error.message)
    } else {
      if (inviteToken) {
        router.push(`/invite/${inviteToken}`)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Typewriter</h1>
          <p className="text-[#6B6B6B] text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 flex flex-col gap-4">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2 px-4 text-sm font-medium text-[#111111] bg-white border border-[#E5E5E5] rounded-md hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#111111] rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E5E5E5]" />
            <span className="text-xs text-[#AAAAAA]">or</span>
            <div className="flex-1 h-px bg-[#E5E5E5]" />
          </div>

          {/* Email / password */}
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111] placeholder:text-[#AAAAAA]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111] placeholder:text-[#AAAAAA]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111] placeholder:text-[#AAAAAA]"
              />
            </div>
            {error && <p className="text-sm text-[#EF4444]">{error}</p>}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#111111] text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B6B6B] mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#111111] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
