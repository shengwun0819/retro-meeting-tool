'use client'

import { useEffect, useState } from 'react'

interface ConfirmDeleteModalProps {
  boardName: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeleteModal({ boardName, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const [inputValue, setInputValue] = useState('')
  const [closing, setClosing] = useState(false)
  const expectedValue = `Delete ${boardName}`
  const isConfirmed = inputValue === expectedValue

  const handleCancel = () => {
    setClosing(true)
    setTimeout(onCancel, 200)
  }

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className={`relative bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-white/60 dark:border-white/10 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}>
        {/* Warning icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-950 mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 text-center mb-2">Delete this board?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
          You are about to permanently delete
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-center mb-4">
          &ldquo;{boardName}&rdquo;
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-4">
          All sticky notes, comments, and action items will be deleted<br />and cannot be recovered.
        </p>

        {/* Confirmation input */}
        <div className="mb-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            To confirm, type <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{expectedValue}</span>
          </p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && isConfirmed) onConfirm() }}
            placeholder={expectedValue}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 transition-all bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={!isConfirmed}
            className="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
