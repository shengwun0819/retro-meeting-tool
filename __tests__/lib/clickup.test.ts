/**
 * Unit tests for lib/clickup.
 *
 * buildRetroExportPayload is a pure function — no mocks needed.
 * fetchRetroExportPayload is tested with a fake Supabase client.
 */

import { buildRetroExportPayload, fetchRetroExportPayload } from '@/lib/clickup'
import type { RetroSession, StickyNote, ActionItem } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION: RetroSession = {
  id: 'sess-1',
  name: 'Q1 Retro',
  sprint_number: 42,
  start_date: '2026-05-01',
  end_date: '2026-05-14',
  created_at: '2026-05-01T00:00:00Z',
}

const SESSION_MINIMAL: RetroSession = {
  id: 'sess-2',
  name: 'Quick Retro',
  created_at: '2026-05-01T00:00:00Z',
}

function makeNote(overrides: Partial<StickyNote> = {}): StickyNote {
  return {
    id: 'note-1',
    board_id: 'board-1',
    section_id: 'continue',
    content: 'Great teamwork',
    color: '#fff',
    author_id: 'u-1',
    author_name: 'Alice',
    pos_x: 0.1,
    pos_y: 0.1,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    comments: [],
    ...overrides,
  }
}

function makeAction(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: 'ai-1',
    board_id: 'board-1',
    title: 'Write tests',
    owner_name: 'Bob',
    due_date: '2026-06-01',
    status: 'Open',
    created_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

// ─── buildRetroExportPayload ──────────────────────────────────────────────────

describe('buildRetroExportPayload — task name and tags', () => {
  it('falls back to session.name when team is absent', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.taskName).toBe('Q1 Retro')
  })

  it('uses "{team} Sprint {n} Retro Board" format when both team and sprint_number are set', () => {
    const session = { ...SESSION, team: 'Turing' }
    const payload = buildRetroExportPayload(session, [], [])
    expect(payload.taskName).toBe('Turing Sprint 42 Retro Board')
  })

  it('falls back to session.name when sprint_number is absent', () => {
    const session = { ...SESSION_MINIMAL, team: 'Turing' }
    const payload = buildRetroExportPayload(session, [], [])
    expect(payload.taskName).toBe('Quick Retro')
  })

  it('includes retro tag always', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.tags).toContain('retro')
  })

  it('includes sprint tag when sprint_number is set', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.tags).toContain('sprint-42')
  })

  it('omits sprint tag when sprint_number is absent', () => {
    const payload = buildRetroExportPayload(SESSION_MINIMAL, [], [])
    expect(payload.tags).not.toContain(expect.stringMatching(/sprint-/))
  })
})

describe('buildRetroExportPayload — session field passthrough', () => {
  it('passes session id, name, sprintNumber, dates', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.session).toEqual({
      id: 'sess-1',
      name: 'Q1 Retro',
      sprintNumber: 42,
      startDate: '2026-05-01',
      endDate: '2026-05-14',
    })
  })

  it('passes undefined for missing optional fields', () => {
    const payload = buildRetroExportPayload(SESSION_MINIMAL, [], [])
    expect(payload.session.sprintNumber).toBeUndefined()
    expect(payload.session.startDate).toBeUndefined()
    expect(payload.session.endDate).toBeUndefined()
  })
})

describe('buildRetroExportPayload — sections', () => {
  it('includes all 4 sections in order: continue, stop, invent, act', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.sections.map((s) => s.sectionId)).toEqual(['continue', 'stop', 'invent', 'act'])
  })

  it('maps notes to the correct section', () => {
    const notes = [
      makeNote({ section_id: 'continue', content: 'Good pace' }),
      makeNote({ id: 'note-2', section_id: 'stop', content: 'Too many meetings' }),
    ]
    const payload = buildRetroExportPayload(SESSION, notes, [])
    const continueSection = payload.sections.find((s) => s.sectionId === 'continue')!
    expect(continueSection.notes).toHaveLength(1)
    expect(continueSection.notes[0].content).toBe('Good pace')

    const stopSection = payload.sections.find((s) => s.sectionId === 'stop')!
    expect(stopSection.notes).toHaveLength(1)
    expect(stopSection.notes[0].content).toBe('Too many meetings')
  })

  it('includes comments nested under their note', () => {
    const notes = [
      makeNote({
        comments: [
          { id: 'c-1', sticky_note_id: 'note-1', author_id: 'u-2', author_name: 'Bob', content: 'Agreed!', created_at: '' },
        ],
      }),
    ]
    const payload = buildRetroExportPayload(SESSION, notes, [])
    const note = payload.sections[0].notes[0]
    expect(note.comments).toHaveLength(1)
    expect(note.comments[0]).toEqual({ content: 'Agreed!', author: 'Bob' })
  })

  it('sets actNotes from the act section', () => {
    const notes = [makeNote({ section_id: 'act', content: 'Ship it' })]
    const payload = buildRetroExportPayload(SESSION, notes, [])
    expect(payload.actNotes).toHaveLength(1)
    expect(payload.actNotes[0].content).toBe('Ship it')
  })
})

describe('buildRetroExportPayload — action items', () => {
  it('maps action items with all fields', () => {
    const payload = buildRetroExportPayload(SESSION, [], [makeAction()])
    expect(payload.actionItems).toHaveLength(1)
    expect(payload.actionItems[0]).toEqual({
      title: 'Write tests',
      description: undefined,
      owner: 'Bob',
      dueDate: '2026-06-01',
      status: 'Open',
    })
  })

  it('returns empty actionItems when none provided', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.actionItems).toHaveLength(0)
  })
})

describe('buildRetroExportPayload — markdownContent', () => {
  it('includes h1 heading with sprint and session name', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.markdownContent).toContain('# Sprint 42 Retrospective — Q1 Retro')
  })

  it('omits sprint from h1 when sprint_number is absent', () => {
    const payload = buildRetroExportPayload(SESSION_MINIMAL, [], [])
    expect(payload.markdownContent).toContain('# Retrospective — Quick Retro')
    expect(payload.markdownContent).not.toContain('Sprint')
  })

  it('includes period line when both dates are present', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.markdownContent).toContain('**Period:** 2026-05-01 ~ 2026-05-14')
  })

  it('omits period line when dates are absent', () => {
    const payload = buildRetroExportPayload(SESSION_MINIMAL, [], [])
    expect(payload.markdownContent).not.toContain('**Period:**')
  })

  it('shows (empty) for sections with no notes', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.markdownContent).toContain('(empty)')
  })

  it('renders note with author in italics', () => {
    const notes = [makeNote({ content: 'Great work', author_name: 'Alice' })]
    const payload = buildRetroExportPayload(SESSION, notes, [])
    expect(payload.markdownContent).toContain('- Great work *(by Alice)*')
  })

  it('renders comment indented under note', () => {
    const notes = [
      makeNote({
        content: 'Great work',
        comments: [
          { id: 'c-1', sticky_note_id: 'note-1', author_id: 'u-2', author_name: 'Bob', content: '+1', created_at: '' },
        ],
      }),
    ]
    const payload = buildRetroExportPayload(SESSION, notes, [])
    expect(payload.markdownContent).toContain('  - 💬 +1 *(by Bob)*')
  })

  it('renders Open action item as unchecked GFM checkbox with owner and due date', () => {
    const payload = buildRetroExportPayload(SESSION, [], [makeAction()])
    expect(payload.markdownContent).toContain('- [ ] Write tests *(owner: Bob, due: 2026-06-01)*')
  })

  it('renders Done action item as checked GFM checkbox', () => {
    const payload = buildRetroExportPayload(SESSION, [], [makeAction({ status: 'Done' })])
    expect(payload.markdownContent).toContain('- [x] Write tests')
  })

  it('omits meta suffix when owner and due date are absent', () => {
    const payload = buildRetroExportPayload(SESSION, [], [
      makeAction({ owner_name: undefined, due_date: undefined }),
    ])
    expect(payload.markdownContent).toContain('- [ ] Write tests')
    expect(payload.markdownContent).not.toContain('*(')
  })

  it('shows (no action items) when empty', () => {
    const payload = buildRetroExportPayload(SESSION, [], [])
    expect(payload.markdownContent).toContain('(no action items)')
  })
})

// ─── fetchRetroExportPayload ──────────────────────────────────────────────────


function makeChainedSupabase(tableResponses: Record<string, { data: unknown; error?: unknown }>): SupabaseClient {
  const from = jest.fn((table: string) => {
    const response = tableResponses[table] ?? { data: null, error: null }
    const single = jest.fn().mockResolvedValue(response)
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single,
    }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    return chain
  })
  return { from } as unknown as SupabaseClient
}

describe('fetchRetroExportPayload — error cases', () => {
  it('throws when session is not found (error returned)', async () => {
    const supabase = makeChainedSupabase({
      retro_sessions: { data: null, error: new Error('not found') },
    })
    await expect(fetchRetroExportPayload(supabase, 'sess-x')).rejects.toThrow('Session not found')
  })

  it('throws when session is not found (data is null)', async () => {
    const supabase = makeChainedSupabase({
      retro_sessions: { data: null, error: null },
    })
    await expect(fetchRetroExportPayload(supabase, 'sess-x')).rejects.toThrow('Session not found')
  })

  it('throws when board is not found', async () => {
    const supabase = makeChainedSupabase({
      retro_sessions: { data: { id: 'sess-1', name: 'Retro', created_at: '' }, error: null },
      boards: { data: null, error: null },
    })
    await expect(fetchRetroExportPayload(supabase, 'sess-1')).rejects.toThrow('Board not found')
  })
})
