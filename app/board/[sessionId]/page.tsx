import { notFound } from 'next/navigation'
import Board from '@/components/board/Board'
import { createServerSupabaseClient } from '@/lib/supabase'

interface PageProps {
  params: Promise<{ sessionId: string }>
}

async function getSessionAndBoard(sessionId: string) {
  const supabase = createServerSupabaseClient()

  const { data: session, error } = await supabase
    .from('retro_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) return null

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (!board) return null

  return { session, board }
}

export default async function BoardPage({ params }: PageProps) {
  const { sessionId } = await params
  const result = await getSessionAndBoard(sessionId)

  if (!result) return notFound()

  const { session, board } = result

  return (
    <Board
      sessionId={session.id}
      sessionName={session.name}
      team={session.team}
      sprintNumber={session.sprint_number}
      boardId={board.id}
      sectionConfig={board.section_config ?? null}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { sessionId } = await params
  const result = await getSessionAndBoard(sessionId)
  if (result) {
    const { session } = result
    return {
      title: session.sprint_number
        ? `Sprint ${session.sprint_number} Retro`
        : session.name ?? 'Retro Board',
    }
  }
  return { title: 'Retro Board' }
}
