'use client'

import { useState } from 'react'

interface NicknameModalProps {
  onConfirm: (name: string) => void
  defaultName?: string
}

export default function NicknameModal({ onConfirm, defaultName = '' }: NicknameModalProps) {
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a name')
      return
    }
    if (trimmed.length > 30) {
      setError('Name must be 30 characters or fewer')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-modal-in border border-white/60 dark:border-white/10">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Your display name</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            This name will appear on your sticky notes and comments.
            <br />
            You can use your Google name or set a custom one.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder="e.g. Kevin"
            className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500 transition-colors text-center text-lg font-medium placeholder-gray-400 dark:placeholder-gray-500"
            autoFocus
            maxLength={30}
          />
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}

          <button
            type="submit"
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            Enter Board 🚀
          </button>
        </form>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          Your name is only saved for this browser session
        </p>
      </div>
    </div>
  )
}
