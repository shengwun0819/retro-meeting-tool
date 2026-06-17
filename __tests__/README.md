# Unit Tests

Jest + jsdom. Run with:

```bash
npm test              # watch mode
npm run test:ci       # CI mode with coverage report
```

## Directory Structure

```
__tests__/
├── lib/                          # Tests for lib/ utilities and hooks
│   ├── realtimeHelpers.test.ts   # mergeRealtimeNote, shouldSendCursor
│   ├── useTimerSync.test.ts      # useTimerSync hook — state, broadcast, handleIncoming
│   ├── clickupCrypto.test.ts     # pgcrypto RPC wrappers (fake Supabase client)
│   ├── clickupCrypto.integration.test.ts  # Real Supabase DB (auto-skipped in CI)
│   └── clickup.test.ts           # Export payload formatting
└── components/                   # Tests for React components
    ├── Timer.test.tsx
    ├── Toolbar.tsx → (covered via Timer + integration)
    ├── ExportModal.test.tsx
    ├── BoardSettingsModal.test.tsx
    ├── ActionItemModal.test.tsx
    ├── AllCommentsPanel.test.tsx
    ├── CommentPanel.test.tsx
    ├── ConfirmDeleteModal.test.tsx
    ├── ConfirmDeleteModal.keyboard.test.tsx
    ├── CursorOverlay.test.tsx
    ├── EmojiPicker.test.tsx
    ├── FeedbackButton.test.tsx
    ├── FeedbackDashboard.test.tsx
    ├── FloatingActionMenu.test.tsx
    ├── HelpButton.test.tsx
    ├── Section.test.tsx
    ├── SettingsPage.test.tsx
    └── BottomToolbar.test.tsx
```

## Naming Conventions

| File type | Naming pattern | Example |
|-----------|---------------|---------|
| Component test | `ComponentName.test.tsx` | `Timer.test.tsx` |
| Lib utility test | `moduleName.test.ts` | `realtimeHelpers.test.ts` |
| Hook test | `useHookName.test.ts` | `useTimerSync.test.ts` |
| Keyboard-specific | `ComponentName.keyboard.test.tsx` | `ConfirmDeleteModal.keyboard.test.tsx` |
| Integration test | `moduleName.integration.test.ts` | `clickupCrypto.integration.test.ts` |

## Common Patterns

### Mocking `next/server`

API route tests must use a class-based mock so `instanceof NextResponse` works:

```ts
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number; _body: unknown
    constructor(body: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200; this._body = body
    }
    json() { return Promise.resolve(this._body) }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init)
    }
  }
  return { NextResponse: MockNextResponse }
})
```

### Testing React hooks

Use `renderHook` and `act` from `@testing-library/react`:

```ts
import { renderHook, act } from '@testing-library/react'
import { useTimerSync } from '@/lib/useTimerSync'

const { result } = renderHook(() => useTimerSync(channelRef))
act(() => { result.current.start() })
expect(result.current.running).toBe(true)
```

### Mocking a Supabase channel ref

```ts
function makeChannelRef(state = 'joined') {
  const send = jest.fn()
  return { current: { state, send } as unknown as RealtimeChannel }
}
```

### Testing a fake Supabase client (RPC)

```ts
function makeFakeClient(rpcImpl: jest.Mock): SupabaseClient {
  return { rpc: rpcImpl } as unknown as SupabaseClient
}
```

## Testing Policy

After every new feature, screen, or bug fix, evaluate whether a test is needed:

| Work type | Unit test | Notes |
|-----------|-----------|-------|
| New pure function (`lib/`) | **Always** | Test all branches and edge cases |
| New React hook with logic | **Always** | Use `renderHook` |
| New UI component | **Usually** | Focus on user interactions and edge states, not implementation details |
| New API route | **Always** | Happy path + auth failure + error cases |
| Bug fix | **Always** | Write a test that would have caught the bug |
| Realtime / broadcast logic | **Always** | Mock the channel ref; verify `send` call args |
| Config or styling change | Usually not | — |

**Rule of thumb**: if you can describe the bug or feature in one sentence, you can write one test for it.
