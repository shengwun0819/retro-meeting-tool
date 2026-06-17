import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

const VALID_STATUSES = ['pending', 'acknowledged', 'in_progress', 'done', 'wontfix']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    updates.status = body.status
  }
  if (typeof body.admin_note === 'string' || body.admin_note === null) {
    updates.admin_note = body.admin_note?.trim() || null
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feedback')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Feedback update error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ feedback: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('feedback').delete().eq('id', id)
  if (error) {
    console.error('Feedback delete error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
