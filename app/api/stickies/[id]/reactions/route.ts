import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  const { user_id, user_name, emoji } = await req.json()

  // Toggle: if exists, delete; else insert
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('sticky_note_id', id)
    .eq('user_id', user_id)
    .eq('emoji', emoji)
    .single()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
    return NextResponse.json({ removed: true, emoji })
  }

  const { data, error } = await supabase
    .from('reactions')
    .insert({ sticky_note_id: id, user_id, user_name, emoji })
    .select()
    .single()

  if (error) {
    // 23505 = unique_violation: two rapid clicks raced past the select check simultaneously.
    // Treat as "already added" — return 200 so the client doesn't show an error.
    if (error.code === '23505') return NextResponse.json({ emoji })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
