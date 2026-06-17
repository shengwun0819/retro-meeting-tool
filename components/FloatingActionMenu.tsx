'use client'

import { useState, useEffect } from 'react'
import HelpButton from './HelpButton'
import FeedbackButton from './FeedbackButton'

interface FloatingActionMenuProps {
  /** Extra pixels added to the base right-5 (20px) offset — use when a right-side panel is open. */
  rightOffset?: number
}

export default function FloatingActionMenu({ rightOffset = 0 }: FloatingActionMenuProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      {/* Backdrop — closes menu on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className="fixed bottom-5 z-40 flex flex-col items-end gap-2 transition-all duration-300"
        style={{ right: `${20 + rightOffset}px` }}
      >
        {/* Expandable Help + Feedback — always in DOM, animated in/out.
            Container handles fade + scale; children stagger via transition-delay. */}
        <div
          className={`flex flex-col items-end gap-2 transition-all duration-300 ease-out origin-bottom-right ${
            open
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-2 scale-90 pointer-events-none'
          }`}
        >
          <div
            className={`transition-all duration-200 ease-out ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transitionDelay: open ? '80ms' : '0ms' }}
          >
            <HelpButton />
          </div>
          <div
            className={`transition-all duration-200 ease-out ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transitionDelay: open ? '0ms' : '60ms' }}
          >
            <FeedbackButton />
          </div>
        </div>

        {/* ? toggle button */}
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Close' : 'Help & Feedback'}
          className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center font-bold text-lg transition-all duration-200 ${
            open
              ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-xl'
          }`}
        >
          {open ? '×' : '?'}
        </button>
      </div>
    </>
  )
}
