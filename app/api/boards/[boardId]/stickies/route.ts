import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sticky_notes')
    .select('*, reactions(*), comments(*)')
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
    .from('sticky_notes')
    .insert({
      board_id: boardId,
      section_id: body.section_id,
      content: body.content ?? '',
      color: body.color,
      author_id: body.author_id,
      author_name: body.author_name,
      pos_x: body.pos_x ?? 0,
      pos_y: body.pos_y ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
