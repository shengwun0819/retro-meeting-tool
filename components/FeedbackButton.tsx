'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'

export default function FeedbackButton() {
  const { user, authName } = useUser()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => { setClosing(false); setSent(false); setOpen(false) }, 200)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleSend = async () => {
    if (!feedback.trim()) return
    setSending(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: feedback.trim(),
          userId: user?.id ?? null,
          authorName: user?.name ?? authName ?? null,
        }),
      })
    } catch {
      // best-effort; don't block user
    } finally {
      setSending(false)
      setSent(true)
      setFeedback('')
      setTimeout(() => { setClosing(true); setTimeout(() => { setClosing(false); setSent(false); setOpen(false) }, 200) }, 4000)
    }
  }

  const modal = open ? (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className={`bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-white/60 dark:border-white/10 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">💬 Share Your Feedback</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Help us improve the retro board experience</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tell us what you liked, what could be better, or any ideas you have. All feedback is welcome!
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. It would be great if I could filter notes by author..."
            rows={5}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            autoFocus
          />
          {sent && (
            <div className="text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg px-3 py-2 flex items-center justify-between">
              <span>✓ Thanks! Track its status anytime.</span>
              <Link
                href="/feedback"
                onClick={() => setOpen(false)}
                className="font-semibold hover:underline"
              >
                Open Dashboard →
              </Link>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2.5 rounded-xl transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!feedback.trim() || sending || sent}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
          >
            {sent ? '✓ Sent!' : sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl"
        title="Send feedback"
      >
        💬 Feedback
      </button>

      {typeof document !== 'undefined' && createPortal(modal, document.body)}
    </>
  )
}
