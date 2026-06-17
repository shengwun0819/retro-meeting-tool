'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RetroSession } from '@/types'
import { routerEvents } from '@/lib/navigation-events'
import { HIDDEN_TEAMS } from '@/lib/teamConfig'

interface BoardSidebarProps {
  currentSessionId: string
  isOpen: boolean
  onClose: () => void
}

export default function BoardSidebar({ currentSessionId, isOpen, onClose }: BoardSidebarProps) {
  const [sessions, setSessions] = useState<RetroSession[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())

  const toggleTeam = (team: string) => {
    setCollapsedTeams(prev => {
      const next = new Set(prev)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => setLoading(true), 0)
    fetch('/api/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSessions(data))
      .finally(() => setLoading(false))
    return () => clearTimeout(t)
  }, [isOpen])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      {/* 背景遮罩（模糊） */}
      <div
        className={`fixed inset-0 z-30 transition-all duration-300 ${
          isOpen ? 'bg-black/20 backdrop-blur-sm pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar 本體 */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-72 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 標題列 */}
        <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <span className="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span>🗂️</span> All Boards
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        {/* 回首頁按鈕 */}
        <Link
          href="/"
          className="mx-3 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
          onClick={() => { routerEvents.start(); onClose() }}
        >
          <span>🏠</span>
          <span>Home</span>
        </Link>

        <div className="px-3 mt-4 mb-2">
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent Boards</p>
        </div>

        {/* 看板列表 */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-xl">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xl">No boards yet</div>
          ) : (() => {
            // Group by team, filtering out hidden (deactivated) teams
            const byTeam = sessions.reduce((acc, s) => {
              const key = s.team ?? 'Other'
              if (HIDDEN_TEAMS.has(key)) return acc
              if (!acc[key]) acc[key] = []
              acc[key].push(s)
              return acc
            }, {} as Record<string, RetroSession[]>)
            const teamNames = Object.keys(byTeam).sort()

            return (
              <div className="space-y-1 mt-1">
                {teamNames.map((teamName) => {
                  const teamSessions = byTeam[teamName]
                  const isCollapsed = collapsedTeams.has(teamName)
                  return (
                    <div key={teamName}>
                      {/* Team toggle */}
                      <button
                        onClick={() => toggleTeam(teamName)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          {teamName}
                          <span className="text-xs font-normal normal-case tracking-normal opacity-60">({teamSessions.length})</span>
                        </span>
                        <svg
                          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>

                      {/* Sessions under team */}
                      <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="space-y-0.5 mb-1 pb-1">
                            {teamSessions.map((session) => {
                              const isCurrent = session.id === currentSessionId
                              return (
                                <Link
                                  key={session.id}
                                  href={`/board/${session.id}`}
                                  onClick={() => { routerEvents.start(); onClose() }}
                                  className={`block px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                    isCurrent
                                      ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{session.name}</p>
                                      {session.sprint_number && (
                                        <p className="text-xs text-gray-400 mt-0.5">Sprint {session.sprint_number}</p>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-xs text-gray-400 mt-0.5">
                                      {formatDate(session.created_at)}
                                    </div>
                                  </div>
                                  {isCurrent && (
                                    <span className="inline-block mt-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full px-2 py-0.5">
                                      Current
                                    </span>
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* 底部操作 */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0 space-y-2">
          <Link
            href="/?create=1"
            onClick={() => { routerEvents.start(); onClose() }}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors border border-blue-200 dark:border-blue-800"
          >
            <span>＋</span> New Board
          </Link>
          <Link
            href="/feedback"
            onClick={() => { routerEvents.start(); onClose() }}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <span>💬</span> Feedback
          </Link>
          <Link
            href="/settings"
            onClick={() => { routerEvents.start(); onClose() }}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <span>⚙️</span> Settings
          </Link>
        </div>
      </aside>
    </>
  )
}
