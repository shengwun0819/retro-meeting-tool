import { test, expect } from '@playwright/test'

/**
 * Board e2e tests.
 *
 * Requires the dev server to have a live Supabase connection (.env).
 * All tests are skipped automatically when session creation fails
 * (e.g. CI without Supabase env vars).
 */

const SECTION_TITLES = ['Continue', 'Stop', 'Invent', 'Act']
const SECTION_SUBTITLES = [
  'What helped us move forward?',
  'What held us back?',
  'How could we do things differently?',
  'What should we do next?',
]

test.describe('Board page', () => {
  let sessionId: string | undefined

  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.post('/api/sessions', {
        data: { name: 'E2E Test Retro', team: 'Turing' },
      })
      if (res.ok()) {
        sessionId = (await res.json()).session.id
      }
    } catch {
      // Supabase not reachable; all tests will be skipped via beforeEach
    }
  })

  test.afterAll(async ({ request }) => {
    if (sessionId) {
      await request.delete(`/api/sessions/${sessionId}`)
    }
  })

  test.beforeEach(({}, testInfo) => {
    if (!sessionId) testInfo.skip()
  })

  test.describe('Layout & sections', () => {
    test('renders all 4 section headers', async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      for (const title of SECTION_TITLES) {
        await expect(page.getByText(title).first()).toBeVisible()
      }
    })

    test('renders all section subtitles', async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      for (const subtitle of SECTION_SUBTITLES) {
        await expect(page.getByText(subtitle).first()).toBeVisible()
      }
    })

    test('each section has a + add note button', async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      const addButtons = page.getByTitle(/Add sticky note to/)
      await expect(addButtons).toHaveCount(4)
    })

    test('section note count badges are visible', async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      // Each section header contains a count badge (shows 0 for empty sections)
      const badges = page.locator('.bg-white\\/50.text-white.text-xs.rounded-full')
      await expect(badges).toHaveCount(4)
    })
  })

  test.describe('Toolbar', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      // NicknameModal always appears on first load (user is null on mount).
      // Dismiss it explicitly so toolbar is not blocked by the modal overlay.
      // setShowNicknameModal(false) is only called via onConfirm, never automatically.
      await page.getByPlaceholder('e.g. Kevin').fill('E2E Tester')
      await page.getByRole('button', { name: 'Enter Board 🚀' }).click()
      await expect(page.getByText('Your display name')).not.toBeVisible()
    })

    test('top toolbar is visible with session name', async ({ page }) => {
      await expect(page.getByText('E2E Test Retro').first()).toBeVisible()
    })

    test('bottom toolbar toggle button is visible', async ({ page }) => {
      // getByTitle(/Drawing tools/) uniquely targets the toggle (FloatingActionMenu
      // has a 'Help & Feedback' button that also lives in a fixed.bottom-5 container)
      await expect(page.getByTitle(/Drawing tools/)).toBeVisible()
    })

    test('bottom toolbar expands to show all canvas tools', async ({ page }) => {
      await page.getByTitle(/Drawing tools/).click()

      for (const tool of ['Select', 'Text', 'Rect', 'Circle', 'Arrow']) {
        await expect(page.getByTitle(tool)).toBeVisible()
      }
    })

    test('selecting a canvas tool highlights the toggle button', async ({ page }) => {
      await page.getByTitle(/Drawing tools/).click()
      await page.getByTitle('Text').click()
      // After selecting Text, title becomes "Drawing tools (Text)" — still matches
      const toggle = page.getByTitle(/Drawing tools/)
      await expect(toggle).toHaveClass(/bg-blue-500/)
    })
  })

  test.describe('NicknameModal', () => {
    // NicknameModal always appears on first load: Board.tsx fires
    // setShowNicknameModal(true) in a mount-only useEffect when user is null.
    // No need to clear cookies or storage — the modal is always present on goto.

    test('appears for a new visitor with no session', async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      await expect(page.getByText('Your display name')).toBeVisible()
      await expect(page.getByPlaceholder('e.g. Kevin')).toBeVisible()
    })

    test('shows error when submitting empty name', async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      // Clear any pre-filled defaultName (e.g. 'Guest' from resolved auth)
      await page.getByPlaceholder('e.g. Kevin').clear()
      await page.getByRole('button', { name: 'Enter Board 🚀' }).click()
      await expect(page.getByText('Please enter a name')).toBeVisible()
    })

    test('clears error message when user starts typing', async ({ page }) => {
      await page.goto(`/board/${sessionId}`)
      await page.getByPlaceholder('e.g. Kevin').clear()
      await page.getByRole('button', { name: 'Enter Board 🚀' }).click()
      await expect(page.getByText('Please enter a name')).toBeVisible()

      await page.getByPlaceholder('e.g. Kevin').fill('K')
      await expect(page.getByText('Please enter a name')).not.toBeVisible()
    })
  })

  test.describe('Export Modal', () => {
    async function openExportModal(page: import('@playwright/test').Page) {
      await page.goto(`/board/${sessionId}`)
      await page.getByPlaceholder('e.g. Kevin').fill('E2E Tester')
      await page.getByRole('button', { name: 'Enter Board 🚀' }).click()
      await expect(page.getByText('Your display name')).not.toBeVisible()
      await page.getByTitle('Export to ClickUp Docs').click()
    }

    test('shows Google login required for guest user', async ({ page }) => {
      await page.route('/api/user/settings', async (route) => {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) })
      })

      await openExportModal(page)
      await expect(page.getByText('Google login required')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()
    })

    test('shows ClickUp token required when token not set', async ({ page }) => {
      await page.route('/api/user/settings', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ clickup_token_set: false, clickup_workspace_id: null, clickup_doc_id: null, clickup_parent_page_id: null }),
          })
        } else {
          await route.continue()
        }
      })

      await openExportModal(page)
      await expect(page.getByText('ClickUp token required')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Go to Settings' })).toBeVisible()
    })

    test('shows export form pre-filled from settings when token is set', async ({ page }) => {
      await page.route('/api/user/settings', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              clickup_token_set: true,
              clickup_workspace_id: 'workspace123',
              clickup_doc_id: 'doc-abc',
              clickup_parent_page_id: 'page-def',
            }),
          })
        } else {
          await route.continue()
        }
      })

      await openExportModal(page)
      await expect(page.getByRole('button', { name: 'Export to ClickUp' })).toBeVisible()
      await expect(page.getByPlaceholder('e.g. abc123456')).toHaveValue('workspace123')
      await expect(page.getByPlaceholder('e.g. your-doc-id')).toHaveValue('doc-abc')
      await expect(page.getByPlaceholder('e.g. your-page-id')).toHaveValue('page-def')
    })

    test('shows success state after export', async ({ page }) => {
      await page.route('/api/user/settings', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ clickup_token_set: true, clickup_workspace_id: 'workspace123', clickup_doc_id: 'doc-abc', clickup_parent_page_id: null }),
          })
        } else {
          await route.continue()
        }
      })
      await page.route(`/api/sessions/${sessionId}/clickup-export`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ pageId: 'page-abc', pageUrl: 'https://app.clickup.com/workspace123/v/dc/doc-abc/page-abc' }),
        })
      })

      await openExportModal(page)
      await page.getByRole('button', { name: 'Export to ClickUp' }).click()
      await expect(page.getByText('Export successful!')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Open in ClickUp →' })).toBeVisible()
    })

    test('shows error state on token_invalid response', async ({ page }) => {
      await page.route('/api/user/settings', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ clickup_token_set: true, clickup_workspace_id: 'workspace123', clickup_doc_id: 'doc-abc', clickup_parent_page_id: null }),
          })
        } else {
          await route.continue()
        }
      })
      await page.route(`/api/sessions/${sessionId}/clickup-export`, async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'token_invalid' }),
        })
      })

      await openExportModal(page)
      await page.getByRole('button', { name: 'Export to ClickUp' }).click()
      await expect(page.getByText('ClickUp token is invalid or expired.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    })

    test('closes modal when × is clicked', async ({ page }) => {
      await page.route('/api/user/settings', async (route) => {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) })
      })

      await openExportModal(page)
      await expect(page.getByText('Google login required')).toBeVisible()
      await page.getByRole('dialog', { name: 'Export to ClickUp' }).getByRole('button', { name: '×' }).click()
      await expect(page.getByText('Google login required')).not.toBeVisible()
    })
  })
})
