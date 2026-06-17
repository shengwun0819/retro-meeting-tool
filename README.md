# Retro Board

A real-time Sprint retrospective tool built for agile teams. Sign in and share the link to collaborate instantly.

## Features

### Whiteboard & Sticky Notes
- **Resizable 2×2 board**: Continue / Stop / Invent / Act (CSIA framework). Drag the dividers to resize sections — sticky notes follow along.
- **Sticky notes**: Create, inline-edit (double-click), delete (Delete key or trash icon), drag across sections, change color and font size, resize by dragging corners.
- **Text formatting**: Bold (B), Italic (I), Underline (U) buttons in the hover toolbar — persisted to DB.
- **Emoji reactions**: 👍 ❤️ 😂 🎉 🤔 quick picks + ＋ button opens a full emoji picker (8 categories) with optimistic updates.
- **Delete confirmation**: Deleting a board requires typing `Delete {board_name}` in the confirmation dialog.
- **Comments**: Each sticky note supports a threaded comment panel.
- **Action items**: Create trackable action items from sticky notes (Open → InProgress → Done).

### Canvas Drawing Tools (bottom toolbar)
- **Select tool**: Click, move, and resize elements (drag corners).
- **Text box**: Type text, double-click to edit.
- **Rectangle / Circle**: Drag to set size, double-click to add text.
- **Arrow**: Drag to draw, with endpoint preview.
- All elements support style customization (fill, border, text color, font size) and can be deleted with the Delete key.

### Collaboration
- **Real-time sync**: Sticky notes, canvas elements, and the countdown timer sync across users via Supabase Realtime.
- **Live cursors**: See all online members' cursor positions and nicknames.
- **Online members list**: Shows avatar chips for current users (up to 5 shown).
- **Identity**: After signing in, enter a nickname on the board — nickname and color are stored in sessionStorage.

### Other
- **Timer**: 3 / 5 / 10 minute countdown synced across all connected clients via realtime broadcast. Late joiners receive drift-corrected remaining time. Urgent alert flashes when time is up.
- **Undo / Redo**: Full sticky note history (Cmd+Z / Cmd+Shift+Z).
- **Board sidebar**: Switch between all boards without returning to the home page.
- **Export to ClickUp**: Google-authenticated users can export all four sections directly to a ClickUp Doc page from the board toolbar. Requires saving a ClickUp Personal Token in Settings first.
- **Share link**: One-click copy of the board URL.
- **Responsive**: Bottom toolbar scrolls horizontally on small screens.
- **Dark / Light theme**: Toggle in the top-right corner; persisted to localStorage and applied across all pages.
- **Board settings**: ⚙️ button in the toolbar — edit Team and Sprint Number from within the board.
- **Feedback button**: Floating 💬 Feedback button on all pages.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + pgcrypto) |
| Realtime | Supabase Realtime (postgres_changes + broadcast + presence) |
| Auth | Supabase Auth (Google OAuth + anonymous) |
| Drag & Drop | @dnd-kit |
| Analytics | @vercel/analytics |
| Deployment | Vercel |

## Tools & Services

### Vercel
- **Purpose**: Deployment platform for Next.js (static pages + Serverless Functions)
- **Production URL**: your own Vercel deployment (e.g. `https://your-project.vercel.app`)

### Supabase
- **Purpose**: PostgreSQL database + real-time collaboration + user authentication
- **PostgreSQL**: Stores all application data (sessions, boards, sticky notes, canvas elements, user settings, etc.)
- **pgcrypto**: Encrypts ClickUp Personal Tokens at rest using `pgp_sym_encrypt` with a server-side symmetric key
- **Realtime**: Multi-user sync via postgres_changes, broadcast, and presence
- **Auth**: Google OAuth for authenticated users; anonymous sign-in for guests

### ClickUp
- **Purpose**: Export retrospective data to ClickUp Docs after each session
- **How it works**: Google-authenticated users save their ClickUp Personal Token in `/settings`. On export, the board calls `POST /api/sessions/[id]/clickup-export` which calls the ClickUp v3 API server-side. The token is stored encrypted in Supabase and never returned to the browser in plaintext.
- **Requirement**: Google login required (guests cannot use this feature)

### @vercel/analytics
- **Purpose**: Automatically tracks page views and Web Vitals (LCP, FID, CLS)
- **View data**: Vercel Dashboard → Analytics tab

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, region, and strong database password — save the password somewhere safe
3. Wait for the project to finish provisioning (~1 min)

#### 1a. Run database migrations

In the Supabase Dashboard → **SQL Editor**, run the following files **in order** (paste each file's content and click Run):

1. `supabase/migrations/001_initial.sql` — creates sessions, boards, sticky_notes, reactions, comments, action_items
2. `supabase/migrations/002_canvas_elements.sql` — creates canvas_elements (text, rect, circle, arrow)
3. `supabase/migrations/003_canvas_element_interactions.sql` — reactions and comments on canvas elements
4. `supabase/migrations/004_normalize_positions.sql` — normalizes sticky note positions (absolute pixels → 0.0–1.0 fractions)
5. `supabase/migrations/005_sticky_note_formatting.sql` — adds text formatting columns (is_bold / is_italic / is_underline)
6. `supabase/migrations/006_team_and_feedback.sql` — adds `team` column to `retro_sessions`; creates `feedback` table
7. `supabase/migrations/007_sticky_note_dimensions.sql` — adds width / height columns to sticky_notes
8. `supabase/migrations/008_guest_sessions.sql` — creates `guest_sessions` table for anonymous user tracking
9. `supabase/migrations/009_drop_guest_board_id.sql` — removes unused board_id from guest_sessions
10. `supabase/migrations/010_feedback_dashboard.sql` — adds user_id / author_name / status / admin_note / updated_at to `feedback`
11. `supabase/migrations/011_user_settings.sql` — creates `user_settings` table with encrypted ClickUp Personal Token storage and pgcrypto RPCs (`save_clickup_token`, `decrypt_clickup_token`, `clear_clickup_token`, `update_clickup_targets`). **pgcrypto is enabled automatically by this migration.**
12. `supabase/migrations/012_fix_update_clickup_targets.sql` — fixes `update_clickup_targets` RPC to use direct overwrite instead of COALESCE

All RLS policies are `allow_all`. Access is controlled at the application layer via Supabase Auth.

#### 1b. Enable Google OAuth

1. Supabase Dashboard → **Authentication** → **Providers** → **Google** → toggle **Enable**
2. Create a Google OAuth app in [Google Cloud Console](https://console.cloud.google.com/):
   - APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application
   - Authorized redirect URIs → add: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy **Client ID** and **Client Secret** from Google Cloud Console → paste into Supabase Google provider settings
4. Save

#### 1c. Collect Supabase credentials

Supabase Dashboard → **Project Settings** → **API**:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — keep this secret, server-side only |

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Symmetric key used to encrypt/decrypt ClickUp Personal Tokens stored in user_settings.
# Generate with: openssl rand -base64 32
# Must be ≥16 chars. Do NOT rotate this key without re-encrypting existing rows first.
CLICKUP_TOKEN_ENCRYPTION_KEY=your-generated-key
```

Generate the encryption key:

```bash
openssl rand -base64 32
```

### 3. Run Locally

```bash
npm ci      # use npm ci (not npm install) to strictly respect package-lock.json
npm run dev
# Open http://localhost:3000
```

## Common Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm run lint        # ESLint check
npx tsc --noEmit    # TypeScript type check
npm test            # Jest unit tests (watch mode)
npm run test:ci     # Jest CI mode with coverage report
npm run test:e2e    # Playwright E2E tests (requires dev server running)
```

## Versioning

Version is tracked in `package.json`. Follow [Semantic Versioning](https://semver.org/) — bump the version on every PR that changes user-facing behavior or the data schema:

| Change type | Example | Bump |
|---|---|---|
| New feature | Add canvas arrow tool, add ClickUp export | **minor** `1.0.0 → 1.1.0` |
| Bug fix or backward-compatible UI/UX tweak | Fix cursor jitter, adjust colors | **patch** `1.1.0 → 1.1.1` |
| Breaking change (destructive migration, removed feature, non-backward-compatible API change) | Rename `pos_x` column, remove a section | **major** `1.1.1 → 2.0.0` |

> **DB migrations**: any new `supabase/migrations/*.sql` file counts as at least a **minor** bump; a migration that drops or renames existing columns is a **major** bump.

## Usage

1. **Create a session**: Select a Team (e.g. Frontend / Backend / Platform) and enter a Sprint number — the session name is generated automatically.
2. **Share the link**: Copy the board URL and send it to your team.
3. **Enter a nickname**: Each participant enters a display name.
4. **Add sticky notes**: Click the `+` button in a section, or use the toolbar dropdown.
5. **Canvas tools**: Use the bottom toolbar to switch tools and draw text boxes, rectangles, circles, and arrows.
6. **Action items**: Hover a sticky note → click ✅ to create an action item; click "Action Items" in the toolbar to view the list.
7. **Export**: Sign in with Google, save your ClickUp Personal Token in Settings (⚙️), then click the "📤 Export" button in the board toolbar.

## ClickUp Export Integration

The export feature sends retrospective data directly to a ClickUp Doc from the browser. No local CLI or MCP server is needed.

### One-time setup

1. Sign in with Google (guest users cannot use this feature).
2. Go to **Settings** (⚙️ icon, top-right) and paste your ClickUp Personal Token.
3. Optionally save a default Workspace ID, Doc ID, and Parent Page ID to pre-fill the export form.

To find your ClickUp Personal Token: ClickUp → Profile → Apps → API Token.

### Export flow

1. Click the "📤 Export" button in the board toolbar.
2. Confirm or edit the Workspace ID, Doc ID, and Parent Page ID.
3. Click **Export to ClickUp** — a new page named `Sprint {N}` is created under the target doc.
4. A success link to the new page appears in the modal.

**Security**: The token is encrypted at rest using pgcrypto (`pgp_sym_encrypt`) with a server-side key (`CLICKUP_TOKEN_ENCRYPTION_KEY`). The plaintext token is never returned to the browser.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Ctrl + C` | Copy hovered sticky note |
| `Ctrl + V` | Paste (auto-applies section color) |
| Double-click sticky note | Inline edit |
| `Enter` | Save edit |
| `Shift + Enter` | New line |
| `Escape` | Cancel edit |
| `Delete / Backspace` | Delete hovered sticky note or selected canvas element |

## Deploy to Vercel

### Option A — Vercel Dashboard (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. Vercel auto-detects Next.js — no build settings needed
4. Click **Deploy** (first deploy will fail because env vars aren't set yet — that's fine)

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Configure environment variables

In Vercel Dashboard → Project → **Settings** → **Environment Variables**, add all five variables and set their scope to **All Environments**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel production URL (e.g. `https://your-project.vercel.app`) |
| `CLICKUP_TOKEN_ENCRYPTION_KEY` | The key generated with `openssl rand -base64 32` |

Click **Redeploy** (without clearing build cache) to apply.

### Configure Supabase Auth URLs

After deployment, update Supabase to recognize your production domain:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL** → set to your Vercel production URL (e.g. `https://your-project.vercel.app`)
3. **Redirect URLs** → add `https://your-project.vercel.app/auth/callback`
4. Save

> **Local dev tip**: also add `http://localhost:3000/auth/callback` to Redirect URLs so Google login works locally.

### Verify deployment

1. Visit your Vercel URL — you should see the Retro Board home page
2. Click **Sign in with Google** — if Google OAuth is configured correctly, you'll be redirected to Google and back
3. Create a session and share the link with a teammate to test real-time sync

## Project Structure

```
retro-board/
├── middleware.ts                              # Auth guard: redirects unauthenticated users to /login
├── app/
│   ├── page.tsx                               # Home page (create / join session)
│   ├── login/                                 # Login page (Google OAuth + anonymous)
│   ├── auth/callback/                         # OAuth callback handler
│   ├── settings/page.tsx                      # Settings page (ClickUp token management)
│   ├── board/[sessionId]/page.tsx             # Board page (SSR entry)
│   └── api/                                   # REST API routes
│       ├── sessions/                          # Session CRUD
│       ├── sessions/[id]/export/              # Export payload (markdown content)
│       ├── sessions/[id]/clickup-export/      # POST: create ClickUp doc page
│       ├── user/settings/                     # GET/PUT/DELETE: ClickUp token + targets
│       ├── user/settings/test-token/          # POST: validate a ClickUp Personal Token
│       ├── boards/[boardId]/stickies/
│       ├── boards/[boardId]/canvas-elements/
│       ├── boards/[boardId]/action-items/
│       ├── stickies/[id]/
│       ├── stickies/[id]/reactions/
│       ├── stickies/[id]/comments/
│       ├── canvas-elements/[id]/
│       └── action-items/[id]/
├── components/
│   ├── board/
│   │   ├── Board.tsx                          # Main board: state, Realtime, DnD
│   │   ├── ResizableCanvas.tsx                # Resizable 2×2 canvas container
│   │   ├── Section.tsx                        # Quadrant section
│   │   ├── StickyNote.tsx                     # Draggable sticky note
│   │   ├── EmojiPicker.tsx                    # Full emoji picker (8 categories)
│   │   ├── CanvasElement.tsx                  # Canvas element (text/rect/circle/arrow)
│   │   └── CursorOverlay.tsx                  # Live cursor display
│   ├── toolbar/
│   │   ├── Toolbar.tsx                        # Top toolbar
│   │   ├── BottomToolbar.tsx                  # Bottom canvas toolbar
│   │   └── Timer.tsx                          # Countdown timer
│   ├── modals/
│   │   ├── NicknameModal.tsx
│   │   ├── CommentPanel.tsx
│   │   ├── AllCommentsPanel.tsx
│   │   ├── ActionItemModal.tsx
│   │   ├── ExportModal.tsx                    # ClickUp export (state machine: loading → ready → success/error)
│   │   ├── BoardSettingsModal.tsx
│   │   └── ConfirmDeleteModal.tsx
│   ├── sidebar/
│   │   └── BoardSidebar.tsx                   # Board switcher sidebar
│   ├── FeedbackButton.tsx
│   └── NavigationProgress.tsx
├── contexts/
│   ├── UserContext.tsx                        # User identity (sessionStorage)
│   └── ThemeContext.tsx                       # Dark/Light theme (localStorage)
├── lib/
│   ├── supabase.ts                            # Browser + server Supabase clients
│   ├── apiAuth.ts                             # requireGoogleUser() guard for API routes
│   ├── clickupCrypto.ts                       # pgcrypto helpers: save/decrypt/clear/update token
│   ├── clickup.ts                             # Export payload types and markdown formatting
│   ├── constants.ts                           # SECTION_CONFIGS, color constants
│   ├── realtimeHelpers.ts                     # mergeRealtimeNote (race condition guard) + shouldSendCursor (throttle)
│   ├── useTimerSync.ts                        # Timer state hook with realtime broadcast sync
│   └── navigation-events.ts                   # Route progress events
├── types/
│   └── index.ts                               # All shared TypeScript interfaces
└── supabase/
    └── migrations/
        ├── 001_initial.sql
        ├── 002_canvas_elements.sql
        ├── 003_canvas_element_interactions.sql
        ├── 004_normalize_positions.sql
        ├── 005_sticky_note_formatting.sql
        ├── 006_team_and_feedback.sql
        ├── 007_sticky_note_dimensions.sql
        ├── 008_guest_sessions.sql
        ├── 009_drop_guest_board_id.sql
        ├── 010_feedback_dashboard.sql
        ├── 011_user_settings.sql              # Encrypted ClickUp token storage + pgcrypto RPCs
        └── 012_fix_update_clickup_targets.sql # Direct-overwrite fix for update_clickup_targets RPC
```

## Future Enhancements

Tracked ideas for future iterations. Not scheduled — captured here so context is not lost.

### CI: run E2E tests on pull requests

Currently `.github/workflows/ci.yml` runs lint, type check, and Jest unit tests only. Playwright E2E suites (`e2e/`) are run locally with `npm run test:e2e` but not in CI.

The E2E tests split into four suites with different CI requirements:

| Suite | Supabase needed? | CI strategy |
|---|---|---|
| `login.spec.ts` | No | Run unconditionally |
| `home.spec.ts` | No — `/api/sessions` is mocked via `page.route()` | Run unconditionally |
| `settings.spec.ts` | No — `/api/user/settings` is mocked | Run unconditionally |
| `board.spec.ts` | Yes — creates a real session in `beforeAll`; auto-skips if Supabase env vars are missing | Run only when Supabase secrets are configured |

Suggested implementation: add an `e2e` job that runs `npx playwright install --with-deps chromium` then `npm run test:e2e`. Gate the board suite via a secret-presence check. Upload `playwright-report/` as an artifact on failure.

## Conflict Resolution

MVP uses **last-write-wins**. When multiple users edit the same sticky note simultaneously, the last submission wins. Future upgrades could introduce locked editing or CRDTs.
