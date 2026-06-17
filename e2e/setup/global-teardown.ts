/**
 * Global teardown: remove any E2E test sessions left behind by interrupted runs.
 * Runs once after all Playwright tests finish (including Ctrl+C interruptions
 * do NOT trigger this — see note below).
 *
 * For manual cleanup after an interrupted run, run:
 *   npx playwright test --global-teardown ./e2e/setup/global-teardown.ts
 *
 * Sessions are identified by name prefix "E2E" to avoid touching real data.
 */

async function globalTeardown() {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

  let sessions: Array<{ id: string; name: string }>
  try {
    const res = await fetch(`${base}/api/sessions`)
    if (!res.ok) return
    sessions = await res.json()
  } catch {
    return
  }

  const e2eSessions = sessions.filter((s) => s.name.startsWith('E2E'))
  await Promise.all(
    e2eSessions.map((s) =>
      fetch(`${base}/api/sessions/${s.id}`, { method: 'DELETE' }).catch(() => {})
    )
  )

  if (e2eSessions.length > 0) {
    console.log(`[teardown] Cleaned up ${e2eSessions.length} E2E session(s)`)
  }
}

export default globalTeardown
