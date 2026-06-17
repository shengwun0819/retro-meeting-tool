'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import { ACTIVE_TEAMS } from '@/lib/teamConfig'

interface PeriodData {
  label: string
  continue: number
  stop: number
  invent: number
  act: number
  sessions: number
}

interface TrendsData {
  team: string
  period: 'month' | 'quarter'
  periods: PeriodData[]
}

const SECTIONS = [
  { id: 'continue' as const, label: 'Continue', emoji: '✅', color: 'bg-emerald-500', darkColor: 'dark:bg-emerald-600', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'stop'     as const, label: 'Stop',     emoji: '🛑', color: 'bg-rose-500',    darkColor: 'dark:bg-rose-600',    textColor: 'text-rose-600 dark:text-rose-400'    },
  { id: 'invent'   as const, label: 'Invent',   emoji: '💡', color: 'bg-amber-400',   darkColor: 'dark:bg-amber-500',   textColor: 'text-amber-600 dark:text-amber-400'  },
  { id: 'act'      as const, label: 'Act',       emoji: '💪', color: 'bg-sky-500',     darkColor: 'dark:bg-sky-600',     textColor: 'text-sky-600 dark:text-sky-400'      },
]

function formatPeriodLabel(label: string): string {
  // "2026-05" → "May '26"  |  "2026 Q2" → "Q2 '26"
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-')
    const d = new Date(Number(year), Number(month) - 1)
    return `${d.toLocaleString('en-US', { month: 'short' })} '${year.slice(2)}`
  }
  if (/^\d{4} Q\d$/.test(label)) {
    const [year, q] = label.split(' ')
    return `${q} '${year.slice(2)}`
  }
  return label
}

export default function TrendsPage() {
  const { isDark } = useTheme()
  const [team, setTeam] = useState(ACTIVE_TEAMS[0] ?? '')
  const [period, setPeriod] = useState<'month' | 'quarter'>('month')
  const [data, setData] = useState<TrendsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!team) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null)
    fetch(`/api/trends?team=${encodeURIComponent(team)}&period=${period}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load trend data.'); return r.json() })
      .then((d) => { if (!cancelled) { setData(d); setError(null) } })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load trend data.') })
    return () => { cancelled = true }
  }, [team, period])

  const loading = !data && !error

  // Compute max count across all periods & sections for bar scaling
  const maxCount = data
    ? Math.max(1, ...data.periods.flatMap((p) => SECTIONS.map((s) => p[s.id])))
    : 1

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Link
              href="/"
              className={`text-sm mb-2 inline-block ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ← Home
            </Link>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>📊 Trend View</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Sticky note counts per section over time
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Period toggle */}
            <div className={`flex rounded-xl border overflow-hidden text-sm ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {(['month', 'quarter'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-500 text-white'
                      : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p === 'month' ? 'Monthly' : 'Quarterly'}
                </button>
              ))}
            </div>

            {/* Team selector */}
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
            >
              {ACTIVE_TEAMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className={`text-sm animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Loading…</div>
        )}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {data && !loading && data.periods.length === 0 && (
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data yet for {team}.</p>
        )}

        {data && !loading && data.periods.length > 0 && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-5">
              {SECTIONS.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5 text-sm">
                  <span className={`inline-block w-3 h-3 rounded-sm ${s.color} ${s.darkColor}`} />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{s.emoji} {s.label}</span>
                </span>
              ))}
            </div>

            {/* Chart — one row per period */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
              {data.periods.map((p, idx) => (
                <div
                  key={p.label}
                  className={`px-5 py-4 ${idx !== 0 ? `border-t ${isDark ? 'border-gray-800' : 'border-gray-50'}` : ''}`}
                >
                  {/* Period label + session count */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      {formatPeriodLabel(p.label)}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {p.sessions} sprint{p.sessions !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Stacked bar */}
                  <div className="flex items-end gap-2">
                    {SECTIONS.map((s) => {
                      const count = p[s.id]
                      const barH = count === 0 ? 4 : Math.max(12, Math.round((count / maxCount) * 80))
                      return (
                        <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                          <span className={`text-xs font-medium ${count === 0 ? (isDark ? 'text-gray-600' : 'text-gray-300') : s.textColor}`}>
                            {count}
                          </span>
                          <div
                            className={`w-full rounded-t-md transition-all ${s.color} ${s.darkColor} ${count === 0 ? 'opacity-20' : ''}`}
                            style={{ height: `${barH}px` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary totals */}
            <div className={`mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3`}>
              {SECTIONS.map((s) => {
                const total = data.periods.reduce((sum, p) => sum + p[s.id], 0)
                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl border p-4 text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                  >
                    <p className={`text-2xl font-bold ${s.textColor}`}>{total}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.emoji} {s.label}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>total notes</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
