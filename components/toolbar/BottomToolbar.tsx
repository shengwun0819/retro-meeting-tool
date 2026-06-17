'use client'

import { useState, useEffect } from 'react'
import { CanvasTool } from '@/types'

interface BottomToolbarProps {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
}

const TOOLS: { id: CanvasTool; label: string; icon: React.ReactNode }[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 0l16 12-7 1-4 8z" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: <span className="font-bold text-sm leading-none">T</span>,
  },
  {
    id: 'rect',
    label: 'Rect',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="5" width="18" height="14" rx="1" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: 'arrow',
    label: 'Arrow',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="19" x2="19" y2="5" />
        <polyline points="9 5 19 5 19 15" />
      </svg>
    ),
  },
]

export default function BottomToolbar({ activeTool, onToolChange }: BottomToolbarProps) {
  const [expanded, setExpanded] = useState(false)
  const active = TOOLS.find(t => t.id === activeTool)!

  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [expanded])
  const isActiveNonSelect = activeTool !== 'select'

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-end gap-2">
      {/* Expanded tool list — always in DOM, animated */}
      <div
        className={`flex items-center gap-1 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-white/10 px-2 py-1.5 transition-all duration-200 ease-out origin-bottom ${
          expanded
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { onToolChange(tool.id); setExpanded(false) }}
            title={tool.label}
            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
              activeTool === tool.id
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setExpanded(e => !e)}
        title={expanded ? 'Collapse tools' : `Drawing tools (${active.label})`}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-lg border transition-all duration-200 ${
          isActiveNonSelect
            ? 'bg-blue-500 text-white border-blue-500 shadow-blue-200 dark:shadow-none'
            : expanded
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
              : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        {active.icon}
        <svg
          width="10" height="10" viewBox="0 0 10 10"
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <polyline points="2,7 5,3 8,7" />
        </svg>
      </button>
    </div>
  )
}
