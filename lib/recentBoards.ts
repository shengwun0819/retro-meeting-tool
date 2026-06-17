const KEY = 'retro-recent-boards'
const MAX = 10

interface RecentEntry {
  id: string
  visitedAt: string
}

export function recordBoardVisit(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getEntries()
    const filtered = existing.filter((e) => e.id !== id)
    const updated: RecentEntry[] = [{ id, visitedAt: new Date().toISOString() }, ...filtered].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable (private mode, storage full, etc.)
  }
}

export function getRecentBoardIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return getEntries().map((e) => e.id)
  } catch {
    return []
  }
}

function getEntries(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
