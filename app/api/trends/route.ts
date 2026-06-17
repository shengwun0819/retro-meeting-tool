import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

type Period = 'month' | 'quarter'

function getPeriodLabel(dateStr: string, period: Period): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() // 0-indexed
  if (period === 'month') {
    return `${year}-${String(month + 1).padStart(2, '0')}`
  }
  const q = Math.floor(month / 3) + 1
  return `${year} Q${q}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const team = searchParams.get('team')
  const period: Period = searchParams.get('period') === 'quarter' ? 'quarter' : 'month'

  if (!team) {
    return NextResponse.json({ error: 'team is required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Get sessions for this team (up to 24 months / 8 quarters worth)
  const { data: sessions, error: sessionError } = await supabase
    .from('retro_sessions')
    .select('id, created_at')
    .eq('team', team)
    .order('created_at', { ascending: true })
    .limit(50)

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })
  if (!sessions?.length) {
    return NextResponse.json({ team, period, periods: [] })
  }

  const sessionIds = sessions.map((s) => s.id)

  // Get boards for these sessions
  const { data: boards } = await supabase
    .from('boards')
    .select('id, session_id')
    .in('session_id', sessionIds)

  if (!boards?.length) {
    return NextResponse.json({ team, period, periods: [] })
  }

  // Map session_id → created_at for period labelling
  const sessionDateMap = new Map(sessions.map((s) => [s.id, s.created_at]))
  const boardToSession = new Map(boards.map((b) => [b.id, b.session_id]))
  const boardIds = boards.map((b) => b.id)

  // Get sticky note counts per board per section
  const { data: notes, error: notesError } = await supabase
    .from('sticky_notes')
    .select('board_id, section_id')
    .in('board_id', boardIds)

  if (notesError) return NextResponse.json({ error: notesError.message }, { status: 500 })

  // Aggregate: periodLabel → sectionId → count
  type PeriodData = { continue: number; stop: number; invent: number; act: number; sessions: number }
  const periodMap = new Map<string, PeriodData>()

  // Initialise periods from sessions (even sessions with 0 notes)
  for (const s of sessions) {
    const label = getPeriodLabel(s.created_at, period)
    if (!periodMap.has(label)) {
      periodMap.set(label, { continue: 0, stop: 0, invent: 0, act: 0, sessions: 0 })
    }
    periodMap.get(label)!.sessions += 1
  }

  for (const note of notes ?? []) {
    const sessionId = boardToSession.get(note.board_id)
    if (!sessionId) continue
    const createdAt = sessionDateMap.get(sessionId)
    if (!createdAt) continue
    const label = getPeriodLabel(createdAt, period)
    const entry = periodMap.get(label)
    if (!entry) continue
    const section = note.section_id as string
    if (section !== 'sessions' && Object.prototype.hasOwnProperty.call(entry, section)) (entry as Record<string, number>)[section] += 1
  }

  // Sort periods chronologically
  const periods = [...periodMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, counts]) => ({ label, ...counts }))

  return NextResponse.json({ team, period, periods })
}
