'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import AccountMenu from '@/components/AccountMenu'

interface UserSettings {
  clickup_token_set: boolean
  clickup_workspace_id: string | null
  clickup_doc_id: string | null
  clickup_parent_page_id: string | null
}

function Popover({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="ml-1.5 text-gray-400 hover:text-blue-500 transition-colors align-middle"
        aria-label="Help"
      >
        ⓘ
      </button>
      {open && (
        <div className="absolute z-50 left-6 top-0 w-72 rounded-xl shadow-xl border p-3 text-xs bg-white/60 dark:bg-gray-900/70 backdrop-blur-xl border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-200">
          {content}
        </div>
      )}
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { isDark } = useTheme()

  const [loading, setLoading] = useState(true)
  const [isGoogle, setIsGoogle] = useState(false)

  const [tokenSet, setTokenSet] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testUsername, setTestUsername] = useState('')
  const [testError, setTestError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [removing, setRemoving] = useState(false)

  const [workspaceId, setWorkspaceId] = useState('')
  const [docId, setDocId] = useState('')
  const [parentPageId, setParentPageId] = useState('')
  const [savingTargets, setSavingTargets] = useState(false)
  const [targetsMsg, setTargetsMsg] = useState('')

  // Load current settings + auth check
  useEffect(() => {
    fetch('/api/user/settings')
      .then(async r => {
        if (r.status === 401) { setIsGoogle(false); setLoading(false); return }
        if (r.status === 403) { setIsGoogle(false); setLoading(false); return }
        const d: UserSettings = await r.json()
        setIsGoogle(true)
        setTokenSet(d.clickup_token_set)
        setWorkspaceId(d.clickup_workspace_id ?? '')
        setDocId(d.clickup_doc_id ?? '')
        setParentPageId(d.clickup_parent_page_id ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const testToken = async () => {
    const t = tokenInput.trim()
    if (!t) return
    setTestStatus('testing')
    setTestUsername('')
    setTestError('')
    try {
      const res = await fetch('/api/user/settings/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      })
      const d = await res.json()
      if (d.ok) {
        setTestStatus('ok')
        setTestUsername(d.username)
      } else {
        setTestStatus('error')
        setTestError(
          d.reason === 'unauthorized' ? 'Token invalid or expired.' :
          d.reason === 'rate_limited' ? 'ClickUp rate limit hit, try again shortly.' :
          'Could not verify token.'
        )
      }
    } catch {
      setTestStatus('error')
      setTestError('Network error.')
    }
  }

  const saveToken = async () => {
    const t = tokenInput.trim()
    if (!t) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clickup_token: t }),
      })
      const d = await res.json()
      if (d.ok) {
        setTokenSet(true)
        setSaveMsg('Token saved.')
      } else {
        setSaveMsg(d.error === 'invalid_token_format' ? 'Token must start with pk_.' : 'Save failed.')
      }
    } catch {
      setSaveMsg('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const removeToken = async () => {
    setRemoving(true)
    setSaveMsg('')
    try {
      await fetch('/api/user/settings', { method: 'DELETE' })
      setTokenSet(false)
      setTokenInput('')
      setShowToken(false)
      setTestStatus('idle')
      setSaveMsg('Token removed.')
    } catch {
      setSaveMsg('Network error.')
    } finally {
      setRemoving(false)
    }
  }

  const saveTargets = async () => {
    setSavingTargets(true)
    setTargetsMsg('')
    try {
      const body: Record<string, string | null> = {
        clickup_workspace_id: workspaceId.trim() || null,
        clickup_doc_id: docId.trim() || null,
        clickup_parent_page_id: parentPageId.trim() || null,
      }
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      setTargetsMsg(d.ok ? 'Defaults saved.' : 'Save failed.')
    } catch {
      setTargetsMsg('Network error.')
    } finally {
      setSavingTargets(false)
    }
  }

  const cardCls = `rounded-2xl shadow-lg border p-6 backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/40 border-gray-200/60'}`
  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'}`
  const labelCls = `block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`
  const btnPrimary = `px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed`
  const btnSecondary = `px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`

  return (
    <div className="theme-transition min-h-screen flex flex-col items-center p-6 relative animate-fade-in overflow-x-hidden">
      {/* Background */}
      <div
        className="absolute inset-y-0 left-0 w-screen -z-10 transition-opacity duration-500 ease-in-out opacity-100 dark:opacity-0"
        style={{ backgroundImage: `url('/bg-light.png')`, backgroundSize: '100vw auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'top center', filter: 'blur(6px)', transform: 'scale(1.03)' }}
      />
      <div
        className="absolute inset-y-0 left-0 w-screen -z-10 transition-opacity duration-500 ease-in-out opacity-0 dark:opacity-100"
        style={{ backgroundImage: `url('/bg-dark.png')`, backgroundSize: '100vw auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'top center', filter: 'blur(6px)', transform: 'scale(1.03)' }}
      />
      <div className="absolute inset-y-0 left-0 w-screen -z-10 transition-colors duration-500 bg-white/25 dark:bg-black/60" />
      <div className="fixed top-4 right-4 z-20">
        <AccountMenu />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="flex items-center mb-6 mt-2">
          <Link href="/" className={`text-sm font-medium ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            <strong>← Back to Home</strong>
          </Link>
        </div>

        <header className="mb-6">
          <h1 className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>⚙️ Settings</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage your ClickUp integration settings.</p>
        </header>

        {loading ? (
          <div className={`${cardCls} animate-pulse`}>
            <div className={`h-4 rounded w-48 mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-10 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>
        ) : !isGoogle ? (
          /* Google login guard */
          <div className={`${cardCls} text-center py-12`}>
            <p className="text-4xl mb-4">🔒</p>
            <p className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Google login required</p>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Settings are only available to Google-authenticated users.
            </p>
            <Link href="/login" className={`${btnPrimary} inline-block`}>Sign in with Google</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ClickUp Personal Token */}
            <div className={cardCls}>
              <h2 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                ClickUp Personal Token
              </h2>

              <div className="space-y-3">
                <div>
                  <label className={labelCls}>
                    <span className="flex items-center gap-2">
                      Personal Token
                      {tokenSet && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          ✓ Saved
                        </span>
                      )}
                    </span>
                    <Popover content={
                      <div className="space-y-2">
                        <p className="font-semibold">How to get your ClickUp Personal Token</p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-300">
                          <li>Go to ClickUp → click your avatar (bottom-left)</li>
                          <li>Select <strong>My Settings</strong></li>
                          <li>Scroll to <strong>Apps</strong> section</li>
                          <li>Click <strong>Generate</strong> under Personal API Token</li>
                          <li>Copy the token starting with <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">pk_</code></li>
                        </ol>
                      </div>
                    }>{null}</Popover>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={tokenInput}
                      onChange={e => { setTokenInput(e.target.value); setTestStatus('idle') }}
                      placeholder={tokenSet ? 'Paste a new token to replace…' : 'pk_xxxxxxxx…'}
                      className={`${inputCls} pr-10`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      tabIndex={-1}
                      aria-label={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {tokenSet && !tokenInput && (
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Token is stored securely and cannot be retrieved. Paste a new token above only if you want to replace it.
                    </p>
                  )}
                </div>

                {/* Test result */}
                {testStatus === 'ok' && (
                  <p className={`text-sm px-3 py-2 rounded-xl ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
                    ✓ Connected as <strong>{testUsername}</strong>
                  </p>
                )}
                {testStatus === 'error' && (
                  <p className={`text-sm px-3 py-2 rounded-xl ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                    ✗ {testError}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={testToken}
                    disabled={!tokenInput.trim() || testStatus === 'testing'}
                    className={btnSecondary}
                  >
                    {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
                  </button>
                  <button
                    onClick={saveToken}
                    disabled={!tokenInput.trim() || saving}
                    className={btnPrimary}
                  >
                    {saving ? 'Saving…' : 'Save Token'}
                  </button>
                  {tokenSet && (
                    <button
                      onClick={removeToken}
                      disabled={removing}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${isDark ? 'border-red-800 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                    >
                      {removing ? 'Removing…' : 'Remove Token'}
                    </button>
                  )}
                </div>

                {saveMsg && (
                  <p className={`text-sm ${saveMsg.includes('aved') || saveMsg.includes('emoved') ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                    {saveMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Default Export Targets */}
            <div className={cardCls}>
              <h2 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Default Export Targets
              </h2>
              <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Pre-fill these IDs so you don&apos;t need to enter them every time you export.
              </p>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>
                    Workspace ID
                    <Popover content={
                      <div className="space-y-1">
                        <p className="font-semibold">Finding Workspace ID</p>
                        <p className="text-gray-600 dark:text-gray-300">In your ClickUp URL:</p>
                        <code className="block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">
                          app.clickup.com/<strong>YOUR_WORKSPACE_ID</strong>/home
                        </code>
                        <p className="text-gray-600 dark:text-gray-300">The number after the domain is your Workspace ID.</p>
                      </div>
                    }>{null}</Popover>
                  </label>
                  <input
                    value={workspaceId}
                    onChange={e => setWorkspaceId(e.target.value)}
                    placeholder="e.g. abc123456"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Doc ID
                    <Popover content={
                      <div className="space-y-1">
                        <p className="font-semibold">Finding Doc ID</p>
                        <p className="text-gray-600 dark:text-gray-300">Open the ClickUp Doc, look at the URL:</p>
                        <code className="block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">
                          app.clickup.com/…/v/dc/<strong>YOUR_DOC_ID</strong>/your-page-id
                        </code>
                        <p className="text-gray-600 dark:text-gray-300">The first ID after <code>/dc/</code> is the Doc ID.</p>
                      </div>
                    }>{null}</Popover>
                  </label>
                  <input
                    value={docId}
                    onChange={e => setDocId(e.target.value)}
                    placeholder="e.g. your-doc-id"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Parent Page ID
                    <span className={`ml-1.5 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
                    <Popover content={
                      <div className="space-y-1">
                        <p className="font-semibold">Finding Parent Page ID</p>
                        <p className="text-gray-600 dark:text-gray-300">Open the ClickUp Doc page you want as parent, look at the URL:</p>
                        <code className="block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">
                          app.clickup.com/…/v/dc/your-doc-id/<strong>YOUR_PARENT_PAGE_ID</strong>
                        </code>
                        <p className="text-gray-600 dark:text-gray-300">The second ID after <code>/dc/</code> is the Page ID. If omitted, pages are created at the doc root.</p>
                      </div>
                    }>{null}</Popover>
                  </label>
                  <input
                    value={parentPageId}
                    onChange={e => setParentPageId(e.target.value)}
                    placeholder="e.g. your-page-id"
                    className={inputCls}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={saveTargets}
                    disabled={savingTargets}
                    className={btnPrimary}
                  >
                    {savingTargets ? 'Saving…' : 'Save Defaults'}
                  </button>
                  {targetsMsg && (
                    <p className={`text-sm ${targetsMsg === 'Defaults saved.' ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                      {targetsMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
