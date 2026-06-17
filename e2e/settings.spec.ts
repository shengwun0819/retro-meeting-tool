import { test, expect } from '@playwright/test'

const MOCK_SETTINGS = {
  clickup_token_set: true,
  clickup_workspace_id: 'workspace123',
  clickup_doc_id: 'doc-abc',
  clickup_parent_page_id: 'page-def',
}

const MOCK_SETTINGS_NO_TOKEN = {
  clickup_token_set: false,
  clickup_workspace_id: null,
  clickup_doc_id: null,
  clickup_parent_page_id: null,
}

test.describe('Settings page — guest (no Google session)', () => {
  test('shows Google login required card when API returns 401', async ({ page }) => {
    await page.route('/api/user/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) })
      } else {
        await route.continue()
      }
    })

    await page.goto('/settings')
    await expect(page.getByText('Google login required')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()
  })
})

test.describe('Settings page — Google-authenticated user', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/user/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS) })
      } else {
        await route.continue()
      }
    })
  })

  test('loads settings and shows Saved badge and workspace fields', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('ClickUp Personal Token')).toBeVisible()
    await expect(page.getByText('✓ Saved')).toBeVisible()
    await expect(page.getByPlaceholder('Paste a new token to replace…')).toHaveValue('')
    await expect(page.getByPlaceholder('e.g. abc123456')).toHaveValue('workspace123')
  })

  test('show/hide toggle switches input type', async ({ page }) => {
    await page.goto('/settings')
    const input = page.getByPlaceholder('Paste a new token to replace…')
    await expect(input).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Show token' }).click()
    await expect(input).toHaveAttribute('type', 'text')
  })

  test('Test Connection success shows Connected as message', async ({ page }) => {
    await page.route('/api/user/settings/test-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, username: 'Kevin Lee' }),
      })
    })

    await page.goto('/settings')
    await page.getByPlaceholder('Paste a new token to replace…').fill('pk_testtoken123')
    await page.getByRole('button', { name: 'Test Connection' }).click()
    await expect(page.getByText(/Connected as/)).toBeVisible()
    await expect(page.getByText('Kevin Lee')).toBeVisible()
  })

  test('Test Connection unauthorized shows error message', async ({ page }) => {
    await page.route('/api/user/settings/test-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, reason: 'unauthorized' }),
      })
    })

    await page.goto('/settings')
    await page.getByPlaceholder('Paste a new token to replace…').fill('pk_badtoken')
    await page.getByRole('button', { name: 'Test Connection' }).click()
    await expect(page.getByText('✗ Token invalid or expired.')).toBeVisible()
  })

  test('Remove Token clears input and removes Saved badge', async ({ page }) => {
    await page.route('/api/user/settings', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS) })
      } else if (method === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      } else {
        await route.continue()
      }
    })

    await page.goto('/settings')
    await expect(page.getByText('✓ Saved')).toBeVisible()

    await page.getByRole('button', { name: 'Remove Token' }).click()
    await expect(page.getByText('Token removed.')).toBeVisible()
    await expect(page.getByText('✓ Saved')).not.toBeVisible()
  })

  test('Save Defaults shows Defaults saved message', async ({ page }) => {
    await page.route('/api/user/settings', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS) })
      } else if (method === 'PUT') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      } else {
        await route.continue()
      }
    })

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Save Defaults' }).click()
    await expect(page.getByText('Defaults saved.')).toBeVisible()
  })

  test('Save Token shows Token saved message and Saved badge', async ({ page }) => {
    await page.route('/api/user/settings', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS_NO_TOKEN) })
      } else if (method === 'PUT') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      } else {
        await route.continue()
      }
    })

    await page.goto('/settings')
    await page.getByPlaceholder('pk_xxxxxxxx…').fill('pk_newtoken123456')
    await page.getByRole('button', { name: 'Save Token' }).click()
    await expect(page.getByText('Token saved.')).toBeVisible()
    await expect(page.getByText('✓ Saved')).toBeVisible()
  })

  test('targets are pre-filled on page load', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByPlaceholder('e.g. abc123456')).toHaveValue('workspace123')
    await expect(page.getByPlaceholder('e.g. your-doc-id')).toHaveValue('doc-abc')
    await expect(page.getByPlaceholder('e.g. your-page-id')).toHaveValue('page-def')
  })

  test('clicking Help button opens popover and clicking outside closes it', async ({ page }) => {
    await page.goto('/settings')

    const helpButtons = page.getByRole('button', { name: 'Help' })
    await helpButtons.first().click()
    await expect(page.getByText('How to get your ClickUp Personal Token')).toBeVisible()

    await page.getByRole('heading', { name: '⚙️ Settings' }).click()
    await expect(page.getByText('How to get your ClickUp Personal Token')).not.toBeVisible()
  })
})

test.describe('Navigation — Settings links', () => {
  test('Home page has Settings link that navigates to /settings', async ({ page }) => {
    await page.route('/api/sessions', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('/api/user/settings', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) })
    })

    await page.goto('/')
    await page.getByTitle('Settings').click()
    await expect(page).toHaveURL('/settings')
  })

  test.describe('Board sidebar Settings link', () => {
    let sessionId: string | undefined

    test.beforeAll(async ({ request }) => {
      try {
        const res = await request.post('/api/sessions', {
          data: { name: 'E2E Settings Sidebar Test', team: 'Turing' },
        })
        if (res.ok()) {
          sessionId = (await res.json()).session.id
        }
      } catch {
        // Supabase not reachable
      }
    })

    test.afterAll(async ({ request }) => {
      if (sessionId) {
        await request.delete(`/api/sessions/${sessionId}`)
      }
    })

    test('sidebar contains Settings link that navigates to /settings', async ({ page }, testInfo) => {
      if (!sessionId) testInfo.skip()

      await page.route('/api/user/settings', async (route) => {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) })
      })

      await page.goto(`/board/${sessionId}`)
      // Dismiss NicknameModal so the toolbar is not blocked
      await page.getByPlaceholder('e.g. Kevin').fill('E2E Tester')
      await page.getByRole('button', { name: 'Enter Board 🚀' }).click()
      await expect(page.getByText('Your display name')).not.toBeVisible()

      await page.getByTitle('Toggle sidebar').click()
      await expect(page.getByText('All Boards')).toBeVisible()

      await page.getByRole('link', { name: /Settings/ }).click()
      await expect(page).toHaveURL('/settings')
    })
  })
})
