import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  const { data: session, error } = await supabase
    .from('retro_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('session_id', id)
    .single()

  return NextResponse.json({ session, board })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rawBody = await req.json()
  const body = rawBody && typeof rawBody === 'object' ? rawBody as Record<string, unknown> : {}
  const supabase = createServerSupabaseClient()

  const sessionUpdates: Record<string, unknown> = {}
  if ('team' in body) sessionUpdates.team = body.team || null
  if ('sprint_number' in body) sessionUpdates.sprint_number = body.sprint_number ?? null

  // Keep name in sync: "Team Sprint N Retro"
  if ('team' in sessionUpdates || 'sprint_number' in sessionUpdates) {
    const { data: existing } = await supabase.from('retro_sessions').select('team,sprint_number').eq('id', id).single()
    const t = 'team' in sessionUpdates ? (sessionUpdates.team as string) : existing?.team
    const s = 'sprint_number' in sessionUpdates ? sessionUpdates.sprint_number : existing?.sprint_number
    sessionUpdates.name = `${t ?? 'Unknown'} Sprint ${s ?? '?'} Retro`
  }

  let sessionData: unknown = null
  if (Object.keys(sessionUpdates).length > 0) {
    const { data, error } = await supabase
      .from('retro_sessions')
      .update(sessionUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sessionData = data
  }

  // Update section_config on the board if provided
  if ('section_config' in body) {
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('session_id', id)
      .single()
    if (board) {
      const { error: boardUpdateError } = await supabase
        .from('boards')
        .update({ section_config: body.section_config ?? null })
        .eq('id', board.id)
      if (boardUpdateError) return NextResponse.json({ error: boardUpdateError.message }, { status: 500 })
    }
  }

  return NextResponse.json(sessionData)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('retro_sessions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
