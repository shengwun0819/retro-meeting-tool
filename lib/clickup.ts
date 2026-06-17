import type { SupabaseClient } from '@supabase/supabase-js'
import { RetroSession, StickyNote, ActionItem } from '@/types'

/**
 * ClickUp integration uses MCP Server mode.
 *
 * This module formats retro data into a structured payload.
 * The actual ClickUp Doc Page creation is performed by Claude Code (with ClickUp MCP Server).
 *
 * Workflow:
 *   1. User clicks "Export" → frontend calls GET /api/sessions/[id]/export to get the payload
 *   2. User runs /clickup-export <session-id> in Claude Code
 *   3. Claude creates a new Page in the "retro record" Doc via ClickUp MCP Server
 */

export interface SectionNotes {
  sectionId: string
  sectionName: string
  notes: Array<{
    content: string
    author: string
    comments: Array<{ content: string; author: string }>
  }>
}

export interface RetroExportPayload {
  taskName: string
  description: string
  tags: string[]
  session: {
    id: string
    name: string
    sprintNumber?: number
    startDate?: string
    endDate?: string
  }
  sections: SectionNotes[]
  actNotes: Array<{ content: string; author: string }>
  actionItems: Array<{
    title: string
    description?: string
    owner?: string
    dueDate?: string
    status: string
  }>
  markdownContent: string
}

const SECTION_LABELS: Record<string, string> = {
  continue: 'Continue ✅',
  stop: 'Stop 🛑',
  invent: 'Invent 💡',
  act: 'Act 💪',
}

/**
 * Formats retro data into a payload for use by ClickUp MCP.
 * This function is a pure data transformation — it makes no network requests.
 */
export function buildRetroExportPayload(
  session: RetroSession,
  allNotes: StickyNote[],
  actionItems: ActionItem[]
): RetroExportPayload {
  const sprintLabel = session.sprint_number ? `Sprint ${session.sprint_number}` : ''
  const period =
    session.start_date && session.end_date
      ? `${session.start_date} ~ ${session.end_date}`
      : ''

  const sectionOrder = ['continue', 'stop', 'invent', 'act']
  const notesBySection = sectionOrder.map((sectionId) => ({
    sectionId,
    sectionName: SECTION_LABELS[sectionId] ?? sectionId,
    notes: allNotes
      .filter((n) => n.section_id === sectionId)
      .map((n) => ({
        content: n.content,
        author: n.author_name,
        comments: (n.comments ?? []).map((c) => ({ content: c.content, author: c.author_name })),
      })),
  }))

  const actNotes = notesBySection.find((s) => s.sectionId === 'act')?.notes ?? []

  // 建立完整 Markdown 內容（供寫入 ClickUp Doc Page）
  const lines: string[] = [
    `# ${sprintLabel ? sprintLabel + ' ' : ''}Retrospective — ${session.name}`,
    '',
    period ? `**Period:** ${period}` : '',
    `**Export date:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '---',
    '',
  ].filter((l) => l !== undefined)

  for (const section of notesBySection) {
    lines.push(`## ${section.sectionName}`)
    if (section.notes.length === 0) {
      lines.push('(empty)')
    } else {
      for (const n of section.notes) {
        lines.push(`- ${n.content} *(by ${n.author})*`)
        for (const c of n.comments) {
          lines.push(`  - 💬 ${c.content} *(by ${c.author})*`)
        }
      }
    }
    lines.push('')
  }

  lines.push('---', '', '## Action Items', '')
  if (actionItems.length === 0) {
    lines.push('(no action items)')
  } else {
    for (const a of actionItems) {
      const checked = a.status === 'Done' ? 'x' : ' '
      const meta: string[] = []
      if (a.owner_name) meta.push(`owner: ${a.owner_name}`)
      if (a.due_date) meta.push(`due: ${a.due_date}`)
      const suffix = meta.length ? ` *(${meta.join(', ')})*` : ''
      lines.push(`- [${checked}] ${a.title}${suffix}`)
    }
  }

  const markdownContent = lines.join('\n')

  // Plain-text description (for backwards compatibility)
  const description = [
    `## ${sprintLabel ? sprintLabel + ' ' : ''}Retrospective Summary`,
    '',
    `**Session name:** ${session.name}`,
    period ? `**Period:** ${period}` : '',
    '',
    ...notesBySection.map((s) => [
      `### ${s.sectionName}`,
      s.notes.length === 0 ? '(empty)' : s.notes.map((n) => `- ${n.content} (by ${n.author})`).join('\n'),
      '',
    ].join('\n')),
  ]
    .filter((line) => line !== undefined)
    .join('\n')

  return {
    taskName: session.team && session.sprint_number
      ? `${session.team} Sprint ${session.sprint_number} Retro Board`
      : session.name,
    description,
    tags: ['retro', ...(session.sprint_number ? [`sprint-${session.sprint_number}`] : [])],
    session: {
      id: session.id,
      name: session.name,
      sprintNumber: session.sprint_number,
      startDate: session.start_date,
      endDate: session.end_date,
    },
    sections: notesBySection,
    actNotes,
    actionItems: actionItems.map((a) => ({
      title: a.title,
      description: a.description,
      owner: a.owner_name,
      dueDate: a.due_date,
      status: a.status,
    })),
    markdownContent,
  }
}

/**
 * Loads a session's full retro data from Supabase and builds the export
 * payload. Used by both GET /api/sessions/[id]/export (Claude Code skill)
 * and POST /api/sessions/[id]/clickup-export (direct ClickUp API export).
 *
 * Throws when the session or board cannot be found.
 */
export async function fetchRetroExportPayload(
  supabase: SupabaseClient,
  sessionId: string
): Promise<RetroExportPayload> {
  const { data: session, error: sessionError } = await supabase
    .from('retro_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (sessionError || !session) throw new Error('Session not found')

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('session_id', sessionId)
    .single()
  if (!board) throw new Error('Board not found')

  const [{ data: allNotes }, { data: actionItems }] = await Promise.all([
    supabase.from('sticky_notes').select('*').eq('board_id', board.id),
    supabase.from('action_items').select('*').eq('board_id', board.id),
  ])

  const notes = allNotes ?? []
  const noteIds = notes.map((n) => n.id)
  const { data: allComments } = noteIds.length > 0
    ? await supabase
        .from('comments')
        .select('*')
        .in('sticky_note_id', noteIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const notesWithComments = notes.map((n) => ({
    ...n,
    comments: (allComments ?? []).filter((c) => c.sticky_note_id === n.id),
  }))

  return buildRetroExportPayload(session, notesWithComments, actionItems ?? [])
}
