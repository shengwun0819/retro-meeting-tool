import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('renders branding', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Retro Board' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
  })

  test('Google sign-in button is visible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible()
  })

  test('guest login button is not present', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Continue as Guest')).not.toBeVisible()
  })
})
