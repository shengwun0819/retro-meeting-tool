'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

interface ExportModalProps {
  sessionId: string
  sessionTeam?: string
  sessionSprint?: number
  onClose: () => void
}

type ModalState =
  | { type: 'loading' }
  | { type: 'guest' }
  | { type: 'no_token' }
  | { type: 'ready'; workspaceId: string; docId: string; parentPageId: string }
  | { type: 'exporting' }
  | { type: 'success'; pageUrl: string }
  | { type: 'error'; message: string }

function buildDefaultPageTitle(team?: string, sprint?: number, sessionName?: string): string {
  if (team && sprint) return `${team} Sprint ${sprint} Retro Board`
  return sessionName ?? ''
}

export default function ExportModal({ sessionId, sessionTeam, sessionSprint, onClose }: ExportModalProps) {
  const { isDark } = useTheme()

  const [state, setState] = useState<ModalState>({ type: 'loading' })
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 200)
  }
  const [workspaceId, setWorkspaceId] = useState('')
  const [docId, setDocId] = useState('')
  const [parentPageId, setParentPageId] = useState('')
  const [pageTitle, setPageTitle] = useState(() => buildDefaultPageTitle(sessionTeam, sessionSprint))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Load user settings to determine state and pre-fill fields
  useEffect(() => {
    fetch('/api/user/settings')
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          setState({ type: 'guest' })
          return
        }
        const d = await r.json()
        if (!d.clickup_token_set) {
          setState({ type: 'no_token' })
          return
        }
        const ws = d.clickup_workspace_id ?? ''
        const doc = d.clickup_doc_id ?? ''
        const parent = d.clickup_parent_page_id ?? ''
        setWorkspaceId(ws)
        setDocId(doc)
        setParentPageId(parent)
        setState({ type: 'ready', workspaceId: ws, docId: doc, parentPageId: parent })
      })
      .catch(() => setState({ type: 'error', message: 'Failed to load settings.' }))
  }, [])

  const handleExport = async () => {
    if (!workspaceId.trim() || !docId.trim()) return
    setState({ type: 'exporting' })

    try {
      const res = await fetch(`/api/sessions/${sessionId}/clickup-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId.trim(),
          doc_id: docId.trim(),
          parent_page_id: parentPageId.trim() || null,
          page_title: pageTitle.trim() || null,
        }),
      })
      const d = await res.json()

      if (res.ok && d.pageUrl) {
        setState({ type: 'success', pageUrl: d.pageUrl })
      } else {
        const msg =
          d.error === 'no_token' ? 'ClickUp token not found. Please save it in Settings.' :
          d.error === 'token_invalid' ? 'ClickUp token is invalid or expired.' :
          d.error === 'workspace_or_doc_not_found' ? 'Workspace or Doc ID not found in ClickUp.' :
          d.error === 'clickup_unreachable' ? 'Could not reach ClickUp. Check your connection.' :
          'Export failed. Please try again.'
        setState({ type: 'error', message: msg })
      }
    } catch {
      setState({ type: 'error', message: 'Network error. Please try again.' })
    }
  }

  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'}`
  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`

  const isExporting = state.type === 'exporting'
  const canExport = state.type === 'ready' && !!workspaceId.trim() && !!docId.trim()

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        role="dialog"
        aria-label="Export to ClickUp"
        className={`rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-white/60 dark:border-white/10 backdrop-blur-xl ${closing ? 'animate-modal-out' : 'animate-modal-in'} ${isDark ? 'bg-gray-900/70' : 'bg-white/80'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`font-bold text-lg ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>📤 Export to ClickUp</h2>
          <button onClick={handleClose} className={`text-2xl leading-none transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>×</button>
        </div>

        <div className="p-5">
          {/* Loading */}
          {state.type === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <div className={`text-sm animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Loading…</div>
            </div>
          )}

          {/* Guest — not logged in */}
          {state.type === 'guest' && (
            <div className="text-center py-8 space-y-4">
              <p className="text-3xl">🔒</p>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Google login required</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Sign in with Google to export retro results directly to ClickUp.
              </p>
              <Link
                href="/login"
                onClick={onClose}
                className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Sign in with Google
              </Link>
            </div>
          )}

          {/* No token configured */}
          {state.type === 'no_token' && (
            <div className="text-center py-8 space-y-4">
              <p className="text-3xl">🔑</p>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ClickUp token required</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Save your ClickUp Personal Token in Settings to enable direct export.
              </p>
              <Link
                href="/settings"
                onClick={onClose}
                className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Go to Settings
              </Link>
            </div>
          )}

          {/* Ready to export */}
          {(state.type === 'ready' || state.type === 'exporting') && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Page Title</label>
                <input
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="e.g. Frontend Sprint 42 Retro Board"
                  className={inputCls}
                  disabled={isExporting}
                />
              </div>
              <div>
                <label className={labelCls}>Workspace ID <span className="text-red-400">*</span></label>
                <input
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  placeholder="e.g. abc123456"
                  className={inputCls}
                  disabled={isExporting}
                />
              </div>
              <div>
                <label className={labelCls}>Doc ID <span className="text-red-400">*</span></label>
                <input
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="e.g. your-doc-id"
                  className={inputCls}
                  disabled={isExporting}
                />
              </div>
              <div>
                <label className={labelCls}>Parent Page ID <span className={`font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span></label>
                <input
                  value={parentPageId}
                  onChange={(e) => setParentPageId(e.target.value)}
                  placeholder="e.g. your-page-id"
                  className={inputCls}
                  disabled={isExporting}
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Pre-filled from your Settings defaults. You can edit before exporting.
              </p>
              <button
                onClick={handleExport}
                disabled={!canExport}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting…' : 'Export to ClickUp'}
              </button>
            </div>
          )}

          {/* Success */}
          {state.type === 'success' && (
            <div className="text-center py-8 space-y-4">
              <p className="text-3xl">✅</p>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Export successful!</p>
              <a
                href={state.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Open in ClickUp →
              </a>
            </div>
          )}

          {/* Error */}
          {state.type === 'error' && (
            <div className="text-center py-8 space-y-4">
              <p className="text-3xl">⚠️</p>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Export failed</p>
              <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{state.message}</p>
              <button
                onClick={() => setState({ type: 'ready', workspaceId, docId, parentPageId })}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 pb-5 ${state.type === 'success' || state.type === 'error' || state.type === 'guest' || state.type === 'no_token' ? '' : 'hidden'}`}>
          <button
            onClick={handleClose}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
