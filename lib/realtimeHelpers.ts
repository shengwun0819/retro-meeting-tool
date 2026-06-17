import type { StickyNote } from '@/types'

/**
 * Merges a new sticky note received from a Supabase realtime INSERT event into
 * the current notes array, handling two edge cases:
 *
 * 1. Exact-ID duplicate — the real note is already in state (e.g. a previous
 *    realtime delivery). Return prev unchanged.
 *
 * 2. Optimistic-temp collision — the local author has a `temp_` placeholder in
 *    state that represents the same in-flight note. Replace the OLDEST matching
 *    temp entry in-place (preserving its visual position) so rapid multi-note
 *    creation doesn't cause a flash-of-deletion: only one temp is consumed per
 *    arriving DB row, leaving sibling temp notes untouched until their own rows
 *    arrive.
 */
export function mergeRealtimeNote(
  prev: StickyNote[],
  newNote: StickyNote,
): StickyNote[] {
  if (prev.some(x => x.id === newNote.id)) return prev

  // Find the oldest temp placeholder for this author+section (first in array).
  const tempIndex = prev.findIndex(
    x => x.id.startsWith('temp_') &&
      x.author_id === newNote.author_id &&
      x.section_id === newNote.section_id,
  )

  if (tempIndex === -1) {
    return [...prev, { ...newNote, reactions: [], comments: [] }]
  }

  // Replace only the matched temp entry, preserving position and sibling temps.
  const result = [...prev]
  result[tempIndex] = { ...newNote, reactions: [], comments: [] }
  return result
}

/**
 * Returns true when enough time has passed since the last cursor broadcast.
 * Extracted so the throttle interval can be tested without DOM timers.
 */
export function shouldSendCursor(lastSentMs: number, nowMs: number, intervalMs = 500): boolean {
  return nowMs - lastSentMs >= intervalMs
}
