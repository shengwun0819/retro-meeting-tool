import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('canvas_elements')
    .select('*, reactions(*), comments(*)')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })

  if (!error) return NextResponse.json(data)

  // Migration 003 not yet applied — fall back without joins
  const { data: fallback, error: fallbackError } = await supabase
    .from('canvas_elements')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })

  if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })
  return NextResponse.json(fallback)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = createServerSupabaseClient()
  const raw = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { reactions: _r, comments: _c, ...body } = raw

  const { data, error } = await supabase
    .from('canvas_elements')
    .insert({ board_id: boardId, ...body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
