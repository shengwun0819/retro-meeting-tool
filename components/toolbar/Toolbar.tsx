'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Timer from './Timer'
import type { TimerProps } from './Timer'
import { OnlineUser } from '@/types'
import { USER_COLORS } from '@/lib/constants'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'

interface ToolbarProps {
  sessionName: string
  sprintNumber?: number
  team?: string
  onlineUsers: OnlineUser[]
  currentUser: { id: string; name: string; color: string } | null
  onShowActionItems: () => void
  actionItemCount: number
  onExport: () => void
  boardLink: string
  onToggleSidebar: () => void
  onDeleteBoard: () => void
  onShowAllComments: () => void
  totalCommentCount: number
  onOpenSettings: () => void
  onColorChange: (color: string) => void
  spotlightUserId: string | null
  onSpotlightUser: (userId: string | null) => void
  timerProps: TimerProps
}

export default function Toolbar({
  sessionName,
  sprintNumber,
  team,
  onlineUsers,
  currentUser,
  onShowActionItems,
  actionItemCount,
  onExport,
  boardLink,
  onToggleSidebar,
  onDeleteBoard,
  onShowAllComments,
  totalCommentCount,
  onOpenSettings,
  onColorChange,
  spotlightUserId,
  onSpotlightUser,
  timerProps,
}: ToolbarProps) {
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, right: 0 })
  const colorAvatarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!showColorPicker) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowColorPicker(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showColorPicker])

  const copyLink = async () => {
    await navigator.clipboard.writeText(boardLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/50 dark:border-white/10 shadow-md h-14 overflow-x-auto">
      <div className="flex items-center px-4 gap-3 h-full min-w-max">
        {/* Sidebar 切換按鈕 */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 shrink-0"
          title="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="4.5" x2="16" y2="4.5" />
            <line x1="2" y1="9" x2="16" y2="9" />
            <line x1="2" y1="13.5" x2="16" y2="13.5" />
          </svg>
        </button>

        {/* Session Title + Settings + Delete */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">🔄</span>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate">
              {team ? `${team}` : ''}{team && sprintNumber ? ' · ' : ''}{sprintNumber ? `Sprint ${sprintNumber}` : (!team ? sessionName : '')}
            </h1>
            {(team || sprintNumber) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sessionName}</p>
            )}
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
            title="Board settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
            title="Delete this board"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Timer */}
        <Timer {...timerProps} />

        <div className="flex-1" />

        {/* All Comments */}
        <button
          onClick={onShowAllComments}
          className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 px-3 py-1.5 rounded-lg text-sm transition-all relative text-gray-600 dark:text-gray-300"
          title="All comments"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="hidden lg:inline">Comments</span>
          {totalCommentCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {totalCommentCount > 99 ? '99+' : totalCommentCount}
            </span>
          )}
        </button>

        {/* Action Items */}
        <button
          onClick={onShowActionItems}
          className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 px-3 py-1.5 rounded-lg text-sm transition-all relative text-gray-600 dark:text-gray-300"
          title="Action items"
        >
          <span>✅</span>
          <span className="hidden lg:inline">Action Items</span>
          {actionItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {actionItemCount}
            </span>
          )}
        </button>

        {/* Export to ClickUp */}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 border border-purple-200 dark:border-purple-900 hover:border-purple-400 dark:hover:border-purple-700 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-lg text-sm transition-all"
          title="Export to ClickUp Docs"
        >
          <span>📤</span>
          <span className="hidden lg:inline">Export</span>
        </button>

        {/* Share Link */}
        <button
          onClick={copyLink}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
            copied
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title="Copy board link"
        >
          <span>{copied ? '✓' : '🔗'}</span>
          <span className="hidden lg:inline">{copied ? 'Copied!' : 'Share'}</span>
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Online Users */}
        <div className="flex items-center gap-1">
          {onlineUsers.slice(0, 5).map((u) => {
            const isSpotlit = spotlightUserId === u.id
            return (
              <button
                key={u.id}
                onClick={() => onSpotlightUser(isSpotlit ? null : u.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-900 shadow-sm -ml-1 first:ml-0 transition-all hover:scale-110"
                style={{
                  backgroundColor: u.color,
                  boxShadow: isSpotlit ? `0 0 0 2px white, 0 0 0 4px ${u.color}, 0 0 10px ${u.color}` : undefined,
                }}
                title={isSpotlit ? `Stop spotlighting ${u.name}` : `Spotlight ${u.name}`}
              >
                {u.name.charAt(0).toUpperCase()}
              </button>
            )
          })}
          {onlineUsers.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-200 -ml-1 border-2 border-white dark:border-gray-900">
              +{onlineUsers.length - 5}
            </div>
          )}
          {/* Current user avatar — click to change cursor colour */}
          {currentUser && (
            <div className="relative ml-1">
              <button
                ref={colorAvatarRef}
                onClick={() => {
                  if (colorAvatarRef.current) {
                    const rect = colorAvatarRef.current.getBoundingClientRect()
                    setColorPickerPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
                  }
                  setShowColorPicker(p => !p)
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-blue-300 shadow-sm transition-all hover:scale-110"
                style={{ backgroundColor: currentUser.color }}
                title="Change your cursor colour"
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </button>
            </div>
          )}
        </div>
      </div>
      </header>

      {showDeleteModal && (
        <ConfirmDeleteModal
          boardName={sprintNumber ? `Sprint ${sprintNumber} — ${sessionName}` : sessionName}
          onConfirm={() => { setShowDeleteModal(false); onDeleteBoard() }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showColorPicker && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-40"
            style={{ top: colorPickerPos.top, right: colorPickerPos.right }}
          >
            <div className="grid grid-cols-4 gap-1.5">
              {currentUser && USER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { onColorChange(c); setShowColorPicker(false) }}
                  className="w-7 h-7 rounded-full border-2 hover:scale-125 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: currentUser.color === c ? '#3b82f6' : 'transparent',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
