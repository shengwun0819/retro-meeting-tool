'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null
  const hasError = searchParams?.get('error')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      <div
        className="absolute inset-0 -z-10 transition-opacity duration-500 ease-in-out opacity-100 dark:opacity-0"
        style={{ backgroundImage: `url('/bg-light.png')`, backgroundSize: '100vw auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'top center', filter: 'blur(6px)', transform: 'scale(1.03)' }}
      />
      <div
        className="absolute inset-0 -z-10 transition-opacity duration-500 ease-in-out opacity-0 dark:opacity-100"
        style={{ backgroundImage: `url('/bg-dark.png')`, backgroundSize: '100vw auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'top center', filter: 'blur(6px)', transform: 'scale(1.03)' }}
      />
      <div className="absolute inset-0 -z-10 transition-colors duration-500 bg-white/25 dark:bg-black/60" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔄</div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Retro Board</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Sprint retrospective tool · Real-time collaboration
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl p-8 border border-gray-200/60 dark:border-white/10">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to create or join a retro board</p>

          {(error || hasError) && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error || 'Sign-in failed. Please try again.'}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="text-lg animate-spin">⏳</span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>{loading ? 'Redirecting to Google...' : 'Sign in with Google'}</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Built for agile teams · Continue / Stop / Invent / Act
        </p>
      </div>
    </div>
  )
}
