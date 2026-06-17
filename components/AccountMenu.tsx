'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeContext'

export default function AccountMenu() {
  const { authName, authEmail, signOut } = useUser()
  const { isDark, toggleTheme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  if (authEmail) {
    return (
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className={`flex items-center gap-2.5 rounded-2xl shadow-md px-3 py-2 border transition-all ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: '#3b82f6' }}
          >
            {authName.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight text-left">
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{authName}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{authEmail}</p>
          </div>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className={`absolute right-0 mt-2 w-52 rounded-2xl shadow-xl border overflow-hidden transition-all duration-200 origin-top-right
          ${menuOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}
          ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <span>⚙️</span> Settings
          </Link>
          <Link
            href="/feedback"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <span>💬</span> Feedback Board
          </Link>
          <button
            onClick={() => { toggleTheme(); setMenuOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <span>{isDark ? '☀️' : '🌙'}</span> {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
          <button
            onClick={() => { signOut(); setMenuOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-500 hover:bg-red-50'}`}
          >
            <span>→</span> Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/settings"
        className={`rounded-xl shadow-md px-2.5 py-2 text-base border transition-all ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'}`}
        title="Settings"
      >
        ⚙️
      </Link>
      <button
        onClick={toggleTheme}
        className={`rounded-xl shadow-md px-2.5 py-2 text-base border transition-all ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'}`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
