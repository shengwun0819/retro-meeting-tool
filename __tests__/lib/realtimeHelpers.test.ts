import { mergeRealtimeNote, shouldSendCursor } from '@/lib/realtimeHelpers'
import type { StickyNote } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNote(overrides: Partial<StickyNote> = {}): StickyNote {
  return {
    id: 'note-1',
    board_id: 'board-1',
    section_id: 'continue',
    content: 'hello',
    color: '#fff',
    author_id: 'user-1',
    author_name: 'Alice',
    pos_x: 0.1,
    pos_y: 0.2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    reactions: [],
    comments: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// mergeRealtimeNote
// ---------------------------------------------------------------------------

describe('mergeRealtimeNote', () => {
  describe('no-op cases', () => {
    it('returns prev unchanged when the real note ID is already present', () => {
      const existing = makeNote({ id: 'note-abc' })
      const incoming = makeNote({ id: 'note-abc' })
      const prev = [existing]
      const result = mergeRealtimeNote(prev, incoming)
      expect(result).toBe(prev) // same array reference — no allocation on no-op
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('note-abc')
    })
  })

  describe('normal insert (no temp_ in state)', () => {
    it('appends the new note and seeds empty reactions/comments', () => {
      const existing = makeNote({ id: 'note-existing' })
      const incoming = makeNote({ id: 'note-new', author_id: 'user-2', reactions: undefined, comments: undefined })
      const result = mergeRealtimeNote([existing], incoming as StickyNote)
      expect(result).toHaveLength(2)
      const added = result.find(n => n.id === 'note-new')!
      expect(added.reactions).toEqual([])
      expect(added.comments).toEqual([])
    })
  })

  describe('race condition: temp_ note from the same author', () => {
    it('replaces the temp_ entry with the confirmed DB row', () => {
      const tempNote = makeNote({ id: 'temp_1700000000000', section_id: 'continue', author_id: 'user-1' })
      const dbNote = makeNote({ id: 'note-real-uuid', section_id: 'continue', author_id: 'user-1' })
      const result = mergeRealtimeNote([tempNote], dbNote)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('note-real-uuid')
    })

    it('does NOT remove a temp_ note from a different author', () => {
      const otherTemp = makeNote({ id: 'temp_999', section_id: 'continue', author_id: 'user-2' })
      const dbNote = makeNote({ id: 'note-real', section_id: 'continue', author_id: 'user-1' })
      const result = mergeRealtimeNote([otherTemp], dbNote)
      expect(result).toHaveLength(2)
      expect(result.map(n => n.id)).toContain('temp_999')
      expect(result.map(n => n.id)).toContain('note-real')
    })

    it('does NOT remove a temp_ note from the same author in a different section', () => {
      const tempInStop = makeNote({ id: 'temp_111', section_id: 'stop', author_id: 'user-1' })
      const dbNoteInContinue = makeNote({ id: 'note-real', section_id: 'continue', author_id: 'user-1' })
      const result = mergeRealtimeNote([tempInStop], dbNoteInContinue)
      expect(result).toHaveLength(2)
      expect(result.map(n => n.id)).toContain('temp_111')
      expect(result.map(n => n.id)).toContain('note-real')
    })

    it('preserves other non-temp notes from the same author', () => {
      const existingReal = makeNote({ id: 'note-old', author_id: 'user-1', section_id: 'continue' })
      const tempNote = makeNote({ id: 'temp_123', author_id: 'user-1', section_id: 'continue' })
      const dbNote = makeNote({ id: 'note-new', author_id: 'user-1', section_id: 'continue' })
      const result = mergeRealtimeNote([existingReal, tempNote], dbNote)
      expect(result).toHaveLength(2)
      expect(result.map(n => n.id)).toContain('note-old')
      expect(result.map(n => n.id)).toContain('note-new')
      expect(result.map(n => n.id)).not.toContain('temp_123')
    })

    it('only replaces the OLDEST temp_ when multiple temps exist for same author+section (rapid creation)', () => {
      // User rapidly creates 2 notes in the same section — 2 temp_ placeholders in state.
      // First DB row arrives: should replace temp_1 only, leaving temp_2 visible.
      const temp1 = makeNote({ id: 'temp_1000', author_id: 'user-1', section_id: 'continue' })
      const temp2 = makeNote({ id: 'temp_1001', author_id: 'user-1', section_id: 'continue' })
      const dbNote1 = makeNote({ id: 'note-real-1', author_id: 'user-1', section_id: 'continue' })
      const result = mergeRealtimeNote([temp1, temp2], dbNote1)
      // Still 2 items: temp_2 stays, temp_1 replaced by real note
      expect(result).toHaveLength(2)
      expect(result.map(n => n.id)).toContain('note-real-1')
      expect(result.map(n => n.id)).toContain('temp_1001')
      expect(result.map(n => n.id)).not.toContain('temp_1000')
    })

    it('replaces temp_ in-place (preserves array position)', () => {
      // The confirmed note should appear at the same index as the temp_ it replaced.
      const noteA = makeNote({ id: 'note-a', author_id: 'user-2', section_id: 'continue' })
      const tempNote = makeNote({ id: 'temp_500', author_id: 'user-1', section_id: 'continue' })
      const noteB = makeNote({ id: 'note-b', author_id: 'user-3', section_id: 'continue' })
      const dbNote = makeNote({ id: 'note-real', author_id: 'user-1', section_id: 'continue' })
      const result = mergeRealtimeNote([noteA, tempNote, noteB], dbNote)
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('note-a')
      expect(result[1].id).toBe('note-real') // replaced in-place at index 1
      expect(result[2].id).toBe('note-b')
    })

    it('seeds empty reactions and comments on the confirmed row', () => {
      const tempNote = makeNote({ id: 'temp_456', author_id: 'user-1', section_id: 'stop' })
      const dbNote = makeNote({ id: 'note-real', author_id: 'user-1', section_id: 'stop', reactions: undefined, comments: undefined })
      const result = mergeRealtimeNote([tempNote], dbNote as StickyNote)
      expect(result[0].reactions).toEqual([])
      expect(result[0].comments).toEqual([])
    })
  })

  describe('empty state', () => {
    it('handles an empty prev array', () => {
      const dbNote = makeNote({ id: 'note-1' })
      const result = mergeRealtimeNote([], dbNote)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('note-1')
    })
  })
})

// ---------------------------------------------------------------------------
// shouldSendCursor
// ---------------------------------------------------------------------------

describe('shouldSendCursor', () => {
  it('returns true when no cursor has been sent yet (lastSent = 0)', () => {
    expect(shouldSendCursor(0, 1000)).toBe(true)
  })

  it('returns false when called within the throttle interval', () => {
    const lastSent = 1000
    expect(shouldSendCursor(lastSent, 1000 + 499)).toBe(false)
    expect(shouldSendCursor(lastSent, 1000 + 499, 500)).toBe(false)
  })

  it('returns true exactly at the throttle boundary', () => {
    const lastSent = 1000
    expect(shouldSendCursor(lastSent, 1000 + 500)).toBe(true)
  })

  it('returns true after the throttle interval has elapsed', () => {
    const lastSent = 1000
    expect(shouldSendCursor(lastSent, 2000)).toBe(true)
  })

  it('respects a custom intervalMs', () => {
    expect(shouldSendCursor(0, 99, 100)).toBe(false)
    expect(shouldSendCursor(0, 100, 100)).toBe(true)
    expect(shouldSendCursor(0, 249, 250)).toBe(false)
    expect(shouldSendCursor(0, 250, 250)).toBe(true)
  })

  it('default interval is 500 ms (2 events/sec)', () => {
    // Verify the default matches our Supabase free-tier throttle target
    expect(shouldSendCursor(0, 499)).toBe(false)
    expect(shouldSendCursor(0, 500)).toBe(true)
  })
})
