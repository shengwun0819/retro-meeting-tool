import { NextRequest, NextResponse } from 'next/server'
import { requireGoogleUser } from '@/lib/apiAuth'
import { getDecryptedClickUpToken } from '@/lib/clickupCrypto'
import { fetchRetroExportPayload } from '@/lib/clickup'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/sessions/[id]/clickup-export
 *
 * Body:
 *   {
 *     workspace_id: string,
 *     doc_id: string,
 *     parent_page_id?: string,   // when omitted, ClickUp creates the page
 *                                // at the doc root (rendered as a sibling
 *                                // of the doc itself in the ClickUp UI)
 *   }
 *
 * Behaviour:
 *   1. Reject non-Google callers (guests / unauthenticated).
 *   2. Decrypt the caller's stored ClickUp token. If none → 400 "no_token".
 *   3. Build the markdown payload from this retro session.
 *   4. Call POST /api/v3/workspaces/{wid}/docs/{did}/pages with
 *      content_format: "text/md".
 *   5. Forward { pageId, pageUrl } on success; map ClickUp errors to a
 *      neutral shape that doesn't leak ClickUp's response body verbatim.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireGoogleUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const { id: sessionId } = await params
  const body = await req.json().catch(() => null)
  const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
  const docId = typeof body?.doc_id === 'string' ? body.doc_id.trim() : ''
  const parentPageId = typeof body?.parent_page_id === 'string' && body.parent_page_id.trim()
    ? body.parent_page_id.trim()
    : null
  const pageTitle = typeof body?.page_title === 'string' && body.page_title.trim()
    ? body.page_title.trim()
    : null

  if (!workspaceId || !docId) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // 1. Get caller's ClickUp token
  let token: string | null
  try {
    token = await getDecryptedClickUpToken(supabase, user.id)
  } catch {
    return NextResponse.json({ error: 'token_lookup_failed' }, { status: 500 })
  }
  if (!token) {
    return NextResponse.json({ error: 'no_token' }, { status: 400 })
  }

  // 2. Build markdown payload (uses service-role for cross-table reads —
  // the export data isn't user-scoped, it's per-session)
  const adminSupabase = createServerSupabaseClient()

  let payload
  try {
    payload = await fetchRetroExportPayload(adminSupabase, sessionId)
  } catch (e) {
    const msg = (e as Error).message
    const status = msg.includes('not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }

  // 3. Call ClickUp v3 — create page in the target doc
  const pageBody: Record<string, unknown> = {
    name: pageTitle ?? payload.taskName,
    content: payload.markdownContent,
    content_format: 'text/md',
  }
  if (parentPageId) pageBody.parent_page_id = parentPageId

  let res: Response
  try {
    res = await fetch(
      `https://api.clickup.com/api/v3/workspaces/${encodeURIComponent(workspaceId)}/docs/${encodeURIComponent(docId)}/pages`,
      {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify(pageBody),
      }
    )
  } catch {
    return NextResponse.json({ error: 'clickup_unreachable' }, { status: 502 })
  }

  if (res.status === 401) {
    return NextResponse.json({ error: 'token_invalid' }, { status: 401 })
  }
  if (res.status === 404) {
    return NextResponse.json({ error: 'workspace_or_doc_not_found' }, { status: 404 })
  }
  if (!res.ok) {
    return NextResponse.json({ error: 'clickup_error', status: res.status }, { status: 502 })
  }

  const created = (await res.json().catch(() => null)) as { id?: string } | null
  if (!created?.id) {
    return NextResponse.json({ error: 'clickup_unexpected_response' }, { status: 502 })
  }

  const pageUrl = `https://app.clickup.com/${workspaceId}/v/dc/${docId}/${created.id}`
  return NextResponse.json({ pageId: created.id, pageUrl })
}
