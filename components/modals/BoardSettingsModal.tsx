'use client'

import { useState, useEffect } from 'react'
import { RetroSession, SectionOverride, SectionId } from '@/types'
import { SECTION_CONFIGS } from '@/lib/constants'

const TEAMS = ['Frontend', 'Backend', 'Platform']

const PRESET_COLORS = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Sky',     value: '#0ea5e9' },
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Purple',  value: '#a855f7' },
  { label: 'Yellow',  value: '#eab308' },
  { label: 'Pink',    value: '#ec4899' },
]

interface BoardSettingsModalProps {
  session: RetroSession
  sectionConfig: SectionOverride[] | null
  onClose: () => void
  onSave: (updates: { team: string; sprint_number?: number }) => Promise<void>
  onSaveSectionConfig: (config: SectionOverride[]) => Promise<void>
}

type Tab = 'general' | 'sections'

export default function BoardSettingsModal({
  session,
  sectionConfig,
  onClose,
  onSave,
  onSaveSectionConfig,
}: BoardSettingsModalProps) {
  const [tab, setTab] = useState<Tab>('general')
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 200)
  }
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(null)
  const [team, setTeam] = useState(session.team ?? '')
  const [sprintNumber, setSprintNumber] = useState(session.sprint_number?.toString() ?? '')
  const [teamError, setTeamError] = useState('')
  const [saving, setSaving] = useState(false)

  // Section overrides — keyed by section id
  const [overrides, setOverrides] = useState<Record<SectionId, SectionOverride>>(() => {
    const defaults = Object.fromEntries(
      SECTION_CONFIGS.map((s) => [s.id, { id: s.id as SectionId }])
    ) as Record<SectionId, SectionOverride>
    if (!Array.isArray(sectionConfig)) return defaults
    const merged = { ...defaults }
    sectionConfig.forEach((o) => { if (o?.id) merged[o.id] = { ...merged[o.id], ...o } })
    return merged
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleTeamChange = (val: string) => {
    setTeam(val)
    setTeamError(val && !TEAMS.includes(val) ? `Please enter one of: ${TEAMS.join(', ')}` : '')
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (team && !TEAMS.includes(team)) { setTeamError(`Please enter one of: ${TEAMS.join(', ')}`); return }
    setSaving(true)
    try {
      await onSave({
        team: team.trim(),
        sprint_number: sprintNumber ? parseInt(sprintNumber) : undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSections = async () => {
    setSaving(true)
    try {
      const config = Object.values(overrides).filter(
        (o) => o.title || o.subtitle || o.color
      )
      await onSaveSectionConfig(config)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const updateOverride = (id: SectionId, field: keyof SectionOverride, value: string | undefined) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value || undefined } }))
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className={`bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm flex flex-col border border-white/60 dark:border-white/10 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">⚙️ Board Settings</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
          <button className={tabCls('general')} onClick={() => setTab('general')}>General</button>
          <button className={tabCls('sections')} onClick={() => setTab('sections')}>Sections</button>
        </div>

        {/* Tab content with slide animation */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-250 ease-in-out"
            style={{ transform: tab === 'general' ? 'translateX(0%)' : 'translateX(-50%)', width: '200%' }}
          >
            {/* General tab */}
            <form onSubmit={handleSaveGeneral} className="p-5 space-y-4 w-1/2 shrink-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Available: {TEAMS.join(' · ')}</p>
                <input
                  type="text"
                  value={team}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  list="settings-team-options"
                  placeholder="e.g. Frontend"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${teamError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-blue-500'}`}
                />
                <datalist id="settings-team-options">
                  {TEAMS.map(t => <option key={t} value={t} />)}
                </datalist>
                {teamError && <p className="text-xs text-red-500 mt-1">{teamError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sprint Number</label>
                <input
                  type="number"
                  value={sprintNumber}
                  onChange={(e) => setSprintNumber(e.target.value)}
                  placeholder="e.g. 42"
                  min={1}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2.5 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!teamError || saving}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>

            {/* Sections tab — accordion */}
            <div className="p-5 w-1/2 shrink-0 space-y-2">
              {SECTION_CONFIGS.map((def) => {
                const o = overrides[def.id]
                const isOpen = expandedSection === def.id
                const hasCustom = !!(o?.title || o?.subtitle || o?.color)
                return (
                  <div key={def.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(isOpen ? null : def.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {def.emoji} {def.title}
                        {hasCustom && <span className="ml-2 text-xs text-blue-500">●</span>}
                      </span>
                      <span className={`text-gray-400 transition-transform duration-200 text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    <div
                      className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Title</label>
                            <input
                              type="text"
                              value={o?.title ?? ''}
                              onChange={(e) => updateOverride(def.id, 'title', e.target.value)}
                              placeholder={def.title}
                              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Subtitle</label>
                            <input
                              type="text"
                              value={o?.subtitle ?? ''}
                              onChange={(e) => updateOverride(def.id, 'subtitle', e.target.value)}
                              placeholder={def.subtitle}
                              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Color</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {PRESET_COLORS.map((c) => (
                                <button
                                  key={c.value}
                                  type="button"
                                  onClick={() => updateOverride(def.id, 'color', o?.color === c.value ? undefined : c.value)}
                                  title={c.label}
                                  className={`w-6 h-6 rounded-full border-2 transition-all ${o?.color === c.value ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent hover:scale-110'}`}
                                  style={{ backgroundColor: c.value }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2.5 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSections}
                  disabled={saving}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
