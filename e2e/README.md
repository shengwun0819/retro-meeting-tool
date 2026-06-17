# E2E Tests (Playwright)

End-to-end tests that run against a real browser. Run with:

```bash
# Requires dev server running first
npm run dev          # in one terminal
npm run test:e2e     # in another terminal
```

Or with a single command using Playwright's built-in webServer (see `playwright.config.ts`):

```bash
npx playwright test
npx playwright test --ui    # interactive UI mode
npx playwright show-report  # view last HTML report
```

## Suite Overview

| Suite | File | Supabase needed? | Notes |
|-------|------|-----------------|-------|
| Login page | `login.spec.ts` | No | Static UI only |
| Home page | `home.spec.ts` | No | `/api/sessions` is mocked via `page.route()` |
| Settings page | `settings.spec.ts` | No | `/api/user/settings` is mocked |
| Board | `board.spec.ts` | **Yes** | Creates a real session in `beforeAll`; auto-skips if Supabase env vars are absent |

## Setup

### Local development

1. Copy `.env` and ensure Supabase env vars are set (required for `board.spec.ts`).
2. Start the dev server: `npm run dev`
3. Run tests: `npm run test:e2e`

The `board.spec.ts` suite auto-skips (via `testInfo.skip()`) when Supabase credentials are missing — no manual config needed to run just the other suites.

### Setup (`e2e/setup/`)

- `global-teardown.ts` — cleanup after all suites finish; deletes any sessions whose name starts with `E2E`

## Mocking API Routes

For suites that don't need a real database, intercept API calls with `page.route()`:

```ts
await page.route('/api/sessions', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ sessions: [] }),
  })
})
```

This avoids Supabase dependency and keeps the test fast and deterministic.

## Multi-User / Multi-Context Tests

To simulate two users on the same board (e.g., timer sync, cursor visibility):

```ts
test('timer syncs across two sessions', async ({ browser }) => {
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  const host = await ctx1.newPage()
  const participant = await ctx2.newPage()

  await host.goto(`/board/${sessionId}`)
  await participant.goto(`/board/${sessionId}`)

  await host.getByRole('button', { name: '▶' }).click()
  await expect(participant.getByRole('button', { name: '⏸' }))
    .toBeVisible({ timeout: 2000 })

  await ctx1.close()
  await ctx2.close()
})
```

Multi-context tests require a live Supabase connection and belong in `board.spec.ts`.

## Testing Policy

After every new feature or bug fix, evaluate whether an E2E test is warranted:

| Work type | Add E2E test? | Notes |
|-----------|--------------|-------|
| New multi-step user flow (e.g., export, settings save) | **Yes** | Test the golden path end-to-end |
| New realtime feature (e.g., timer sync, cursor) | **Yes, if feasible** | Use multi-context test in `board.spec.ts` |
| New page or route | **Yes** | At minimum: renders without error, key elements visible |
| Bug only reproducible end-to-end | **Yes** | Add a regression test |
| Pure logic / utility | **No** | Covered by unit tests in `__tests__/` |
| Styling or theme change | **No** | Too brittle; verify visually |

**Prefer unit tests over E2E** for logic that can be tested in isolation — E2E tests are slower, require infrastructure, and are harder to maintain. Only reach for E2E when the interaction between the browser, server, and database is essential to verify.

## CI Integration

Currently E2E tests run **locally only**. They are not part of the CI pipeline (`.github/workflows/ci.yml`).

Future plan: add a `e2e` CI job that:
1. Runs `login.spec.ts`, `home.spec.ts`, `settings.spec.ts` unconditionally (no Supabase needed)
2. Runs `board.spec.ts` only when Supabase secrets are configured
3. Uploads `playwright-report/` as a CI artifact on failure
