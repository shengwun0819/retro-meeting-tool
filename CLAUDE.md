# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at localhost:3000
npm run build     # production build
npm run lint      # ESLint with Next.js config
npx tsc --noEmit  # TypeScript type check
npm test          # Jest unit tests (watch mode)
npm run test:ci   # Jest CI mode with coverage report
npm run test:e2e  # Playwright E2E tests (requires dev server running)
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Symmetric key for pgcrypto-encrypted ClickUp Personal Tokens.
# Generate with: openssl rand -base64 32
# Must be ≥16 chars. Do NOT rotate without re-encrypting existing rows.
CLICKUP_TOKEN_ENCRYPTION_KEY=
```

Run migrations in order against your Supabase project (SQL Editor):
1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_canvas_elements.sql`
3. `supabase/migrations/003_canvas_element_interactions.sql`
4. `supabase/migrations/004_normalize_positions.sql`
5. `supabase/migrations/005_sticky_note_formatting.sql`
6. `supabase/migrations/006_team_and_feedback.sql` — adds `team` column to `retro_sessions`; creates `feedback` table
7. `supabase/migrations/007_sticky_note_dimensions.sql` — adds width / height to sticky_notes
8. `supabase/migrations/008_guest_sessions.sql` — creates `guest_sessions` table
9. `supabase/migrations/009_drop_guest_board_id.sql` — removes unused board_id from guest_sessions
10. `supabase/migrations/010_feedback_dashboard.sql` — adds status / admin_note to `feedback`
11. `supabase/migrations/011_user_settings.sql` — creates `user_settings` with pgcrypto RPCs for ClickUp token
12. `supabase/migrations/012_fix_update_clickup_targets.sql` — fixes update_clickup_targets to use direct overwrite

## Architecture

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + pgcrypto + Realtime)

### Data Flow

All mutations go through Next.js API routes → Supabase tables → Supabase `postgres_changes` realtime events → `Board.tsx` state updates. No client-side cache or state management library; all board state lives in `useState` within `Board.tsx`.

```
User action → API route (app/api/) → Supabase DB → postgres_changes → Board.tsx setState → re-render
```

Canvas element creation uses **optimistic UI**: a `temp_${Date.now()}` prefixed ID is added to state immediately, replaced with the real DB ID on API success. `handleUpdateElement` and `handleDeleteElement` in `Board.tsx` skip API calls for `temp_` IDs.

### Key Files

- **`app/board/[sessionId]/page.tsx`** — SSR entry; fetches session + board, renders `<Board>`
- **`app/settings/page.tsx`** — Settings page for Google users: save/replace/clear ClickUp Personal Token and default export targets (workspace ID, doc ID, parent page ID)
- **`components/board/Board.tsx`** — Central state owner: sticky notes, canvas elements, action items, online users, cursors, split positions, active tool, undo/redo stack. Sets up the Supabase realtime channel (`board:${boardId}`), wraps dnd-kit `DndContext`.
- **`components/board/ResizableCanvas.tsx`** — Renders the 2×2 layout with draggable dividers. Handles all canvas drawing pointer events (`onPointerDown/Move/Up` on the root div). Uses `data-no-draw` attribute on interactive children to guard against accidental creation triggers. Exposes its container ref via `forwardRef`.
- **`components/board/CanvasElement.tsx`** — Renders text/rect/circle/arrow elements. All interaction (drag-to-move, corner-resize, double-click-to-edit) uses Pointer Events API with `window.addEventListener` to avoid conflicts with the canvas container.
- **`components/board/StickyNote.tsx`** — Uses `useDraggable` from dnd-kit. Dragging is disabled when `activeTool !== 'select'`. Supports corner resize (width + height), B/I/U text formatting (persisted via `is_bold`/`is_italic`/`is_underline` fields), and Chinese IME-safe Enter key handling (`e.nativeEvent.isComposing`).
- **`components/board/EmojiPicker.tsx`** — Full emoji picker with 8 categories (~600 emojis). Rendered inside `StickyNote.tsx` when user clicks ＋ in the reaction toolbar.
- **`components/modals/AllCommentsPanel.tsx`** — Slide-in panel (from right) showing all sticky notes that have comments, with Reply and per-comment delete buttons. Triggered from the Comments button in `Toolbar.tsx`.
- **`components/modals/ExportModal.tsx`** — ClickUp export modal. Uses a discriminated union state machine (`loading → guest | no_token | ready → exporting → success | error`). On mount, fetches `/api/user/settings` to determine auth state and pre-fill fields. Calls `POST /api/sessions/[id]/clickup-export` on submit.
- **`lib/supabase.ts`** — `getAuthClient()` (SSR-compatible browser singleton) and `createServerSupabaseClient()` (API routes/SSR). The client sets `eventsPerSecond: 10` as a server-side receive cap; cursor *sending* is throttled separately to 2 events/sec via `shouldSendCursor()` in `lib/realtimeHelpers.ts`.
- **`lib/realtimeHelpers.ts`** — Two pure utility functions: `mergeRealtimeNote(prev, newNote)` deduplicates realtime INSERT events against optimistic `temp_` notes to prevent race-condition duplicates; `shouldSendCursor(lastSentMs, nowMs, intervalMs?)` enforces the 500 ms cursor-broadcast throttle (≈2/sec) to reduce Supabase free-tier message consumption.
- **`lib/useTimerSync.ts`** — React hook that manages countdown timer state (`remaining`, `running`, `isComplete`, `selected`) and syncs it to all connected clients via realtime broadcast (`event: 'timer'`). Exposes `handleIncoming(payload)` for `Board.tsx` to call when a remote timer event arrives. Late-joiners receive drift-corrected remaining time via the `startedAt` timestamp embedded in the `start` payload.
- **`lib/apiAuth.ts`** — `requireGoogleUser()`: builds a user-scoped Supabase client from cookies and verifies the caller is a Google-authenticated user (not anonymous). Returns `{ supabase, user }` or a `NextResponse` (401/403). Used by all ClickUp-related API routes.
- **`lib/clickupCrypto.ts`** — Server-side pgcrypto helpers. Calls the four Supabase RPCs: `save_clickup_token`, `decrypt_clickup_token`, `clear_clickup_token`, `update_clickup_targets`. The symmetric key (`CLICKUP_TOKEN_ENCRYPTION_KEY`) is passed at call time and never written to disk. **Always use a user-scoped client (from `requireGoogleUser`)** — the RPCs enforce `user_id = auth.uid()` via RLS.
- **`lib/autoArrange.ts`** — Pure function `calculateAutoArrangePositions()` that computes normalized (0.0–1.0) positions for auto-arrange. Groups notes by author alphabetically into columns, wraps at section boundary.
- **`contexts/UserContext.tsx`** — Anonymous user identity (ID, name, color) stored in `sessionStorage`; set via `NicknameModal` on first visit. Also exposes `authEmail` and `authName` from Supabase Google auth.
- **`contexts/ThemeContext.tsx`** — Global Light/Dark theme. Persists to `localStorage` under `retro-theme`. Exposes `{ theme, isDark, toggleTheme }`. Applies the `dark` class to `document.documentElement` via `applyTheme()`. Initialized with a lazy `useState` initializer (reads localStorage on mount; safe for SSR via `typeof window === 'undefined'` guard).
- **`components/FeedbackButton.tsx`** — Floating feedback button (bottom-right, all pages). Opens a modal; POSTs to `/api/feedback`.
- **`components/modals/BoardSettingsModal.tsx`** — Modal to edit Sprint Number and Team from within the board. PATCHes `/api/sessions/[id]`.
- **`components/NavigationProgress.tsx`** — Top progress bar on navigation. Reads `isDark` from `ThemeContext` to switch gradient colour. Must be rendered **inside** `ThemeProvider` in `layout.tsx`.
- **`types/index.ts`** — All shared TypeScript interfaces including `CanvasElement`, `CanvasTool`, `SectionId`. `StickyNote` includes `is_bold`, `is_italic`, `is_underline` fields. `RetroSession` includes `team?: string`. `SectionConfig` includes `sectionDarkBg`.
- **`lib/constants.ts`** — `SECTION_CONFIGS` (4 sections with colors/emojis), `REACTIONS`, `NOTE_COLORS`, `USER_COLORS`.

### Realtime Channels

Single channel `board:${boardId}` with:
- `postgres_changes` for INSERT/UPDATE/DELETE on `sticky_notes`, `reactions`, `comments`, `action_items`, `canvas_elements`
- `broadcast` for cursor position updates (event: `cursor`, throttled to 2/sec via `shouldSendCursor`)
- `broadcast` for timer sync (event: `timer` — actions: `start | pause | reset | select`)
- `presence` for online user tracking

**Timer broadcast payload**:
```ts
{ action: 'start' | 'pause' | 'reset' | 'select', remaining: number, selected: number, startedAt?: number }
```
`startedAt` (Unix ms) is included on `start` so clients that receive the event late can subtract elapsed time and display the correct remaining seconds.

### Dark Mode

Theme is toggled by adding/removing the `dark` class on `<html>`. All components use Tailwind `dark:` variants.

**Critical Tailwind v4 config** — `app/globals.css` line 2:
```css
@custom-variant dark (&:where(.dark, .dark *));
```
Without this line, Tailwind v4 defaults `dark:` to `@media (prefers-color-scheme: dark)` (OS preference), making the board always dark on macOS Dark Mode regardless of the UI toggle. This one line switches it to class-based dark mode.

`ThemeProvider` (in `app/layout.tsx`) wraps the entire app. The theme toggle button lives on the homepage; within boards it's in `Toolbar.tsx` via the ⚙️ gear icon path. The `NavigationProgress` bar gradient also switches colour based on `isDark`.

### Database Tables

```
retro_sessions (+ team) → boards (1:1) → sticky_notes, action_items, canvas_elements
sticky_notes → reactions, comments
feedback (standalone, no FK)
user_settings (per Google user: encrypted clickup token + default export targets)
guest_sessions (anonymous user tracking, no FK)
```

All RLS policies are `allow_all` except `user_settings`, which enforces `user_id = auth.uid()`.

### Board Sections

Four sections in `lib/constants.ts`: `continue` (emerald), `stop` (rose), `invent` (amber), `act` (sky).

Layout in `ResizableCanvas.tsx`:
```
left/top  = continue  |  right/top  = stop
left/bot  = invent    |  right/bot  = act
```

### Notes Position Behavior

Sticky note `pos_x`/`pos_y` are **normalized fractions (0.0–1.0)** of the canvas width/height. CSS percentage positioning (`left: ${pos_x * 100}%`) makes notes appear at the same relative position on any screen size.

Positions are **only persisted to DB on explicit user drag-drop** (or auto-arrange). One visual-only adjustment happens in `Board.tsx` that does NOT write to DB:

- **Split divider change** (`useEffect` on `[splitX, splitY]`): notes in right sections shift by `dx / 100` fraction; notes in bottom sections shift by `dy / 100` fraction. This is exact because `splitX`/`splitY` are already percentages.

`migration 004_normalize_positions.sql` converts existing absolute-pixel rows to fractions using a 1440×810 reference canvas. Rows at `(0, 0)` are "unpositioned legacy" and are placed by the app on first load.

### Canvas Drawing Tools

Bottom toolbar (`BottomToolbar.tsx`) switches `activeTool` in `Board.tsx`. The tool state gates behavior in:
- `ResizableCanvas.tsx` — pointer handlers create elements when `activeTool !== 'select'`
- `StickyNote.tsx` — `useDraggable` disabled when `activeTool !== 'select'`

Drawing flow in `ResizableCanvas.tsx`:
- **arrow**: pointerDown starts `arrowStart`, pointerUp creates element if drag > 5px
- **text/rect/circle**: pointerDown starts `dragPreview`, pointerUp creates element with drag dimensions (default size if drag < 10px)

### ClickUp Export Integration

Export calls the ClickUp v3 API server-side — the plaintext token never leaves the server.

**Auth model**: only Google-authenticated users can export. `requireGoogleUser()` in `lib/apiAuth.ts` enforces this. Anonymous (guest) users receive 403.

**Token storage**: `lib/clickupCrypto.ts` wraps four Supabase RPCs that call `pgp_sym_encrypt` / `pgp_sym_decrypt` with `CLICKUP_TOKEN_ENCRYPTION_KEY`. The key is injected at call time from the server environment. **Never return the decrypted token to the client** — GET `/api/user/settings` returns only `clickup_token_set: boolean`.

**Export flow**:
1. `ExportModal` on mount fetches `GET /api/user/settings` → determines state (`guest` / `no_token` / `ready`)
2. On submit → `POST /api/sessions/[id]/clickup-export` with `{ workspace_id, doc_id, parent_page_id? }`
3. Route calls `getDecryptedClickUpToken` → builds the ClickUp v3 `POST /workspaces/{id}/docs/{docId}/pages` request
4. Returns `{ pageId, pageUrl }` on success

**Export target**: Configure your Workspace ID, Doc ID, and Parent Page ID in `/settings`. These are saved as defaults and pre-filled in the export form. The export creates a new page named `Sprint {N}` under the specified parent page.

### Testing

**Unit tests** (`__tests__/`): Jest + jsdom. See [`__tests__/README.md`](__tests__/README.md) for naming conventions, mock patterns, and guidelines.

API route tests must mock `next/server` entirely with a class-based mock so `auth instanceof NextResponse` works:
```ts
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number; _body: unknown
    constructor(body: unknown, init?: { status?: number }) { this.status = init?.status ?? 200; this._body = body }
    json() { return Promise.resolve(this._body) }
    static json(body: unknown, init?: { status?: number }) { return new MockNextResponse(body, init) }
  }
  return { NextResponse: MockNextResponse }
})
```

**Integration tests** (`__tests__/lib/clickupCrypto.integration.test.ts`): requires a real Supabase project with migrations applied and `CLICKUP_TOKEN_ENCRYPTION_KEY` set. Skipped automatically if env vars are missing.

**E2E tests** (`e2e/`): Playwright. See [`e2e/README.md`](e2e/README.md) for suite overview and setup. All `/api/user/settings` calls in `home.spec.ts` and `settings.spec.ts` are mocked via `page.route()`. The `board.spec.ts` suite creates a real Supabase session in `beforeAll` and auto-skips if Supabase env vars are absent.

### Testing Policy — After Every Development Task

After completing any new feature, screen, or bug fix, evaluate whether a test should be added using this checklist:

| Work type | Unit test | E2E test |
|-----------|-----------|----------|
| New pure function / utility (`lib/`) | **Always** | Not needed |
| New React hook with logic | **Always** (`renderHook`) | Not needed |
| New UI component | **Usually** — user interactions, edge states | If it involves a multi-step user flow |
| New API route | **Always** — happy path + auth failure + error cases | Not needed (covered by unit) |
| Bug fix | **Always** — add a test that would have caught the bug | If the bug was only reproducible end-to-end |
| Realtime / broadcast logic | **Always** — test with a mock channel ref | Only if drift/timing is critical |
| Config or infrastructure change | Usually not | Usually not |

**Rule of thumb**: if you can describe the bug or feature in one sentence, you can write one test for it. Write the test first when the logic is non-trivial.
