'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push(redirectTo)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}` }
    })
    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Typewriter</h1>
          <p className="text-[#6B6B6B] text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
          {magicLinkSent ? (
            <div className="text-center py-4">
              <p className="text-sm text-[#111111] font-medium">Check your email</p>
              <p className="text-sm text-[#6B6B6B] mt-1">We sent a magic link to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111] placeholder:text-[#AAAAAA]"
                />
              </div>
              {error && <p className="text-sm text-[#EF4444]">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#111111] text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full bg-white text-[#111111] text-sm font-medium py-2 px-4 rounded-md border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
              >
                Send magic link
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[#6B6B6B] mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#111111] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
