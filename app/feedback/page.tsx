'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { Feedback, FeedbackStatus } from '@/types'
import AccountMenu from '@/components/AccountMenu'

const STATUS_META: Record<FeedbackStatus, { label: string; emoji: string; chip: string }> = {
  pending:       { label: 'Pending',       emoji: '🕓', chip: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  acknowledged:  { label: 'Acknowledged',  emoji: '👀', chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  in_progress:   { label: 'In Progress',   emoji: '🛠', chip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  done:          { label: 'Done',          emoji: '✅', chip: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  wontfix:       { label: 'Won’t Fix', emoji: '🚫', chip: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

const STATUS_OPTIONS: FeedbackStatus[] = ['pending', 'acknowledged', 'in_progress', 'done', 'wontfix']

type Tab = 'all' | 'mine'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function FeedbackDashboard() {
  const { user } = useUser()
  const { isDark } = useTheme()
  const toast = useToast()

  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => {
    fetch('/api/feedback')
      .then(r => r.json())
      .then(d => Array.isArray(d.feedback) && setFeedback(d.feedback))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const myCount = useMemo(
    () => (user ? feedback.filter(f => f.user_id === user.id).length : 0),
    [feedback, user]
  )

  const filtered = useMemo(() => {
    let list = feedback
    if (tab === 'mine' && user) list = list.filter(f => f.user_id === user.id)
    if (statusFilter !== 'all') list = list.filter(f => f.status === statusFilter)
    return list
  }, [feedback, tab, statusFilter, user])

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    const prev = feedback
    setFeedback(p => p.map(f => f.id === id ? { ...f, status, updated_at: new Date().toISOString() } : f))
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Marked as ${STATUS_META[status].label}`)
    } catch {
      setFeedback(prev)
      toast.error('Failed to update status')
    }
  }

  const saveAdminNote = async (id: string) => {
    const note = noteDraft.trim()
    const prev = feedback
    setFeedback(p => p.map(f => f.id === id ? { ...f, admin_note: note || null } : f))
    setEditingNoteId(null)
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: note }),
      })
      if (!res.ok) throw new Error()
      toast.success('Note saved')
    } catch {
      setFeedback(prev)
      toast.error('Failed to save note')
    }
  }

  const beginEditNote = (f: Feedback) => {
    setEditingNoteId(f.id)
    setNoteDraft(f.admin_note ?? '')
  }

  return (
    <div className="theme-transition min-h-screen flex flex-col items-center p-6 relative animate-fade-in overflow-x-hidden">
      {/* Backgrounds — absolute (not fixed) so they span the full document and tile
          downward as content grows. w-screen + background-size: 100vw lock the image
          width to physical viewport width, so scrollbar appearance never changes scale. */}
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
      <div className="absolute inset-y-0 left-0 w-screen -z-10 transition-colors duration-500 bg-white/25 dark:bg-black/60" />
      <div className="fixed top-4 right-4 z-20">
        <AccountMenu />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="flex items-center mb-6 mt-2">
          <Link
            href="/"
            className={`text-sm font-medium ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <strong>← 🏠 Back to Home</strong>
          </Link>
        </div>

        <header className="mb-6">
          <h1 className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>💬 Feedback Board</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Browse all feedback, track status, and respond inline.
          </p>
        </header>

        {/* Tabs */}
        <div className={`rounded-2xl shadow-lg p-2 border mb-4 inline-flex gap-1 backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/40 border-gray-200/60'}`}>
          {(['all', 'mine'] as Tab[]).map(t => {
            const active = tab === t
            const count = t === 'all' ? feedback.length : myCount
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                disabled={t === 'mine' && !user}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-blue-500 text-white shadow'
                    : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t === 'all' ? 'All' : 'My Feedback'} ({count})
              </button>
            )
          })}
        </div>

        {/* Status filter */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Filter by status:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? STATUS_META[s].chip + ' ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-gray-900'
                  : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {STATUS_META[s].emoji} {STATUS_META[s].label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <ul className="space-y-3" role="status" aria-label="Loading feedback">
            {[...Array(3)].map((_, i) => (
              <li
                key={i}
                className={`rounded-2xl shadow-lg border p-5 backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/40 border-gray-200/60'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="space-y-2 flex-1">
                    <div className={`h-5 rounded-full animate-pulse w-24 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <div className={`h-3 rounded animate-pulse w-32 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                  </div>
                  <div className={`h-7 rounded-lg animate-pulse w-28 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                </div>
                <div className="space-y-2">
                  <div className={`h-3.5 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                  <div className={`h-3.5 rounded animate-pulse w-3/4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className={`rounded-2xl shadow-lg border p-10 text-center backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white/40 border-gray-200/60 text-gray-500'}`}>
            <p className="text-sm mb-1">No feedback to show.</p>
            <p className="text-xs opacity-70">
              {tab === 'mine' ? 'You haven’t submitted any feedback yet.' : 'Be the first to share.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3 animate-fade-in">
            {filtered.map(f => {
              const meta = STATUS_META[f.status]
              const isMine = user && f.user_id === user.id
              const editing = editingNoteId === f.id
              return (
                <li
                  key={f.id}
                  className={`rounded-2xl shadow-lg border p-5 transition-colors backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/40 border-gray-200/60'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.chip}`}>
                          {meta.emoji} {meta.label}
                        </span>
                        {isMine && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            yours
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {f.author_name || 'Anonymous'} · {timeAgo(f.created_at)}
                      </p>
                    </div>

                    {/* Status edit */}
                    <select
                      value={f.status}
                      onChange={e => updateStatus(f.id, e.target.value as FeedbackStatus)}
                      className={`text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                      title="Change status"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>
                  </div>

                  <p className={`text-sm whitespace-pre-wrap mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                    {f.content}
                  </p>

                  {/* Admin note */}
                  {editing ? (
                    <div className="mt-3">
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="Reply / status notes (visible to everyone)"
                        className={`w-full text-sm rounded-xl border px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors resize-none ${
                          isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'
                        }`}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => saveAdminNote(f.id)}
                          className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : f.admin_note ? (
                    <div
                      onClick={() => beginEditNote(f)}
                      className={`text-sm rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                        isDark ? 'bg-gray-800 hover:bg-gray-700/70' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      title="Click to edit reply"
                    >
                      <span className={`text-xs font-semibold mr-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>↳ Reply</span>
                      <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{f.admin_note}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => beginEditNote(f)}
                      className={`text-xs font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      + Add reply
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
