import { NextRequest, NextResponse } from 'next/server'
import { requireGoogleUser } from '@/lib/apiAuth'
import {
  saveEncryptedClickUpToken,
  clearClickUpToken,
  updateClickUpTargets,
} from '@/lib/clickupCrypto'

/**
 * GET — return the caller's ClickUp settings.
 * The token is never returned in plaintext to avoid XSS / network-tab exposure.
 *
 * Response shape:
 *   {
 *     clickup_token_set: boolean,
 *     clickup_workspace_id: string | null,
 *     clickup_doc_id: string | null,
 *     clickup_parent_page_id: string | null,
 *   }
 */
export async function GET() {
  const auth = await requireGoogleUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('user_settings')
    .select('clickup_token_encrypted, clickup_workspace_id, clickup_doc_id, clickup_parent_page_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({
    clickup_token_set: !!data?.clickup_token_encrypted,
    clickup_workspace_id: data?.clickup_workspace_id ?? null,
    clickup_doc_id: data?.clickup_doc_id ?? null,
    clickup_parent_page_id: data?.clickup_parent_page_id ?? null,
  })
}

/**
 * PUT — save token and/or default targets.
 *
 * Body:
 *   {
 *     clickup_token?: string,           // if present, encrypted and stored
 *     clickup_workspace_id?: string,
 *     clickup_doc_id?: string,
 *     clickup_parent_page_id?: string,
 *   }
 *
 * Either token or at least one target must be provided.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireGoogleUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const token = typeof body.clickup_token === 'string' ? body.clickup_token.trim() : undefined
  const targets = {
    workspaceId: typeof body.clickup_workspace_id === 'string' ? body.clickup_workspace_id.trim() || null : (body.clickup_workspace_id === null ? null : undefined),
    docId: typeof body.clickup_doc_id === 'string' ? body.clickup_doc_id.trim() || null : (body.clickup_doc_id === null ? null : undefined),
    parentPageId: typeof body.clickup_parent_page_id === 'string' ? body.clickup_parent_page_id.trim() || null : (body.clickup_parent_page_id === null ? null : undefined),
  }

  if (token !== undefined) {
    if (token.length < 8 || !token.startsWith('pk_')) {
      return NextResponse.json({ error: 'invalid_token_format' }, { status: 400 })
    }
    try {
      await saveEncryptedClickUpToken(supabase, user.id, token, targets)
    } catch {
      return NextResponse.json({ error: 'save_failed' }, { status: 500 })
    }
  } else {
    // No token — only updating targets. Require at least one.
    const hasAnyTarget = targets.workspaceId !== undefined || targets.docId !== undefined || targets.parentPageId !== undefined
    if (!hasAnyTarget) {
      return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
    }
    try {
      await updateClickUpTargets(supabase, user.id, targets)
    } catch {
      return NextResponse.json({ error: 'save_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE — clear the token (targets are kept).
 */
export async function DELETE() {
  const auth = await requireGoogleUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  try {
    await clearClickUpToken(supabase, user.id)
  } catch {
    return NextResponse.json({ error: 'clear_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
