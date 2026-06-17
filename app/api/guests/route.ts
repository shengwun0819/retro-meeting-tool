import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('guest_sessions')
      .insert({ name: name.trim() })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to record guest' }, { status: 500 })
  }
}
