import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { content, userId, authorName } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      content: content.trim(),
      user_id: userId ?? null,
      author_name: authorName?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Feedback insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feedback: data })
}

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Feedback list error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feedback: data ?? [] })
}
