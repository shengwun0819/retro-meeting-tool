import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = createServerSupabaseClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('action_items')
    .insert({
      board_id: boardId,
      source_sticky_note_id: body.source_sticky_note_id,
      title: body.title,
      description: body.description,
      owner_name: body.owner_name,
      due_date: body.due_date,
      status: body.status ?? 'Open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
