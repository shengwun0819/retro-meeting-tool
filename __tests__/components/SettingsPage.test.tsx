import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from '@/app/settings/page'

const mockFetch = jest.fn()
global.fetch = mockFetch

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, toggleTheme: jest.fn() }),
}))

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

const SETTINGS_WITH_TOKEN = {
  clickup_token_set: true,
  clickup_workspace_id: 'workspace123',
  clickup_doc_id: 'doc-abc',
  clickup_parent_page_id: 'page-def',
}

const SETTINGS_NO_TOKEN = {
  clickup_token_set: false,
  clickup_workspace_id: null,
  clickup_doc_id: null,
  clickup_parent_page_id: null,
}

function settingsOk(data: object) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('SettingsPage — auth guard', () => {
  it('shows loading skeleton initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<SettingsPage />)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows Google login required when API returns 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) })
    render(<SettingsPage />)
    expect(await screen.findByText('Google login required')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in with Google' })).toBeInTheDocument()
  })

  it('shows Google login required when API returns 403', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({}) })
    render(<SettingsPage />)
    expect(await screen.findByText('Google login required')).toBeInTheDocument()
  })

  it('renders settings form after successful auth', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<SettingsPage />)
    expect(await screen.findByText('ClickUp Personal Token')).toBeInTheDocument()
    expect(screen.getByText('Default Export Targets')).toBeInTheDocument()
  })
})

describe('SettingsPage — token section', () => {
  it('shows ✓ Saved badge when token is set', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<SettingsPage />)
    expect(await screen.findByText('✓ Saved')).toBeInTheDocument()
  })

  it('does not show ✓ Saved badge when no token saved', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_NO_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')
    expect(screen.queryByText('✓ Saved')).not.toBeInTheDocument()
  })

  it('shows Paste a new token placeholder and empty input when token is already saved', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('✓ Saved')
    const input = screen.getByPlaceholderText('Paste a new token to replace…')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('shows pk_xxxxxxxx… placeholder when no token saved', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_NO_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')
    expect(screen.getByPlaceholderText('pk_xxxxxxxx…')).toBeInTheDocument()
  })

  it('show/hide toggle switches input type between password and text', async () => {
    const user = userEvent.setup()
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('✓ Saved')

    const input = screen.getByPlaceholderText('Paste a new token to replace…')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show token' }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide token' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})

describe('SettingsPage — Test Connection', () => {
  it('Test Connection button is disabled when input is empty', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_NO_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')
    expect(screen.getByRole('button', { name: 'Test Connection' })).toBeDisabled()
  })

  it('shows Connected as message on successful test', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_NO_TOKEN))
      .mockReturnValueOnce(Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, username: 'Kevin Lee' }) }))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')

    await user.type(screen.getByPlaceholderText('pk_xxxxxxxx…'), 'pk_testtoken123')
    await user.click(screen.getByRole('button', { name: 'Test Connection' }))

    expect(await screen.findByText(/Connected as/)).toBeInTheDocument()
    expect(screen.getByText('Kevin Lee')).toBeInTheDocument()
  })

  it('shows Token invalid or expired on unauthorized error', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_NO_TOKEN))
      .mockReturnValueOnce(Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: false, reason: 'unauthorized' }) }))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')

    await user.type(screen.getByPlaceholderText('pk_xxxxxxxx…'), 'pk_badtoken123')
    await user.click(screen.getByRole('button', { name: 'Test Connection' }))

    expect(await screen.findByText('✗ Token invalid or expired.')).toBeInTheDocument()
  })
})

describe('SettingsPage — Save Token', () => {
  it('shows Token saved and ✓ Saved badge on success', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_NO_TOKEN))
      .mockReturnValueOnce(Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')

    await user.type(screen.getByPlaceholderText('pk_xxxxxxxx…'), 'pk_newtoken123')
    await user.click(screen.getByRole('button', { name: 'Save Token' }))

    expect(await screen.findByText('Token saved.')).toBeInTheDocument()
    expect(screen.getByText('✓ Saved')).toBeInTheDocument()
  })

  it('shows Token must start with pk_ on invalid_token_format error', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_NO_TOKEN))
      .mockReturnValueOnce(Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: false, error: 'invalid_token_format' }) }))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')

    await user.type(screen.getByPlaceholderText('pk_xxxxxxxx…'), 'badtoken')
    await user.click(screen.getByRole('button', { name: 'Save Token' }))

    expect(await screen.findByText('Token must start with pk_.')).toBeInTheDocument()
  })
})

describe('SettingsPage — Remove Token', () => {
  it('clears input, removes ✓ Saved badge, shows Token removed', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }))
    render(<SettingsPage />)
    await screen.findByText('✓ Saved')

    await user.click(screen.getByRole('button', { name: 'Remove Token' }))

    await waitFor(() => expect(screen.queryByText('✓ Saved')).not.toBeInTheDocument())
    expect(screen.getByText('Token removed.')).toBeInTheDocument()
    const input = screen.getByPlaceholderText('pk_xxxxxxxx…')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('Remove Token button is not shown when tokenSet is false', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_NO_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')
    expect(screen.queryByRole('button', { name: 'Remove Token' })).not.toBeInTheDocument()
  })
})

describe('SettingsPage — Default Export Targets', () => {
  it('pre-fills all three target inputs from API response', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('Default Export Targets')

    expect((screen.getByPlaceholderText('e.g. abc123456') as HTMLInputElement).value).toBe('workspace123')
    expect((screen.getByPlaceholderText('e.g. your-doc-id') as HTMLInputElement).value).toBe('doc-abc')
    expect((screen.getByPlaceholderText('e.g. your-page-id') as HTMLInputElement).value).toBe('page-def')
  })

  it('all three inputs are empty when no targets saved', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_NO_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('Default Export Targets')

    expect((screen.getByPlaceholderText('e.g. abc123456') as HTMLInputElement).value).toBe('')
    expect((screen.getByPlaceholderText('e.g. your-doc-id') as HTMLInputElement).value).toBe('')
    expect((screen.getByPlaceholderText('e.g. your-page-id') as HTMLInputElement).value).toBe('')
  })

  it('shows Defaults saved on success', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }))
    render(<SettingsPage />)
    await screen.findByText('Default Export Targets')

    await user.click(screen.getByRole('button', { name: 'Save Defaults' }))

    expect(await screen.findByText('Defaults saved.')).toBeInTheDocument()
  })

  it('PUT body contains clickup_parent_page_id: null when parent page ID cleared', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }))
    render(<SettingsPage />)
    await screen.findByText('Default Export Targets')

    const parentInput = screen.getByPlaceholderText('e.g. your-page-id')
    await user.clear(parentInput)
    await user.click(screen.getByRole('button', { name: 'Save Defaults' }))

    await waitFor(() => {
      const putCall = mockFetch.mock.calls.find(
        (c: [string, RequestInit?]) => c[0] === '/api/user/settings' && c[1]?.method === 'PUT'
      )
      expect(putCall).toBeTruthy()
      const body = JSON.parse(putCall![1].body as string)
      expect(body.clickup_parent_page_id).toBeNull()
    })
  })
})

describe('SettingsPage — Popover', () => {
  it('clicking Help button opens popover with ClickUp token instructions', async () => {
    const user = userEvent.setup()
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')

    const helpButtons = screen.getAllByRole('button', { name: 'Help' })
    await user.click(helpButtons[0])

    expect(screen.getByText('How to get your ClickUp Personal Token')).toBeInTheDocument()
  })

  it('clicking outside popover closes it', async () => {
    const user = userEvent.setup()
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<SettingsPage />)
    await screen.findByText('ClickUp Personal Token')

    const helpButtons = screen.getAllByRole('button', { name: 'Help' })
    await user.click(helpButtons[0])
    expect(screen.getByText('How to get your ClickUp Personal Token')).toBeInTheDocument()

    await user.click(screen.getByRole('heading', { name: /ClickUp Personal Token/i }))
    await waitFor(() => {
      expect(screen.queryByText('How to get your ClickUp Personal Token')).not.toBeInTheDocument()
    })
  })
})
