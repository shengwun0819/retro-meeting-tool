import { NextRequest, NextResponse } from 'next/server'
import { requireGoogleUser } from '@/lib/apiAuth'

/**
 * POST /api/user/settings/test-token
 *
 * Validates a ClickUp Personal Token by hitting GET /api/v2/user.
 *
 * Request body: { token: string }
 *
 * Response (always 200 unless this server itself errors):
 *   { ok: true,  username: string }   — token works
 *   { ok: false, reason: 'invalid' | 'unauthorized' | 'rate_limited' | 'unknown' }
 *
 * Only the `username` field is forwarded. ClickUp's /user response also
 * includes email, color, profilePicture, and the numeric user id, none of
 * which are needed by the UI and any of which would be unnecessary
 * disclosure if logged in the browser network tab.
 */
export async function POST(req: NextRequest) {
  const auth = await requireGoogleUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const token = body && typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch('https://api.clickup.com/api/v2/user', {
      method: 'GET',
      headers: { Authorization: token },
    })
  } catch {
    return NextResponse.json({ ok: false, reason: 'unknown' })
  }

  if (res.status === 401) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' })
  }
  if (res.status === 429) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' })
  }
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: 'unknown' })
  }

  const json = (await res.json().catch(() => null)) as { user?: { username?: string } } | null
  const username = json?.user?.username
  if (!username) {
    return NextResponse.json({ ok: false, reason: 'unknown' })
  }

  return NextResponse.json({ ok: true, username })
}
