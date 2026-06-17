'use client'

import AccountMenu from '@/components/AccountMenu'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'
import FloatingActionMenu from '@/components/FloatingActionMenu'
import { useTheme } from '@/contexts/ThemeContext'
import { routerEvents } from '@/lib/navigation-events'
import { ACTIVE_TEAMS as TEAMS, HIDDEN_TEAMS } from '@/lib/teamConfig'
import { getRecentBoardIds } from '@/lib/recentBoards'
import { RetroSession } from '@/types'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function HomePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isDark } = useTheme()
  const [sessions, setSessions] = useState<RetroSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [joinId, setJoinId] = useState('')

  // Form state
  const [sprintNumber, setSprintNumber] = useState('')
  const [team, setTeam] = useState('')
  const [teamError, setTeamError] = useState('')
  const [templateId, setTemplateId] = useState<'cisa' | 'mad-sad-glad'>('cisa')
  const [creating, setCreating] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmSession, setConfirmSession] = useState<RetroSession | null>(null)

  // Team toggle state (tracks which teams are expanded; all collapsed by default)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  // Personal recently-visited board IDs (from localStorage, set on board entry)
  const [recentIds, setRecentIds] = useState<string[]>([])
  useEffect(() => { setRecentIds(getRecentBoardIds()) }, [])

  const toggleTeam = (team: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }

  // Auto-expand form if ?create=1
  useEffect(() => {
    if (searchParams.get('create') === '1') setShowForm(true)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSessions(data))
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }, [])

  const navigate = (path: string) => {
    routerEvents.start()
    router.push(path)
  }

  const handleTeamChange = (val: string) => {
    setTeam(val)
    const trimmed = val.trim()
    setTeamError(trimmed && !TEAMS.includes(trimmed) ? `Please enter one of: ${TEAMS.join(', ')}` : '')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team.trim()) { setTeamError('Team is required'); return }
    if (!TEAMS.includes(team.trim())) { setTeamError(`Please enter one of: ${TEAMS.join(', ')}`); return }
    setCreating(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${team.trim()} Sprint ${sprintNumber || '?'} Retro`,
          team: team.trim(),
          sprintNumber: sprintNumber ? parseInt(sprintNumber) : undefined,
          templateId,
        }),
      })
      if (res.ok) {
        const { session } = await res.json()
        navigate(`/board/${session.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const id = joinId.trim()
    if (!id) return
    const match = id.match(/([0-9a-f-]{36})/i)
    if (match) navigate(`/board/${match[1]}`)
  }

  const handleDelete = async () => {
    if (!confirmSession) return
    setDeletingId(confirmSession.id)
    setConfirmSession(null)
    try {
      await fetch(`/api/sessions/${confirmSession.id}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== confirmSession.id))
    } finally {
      setDeletingId(null)
    }
  }


  return (
    <div className="theme-transition min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-x-hidden">
      {/* Backgrounds — absolute (not fixed) so they span the full document and tile
          downward as content grows. w-screen + background-size: 100vw lock the image
          width to physical viewport width, so scrollbar appearance never changes scale.
          Opacity comes from CSS classes (not inline state) so it matches whatever the
          pre-hydration script set on <html>, avoiding hydration mismatch. */}
      <div
        className="absolute inset-y-0 left-0 w-screen -z-10 transition-opacity duration-500 ease-in-out opacity-100 dark:opacity-0"
        style={{
          backgroundImage: `url('/bg-light.png')`,
          backgroundSize: '100vw auto',
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'top center',
          filter: 'blur(6px)',
          transform: 'scale(1.03)',
        }}
      />
      <div
        className="absolute inset-y-0 left-0 w-screen -z-10 transition-opacity duration-500 ease-in-out opacity-0 dark:opacity-100"
        style={{
          backgroundImage: `url('/bg-dark.png')`,
          backgroundSize: '100vw auto',
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'top center',
          filter: 'blur(6px)',
          transform: 'scale(1.03)',
        }}
      />
      {/* Overlay for readability */}
      <div className="absolute inset-y-0 left-0 w-screen -z-10 transition-colors duration-500 ease-in-out bg-white/25 dark:bg-black/60" />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center">

        {/* Top-right controls */}
        <div className="fixed top-4 right-4 z-20">
          <AccountMenu />
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🔄</div>
          <h1 className={`text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>Retro Board</h1>
          <p className={`text-lg max-w-md ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
            <strong>Real-time sprint retrospective tool for agile teams.</strong>
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          {/* Create New Session */}
          <div className={`rounded-2xl shadow-lg p-6 border ${isDark ? 'bg-white/5 border-white/10 backdrop-blur-xl' : 'bg-white/40 border-gray-200/60 backdrop-blur-xl'}`}>
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full flex items-center justify-between"
            >
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>🚀 Start New Retro</span>
              <span
                className={`text-xl font-light transition-transform duration-300 select-none ${isDark ? 'text-gray-400' : 'text-gray-400'} ${showForm ? 'rotate-45' : ''}`}
              >
                +
              </span>
            </button>

            <div
              className={`grid transition-all duration-300 ease-in-out ${showForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <form onSubmit={handleCreate} className="mt-5 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Team *</label>
                    <p className={`text-xs mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                      Available teams: {TEAMS.join(' · ')}
                    </p>
                    <input
                      type="text"
                      value={team}
                      onChange={(e) => handleTeamChange(e.target.value)}
                      list="team-options"
                      placeholder="e.g. Frontend"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${teamError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'} ${isDark ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900'}`}
                      required
                    />
                    <datalist id="team-options">
                      {TEAMS.map(t => <option key={t} value={t} />)}
                    </datalist>
                    {teamError && <p className="text-xs text-red-500 mt-1">{teamError}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Sprint Number</label>
                    <input
                      type="number"
                      value={sprintNumber}
                      onChange={(e) => setSprintNumber(e.target.value)}
                      placeholder="e.g. 42"
                      min={1}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors ${isDark ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-500' : 'bg-white text-gray-900'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Template</label>
                    <div className="flex gap-2">
                      {([
                        { id: 'cisa', label: 'Continue / Stop / Invent / Act' },
                        { id: 'mad-sad-glad', label: 'Mad / Sad / Glad' },
                      ] as const).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTemplateId(t.id)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                            templateId === t.id
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : isDark
                                ? 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!team.trim() || !!teamError || creating}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Board →'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Join Existing */}
          <div className={`rounded-2xl shadow-lg p-6 border ${isDark ? 'bg-white/5 border-white/10 backdrop-blur-xl' : 'bg-white/40 border-gray-200/60 backdrop-blur-xl'}`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🔗 Join Existing Board</h2>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste board link or UUID..."
                className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors ${isDark ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-500' : 'bg-white text-gray-900 border-gray-200'}`}
              />
              <button
                type="submit"
                disabled={!joinId.trim()}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                Join
              </button>
            </form>
          </div>

          {/* Recent Sessions */}
          {(loadingSessions || sessions.some((s) => !HIDDEN_TEAMS.has(s.team ?? 'Other'))) && (() => {
            // Group by team, filtering out hidden teams
            const sessionsByTeam = sessions.reduce((acc, s) => {
              const key = s.team ?? 'Other'
              if (HIDDEN_TEAMS.has(key)) return acc
              if (!acc[key]) acc[key] = []
              acc[key].push(s)
              return acc
            }, {} as Record<string, RetroSession[]>)
            const teamNames = Object.keys(sessionsByTeam).sort()

            return (
            <div className={`rounded-2xl shadow-lg p-6 border ${isDark ? 'bg-white/5 border-white/10 backdrop-blur-xl' : 'bg-white/40 border-gray-200/60 backdrop-blur-xl'}`}>
              <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🕐 Recent Sessions</h2>
              {loadingSessions ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`flex items-center px-4 py-3 rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="flex-1 space-y-2">
                        <div className={`h-3.5 rounded animate-pulse w-2/3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                        <div className={`h-2.5 rounded animate-pulse w-1/3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                      </div>
                      <div className={`h-3 w-4 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                    </div>
                  ))}
                </div>
              ) : (
              <div className="space-y-2 animate-fade-in">
                {/* Jump back in — top 2 sessions this user has personally visited */}
                {(() => {
                  const recentSessions = recentIds.length > 0
                    // Sort by personal visit order, filter hidden teams
                    ? recentIds
                        .map((id) => sessions.find((s) => s.id === id))
                        .filter((s): s is typeof sessions[0] => !!s && !HIDDEN_TEAMS.has(s.team ?? 'Other'))
                        .slice(0, 2)
                    // Fallback: never visited any board yet → show 2 most recent
                    : sessions.filter((s) => !HIDDEN_TEAMS.has(s.team ?? 'Other')).slice(0, 2)
                  if (recentSessions.length === 0) return null
                  return (
                    <div className={`mb-4 pb-4 border-b-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 px-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Jump back in
                      </p>
                      <div className="space-y-0.5">
                        {recentSessions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => navigate(`/board/${s.id}`)}
                            className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors border border-transparent ${isDark ? 'hover:bg-gray-800 hover:border-gray-700' : 'hover:bg-gray-50 hover:border-gray-200'}`}
                          >
                            <div>
                              <p className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{s.name}</p>
                              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                                {s.team && <span className={`mr-1.5 px-1.5 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>{s.team}</span>}
                                {s.sprint_number ? `Sprint ${s.sprint_number} · ` : ''}
                                {new Date(s.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {teamNames.map((teamName) => {
                  const teamSessions = sessionsByTeam[teamName]
                  const isCollapsed = !expandedTeams.has(teamName)
                  return (
                    <div key={teamName}>
                      {/* Team toggle header */}
                      <button
                        onClick={() => toggleTeam(teamName)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}
                      >
                        <span className="text-sm font-semibold flex items-center gap-1.5">
                          <span>{teamName}</span>
                          <span className={`text-xs font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({teamSessions.length})</span>
                        </span>
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'} ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>

                      {/* Session list under team */}
                      <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="mt-1 space-y-0.5 pl-2 pb-1">
                            {teamSessions.map((s) => (
                              <div key={s.id} className="group flex items-center">
                                <button
                                  onClick={() => navigate(`/board/${s.id}`)}
                                  disabled={deletingId === s.id}
                                  className={`flex-1 text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors border border-transparent disabled:opacity-40 ${isDark ? 'hover:bg-gray-800 text-gray-100 hover:border-gray-700' : 'hover:bg-gray-50 hover:border-gray-200'}`}
                                >
                                  <div>
                                    <p className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{s.name}</p>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                                      {s.sprint_number ? `Sprint ${s.sprint_number} · ` : ''}
                                      {new Date(s.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                                    {deletingId === s.id ? 'Deleting...' : '→'}
                                  </span>
                                </button>
                                <button
                                  onClick={() => setConfirmSession(s)}
                                  disabled={deletingId === s.id}
                                  className="ml-1 p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:pointer-events-none"
                                  title="Delete this board"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}
            </div>
            )
          })()}
        </div>

        <p className={`mt-10 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Built for agile teams · Continue / Stop / Invent / Act framework
        </p>
      </div>

      <FloatingActionMenu />

      {confirmSession && (
        <ConfirmDeleteModal
          boardName={confirmSession.sprint_number ? `Sprint ${confirmSession.sprint_number} — ${confirmSession.name}` : confirmSession.name}
          onConfirm={handleDelete}
          onCancel={() => setConfirmSession(null)}
        />
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}
