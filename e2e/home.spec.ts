import { test, expect } from '@playwright/test'

/**
 * Home page e2e tests.
 * Sessions list is mocked via page.route() so tests don't depend on Supabase state.
 */

const MOCK_SESSIONS = [
  {
    id: 'mock-session-turing',
    name: 'Turing Sprint 42 Retro',
    team: 'Turing',
    sprint_number: 42,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-session-mobius',
    name: 'Mobius Sprint 10 Retro',
    team: 'Mobius',
    sprint_number: 10,
    created_at: new Date().toISOString(),
  },
]

test.beforeEach(async ({ page }) => {
  await page.route('/api/sessions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SESSIONS),
      })
    } else {
      await route.continue()
    }
  })
})

test.describe('Home page', () => {
  test('renders hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Retro Board')).toBeVisible()
    await expect(page.getByText('🚀 Start New Retro')).toBeVisible()
    await expect(page.getByText('🔗 Join Existing Board')).toBeVisible()
  })

  test('start new retro form expands on click', async ({ page }) => {
    await page.goto('/')
    // The wrapper uses grid-rows-[0fr] + opacity-0 for collapse; check class before/after click
    const formWrapper = page.locator('[class*="grid-rows"]').filter({
      has: page.getByPlaceholder('e.g. Turing'),
    })
    await expect(formWrapper).toHaveClass(/opacity-0/)

    await page.getByText('🚀 Start New Retro').click()
    await expect(page.getByPlaceholder('e.g. Turing')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Board →' })).toBeVisible()
  })

  test('start new retro form collapses on second click', async ({ page }) => {
    await page.goto('/')
    await page.getByText('🚀 Start New Retro').click()
    await expect(page.getByPlaceholder('e.g. Turing')).toBeVisible()

    await page.getByText('🚀 Start New Retro').click()
    const formWrapper = page.locator('[class*="grid-rows"]').filter({
      has: page.getByPlaceholder('e.g. Turing'),
    })
    await expect(formWrapper).toHaveClass(/opacity-0/)
  })

  test('create form requires team', async ({ page }) => {
    await page.goto('/')
    await page.getByText('🚀 Start New Retro').click()
    // Button is disabled when no valid team is entered
    await expect(page.getByRole('button', { name: 'Create Board →' })).toBeDisabled()
  })

  test('create form rejects invalid team name', async ({ page }) => {
    await page.goto('/')
    await page.getByText('🚀 Start New Retro').click()
    await page.getByPlaceholder('e.g. Turing').fill('UnknownTeam')
    await expect(page.getByText(/Please enter one of/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Board →' })).toBeDisabled()
  })

  test('create form accepts all valid team names', async ({ page }) => {
    await page.goto('/')
    await page.getByText('🚀 Start New Retro').click()
    const input = page.getByPlaceholder('e.g. Turing')

    for (const team of ['Turing', 'Mobius', 'Crypto platform']) {
      await input.fill(team)
      await expect(page.getByText(/Please enter one of/)).not.toBeVisible()
      await expect(page.getByRole('button', { name: 'Create Board →' })).toBeEnabled()
    }
  })

  test('join board button is disabled without input', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Join' })).toBeDisabled()
  })

  test('join board button enables when input is filled', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Paste board link or UUID...').fill('some-board-id')
    await expect(page.getByRole('button', { name: 'Join' })).toBeEnabled()
  })

  test('recent sessions are grouped by team', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('🕐 Recent Sessions')).toBeVisible()
    // Team group toggle headers show "TeamName (N)" as their text content
    await expect(page.getByRole('button', { name: /^Turing \(\d+\)/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Mobius \(\d+\)/ })).toBeVisible()
    await expect(page.getByText('Turing Sprint 42 Retro').first()).toBeVisible()
  })

  test.describe('Guest top-right controls', () => {
    test('theme toggle switches dark mode (guest state)', async ({ page }) => {
      await page.goto('/')
      const html = page.locator('html')
      // Guest branch: title is 'Switch to dark mode' / 'Switch to light mode'
      const toggleBtn = page.getByTitle(/Switch to (dark|light) mode/)

      await toggleBtn.click()
      await expect(html).toHaveClass(/dark/)

      await toggleBtn.click()
      await expect(html).not.toHaveClass(/dark/)
    })

    test('⚙️ Settings icon link navigates to /settings', async ({ page }) => {
      await page.route('/api/user/settings', async (route) => {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) })
      })
      await page.goto('/')
      await page.getByTitle('Settings').click()
      await expect(page).toHaveURL('/settings')
    })
  })

  test.describe('Account dropdown (Google user)', () => {
    // These tests mock the user as Google-authenticated by injecting authName
    // into sessionStorage (the key used by UserContext).
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        // Simulate a Google-authed user by pre-setting name in sessionStorage
        // so UserContext.authName resolves to a non-empty value.
        // NOTE: The actual Google auth check comes from supabase.auth.getUser().
        // Since the test environment uses anonymous auth, authName will still be
        // empty after hydration — these tests verify the guest branch only.
        // Full dropdown tests require a real Google session (out of scope for CI).
      })
    })

    test('guest state shows ⚙️ icon and theme toggle, not dropdown', async ({ page }) => {
      await page.goto('/')
      // In anonymous auth, there is no account dropdown
      await expect(page.getByTitle('Settings')).toBeVisible()
      await expect(page.getByTitle(/Switch to (dark|light) mode/)).toBeVisible()
      // No avatar/name dropdown should be visible
      await expect(page.locator('button').filter({ hasText: /Sign out/ })).not.toBeVisible()
    })
  })
})
