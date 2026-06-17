'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'

const BOARD_HELP_SECTIONS = [
  {
    title: 'Sticky Notes',
    items: [
      'Click the + button in a section header to add a new note',
      'Double-click a note to edit its content',
      'Click the author name at the bottom to edit it',
      'Drag notes to reposition them (Select tool must be active)',
      'Drag the corner handles to resize a note',
      'B / I / U buttons in the note toolbar toggle bold / italic / underline',
      'A− / A+ adjust the font size',
      'Copy a hovered note with Ctrl+C, paste with Ctrl+V',
    ],
  },
  {
    title: 'Sections',
    items: [
      'Board is split into 4 sections: Continue ✅, Stop 🛑, Invent 💡, Act 💪',
      'Drag the dividers between sections to resize them',
      'The note count badge in each section header shows how many notes are there',
    ],
  },
  {
    title: 'Reactions & Comments',
    items: [
      'Hover a note to reveal the reaction toolbar',
      'Click + in the reaction toolbar to open the full emoji picker',
      'If the note is near the top of the screen, the emoji picker opens downward automatically',
      'Click 💬 on a note to open the inline comment panel',
      'Click Comments in the top bar to see all comments across all notes',
      'Click Reply on any note to add a comment — use ← to return to the list',
    ],
  },
  {
    title: 'Action Items',
    items: [
      'Click ✅ on a note to create an action item from it',
      'Click Action Items in the top bar to view and manage all action items',
      'Each item has Open / InProgress / Done status tracking',
    ],
  },
  {
    title: 'Top Bar',
    items: [
      'Click ☰ (hamburger) to open the All Boards sidebar — browse all past sessions by team',
      'Click ⚙️ next to the board name to edit Sprint Number or Team',
      'Click 🗑️ to delete the current board (requires confirmation)',
      'Click 🔗 Share to copy the board link to clipboard',
      'Click the ⏱ timer icon to start / pause / reset a countdown timer',
    ],
  },
  {
    title: 'Canvas Drawing Tools',
    items: [
      'Bottom toolbar: Select, Text, Rect, Circle, Arrow',
      'Drag to draw shapes; click for default size',
      'Double-click a canvas element to edit its text',
      'Delete / Backspace removes a selected canvas element',
    ],
  },
  {
    title: 'Collaboration',
    items: [
      'Online users are shown as coloured avatars in the top-right',
      'Share the board link via the 🔗 Share button',
      'Changes are synced in real-time to all viewers',
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    items: [
      'Ctrl+Z — undo last action',
      'Ctrl+Shift+Z — redo',
      'Ctrl+C — copy hovered note',
      'Ctrl+V — paste (inherits section colour)',
      'Delete / Backspace — delete selected canvas element',
      'Escape — close any open panel or modal',
    ],
  },
  {
    title: 'Export to ClickUp',
    items: [
      'Click Export in the top bar to open the export dialog',
      'Copy the /clickup-export command shown in the dialog',
      'Run the command in a Claude Code session with ClickUp MCP Server configured',
      'The export includes all notes, comments, and action items',
    ],
  },
]

const HOME_HELP_SECTIONS = [
  {
    title: 'Start New Retro',
    items: [
      'Click 🚀 Start New Retro to expand the creation form',
      'Select your team from the dropdown — available teams are listed above the input',
      'Optionally enter a sprint number for easy identification',
      'Click Create Board → to create and navigate to the new board',
    ],
  },
  {
    title: 'Join Existing Board',
    items: [
      'Paste a board URL or UUID into the Join field',
      'Click Join to navigate directly to that board',
    ],
  },
  {
    title: 'Recent Sessions',
    items: [
      'Sessions are grouped by team — click a team name to expand or collapse its list',
      'Click any session card to open that board',
      'Hover a session and click 🗑️ to delete it (a confirmation dialog will appear)',
    ],
  },
  {
    title: 'Theme',
    items: [
      'Use the ☀️ / 🌙 button in the top-right to switch between Light and Dark mode',
    ],
  },
]

export default function HelpButton() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isBoard = pathname?.startsWith('/board/')

  const sections = isBoard ? BOARD_HELP_SECTIONS : HOME_HELP_SECTIONS
  const title = isBoard ? '💡 Board Help' : '💡 Help'

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const modal = open ? (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{title}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {isBoard ? 'All board features at a glance' : 'How to use the homepage'}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-2">
                {section.title}
              </h3>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-gray-300 dark:text-gray-600 mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl"
        title="Help"
      >
        💡 Help
      </button>

      {typeof document !== 'undefined' && createPortal(modal, document.body)}
    </>
  )
}
