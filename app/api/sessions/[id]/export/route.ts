import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { fetchRetroExportPayload } from '@/lib/clickup'

/**
 * GET /api/sessions/[id]/export
 *
 * Returns the formatted retro payload. Used by the Claude Code
 * `/clickup-export` skill (legacy MCP path) and as a building block for
 * the direct-export route.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()

  let payload
  try {
    payload = await fetchRetroExportPayload(supabase, id)
  } catch (e) {
    const msg = (e as Error).message
    const status = msg.includes('not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }

  return NextResponse.json({
    payload,
    meta: {
      sessionId: id,
      exportedAt: new Date().toISOString(),
    },
  })
}
