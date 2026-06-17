import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportModal from '@/components/modals/ExportModal'

const mockFetch = jest.fn()
global.fetch = mockFetch

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}))
jest.mock('next/link', () => {
  const MockLink = ({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <a href={href} onClick={onClick} {...rest}>{children}</a>
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

describe('ExportModal — guest state', () => {
  it('shows Google login required when settings API returns 401', async () => {
    mockFetch.mockResolvedValue({ status: 401, json: () => Promise.resolve({}) })
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    expect(await screen.findByText('Google login required')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in with Google' })).toBeInTheDocument()
  })

  it('shows Google login required when settings API returns 403', async () => {
    mockFetch.mockResolvedValue({ status: 403, json: () => Promise.resolve({}) })
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    expect(await screen.findByText('Google login required')).toBeInTheDocument()
  })
})

describe('ExportModal — no token state', () => {
  it('shows ClickUp token required when token not set', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_NO_TOKEN))
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    expect(await screen.findByText('ClickUp token required')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Settings' })).toBeInTheDocument()
  })
})

describe('ExportModal — ready state', () => {
  it('shows export form with pre-filled values from settings', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })

    expect((screen.getByPlaceholderText('e.g. abc123456') as HTMLInputElement).value).toBe('workspace123')
    expect((screen.getByPlaceholderText('e.g. your-doc-id') as HTMLInputElement).value).toBe('doc-abc')
    expect((screen.getByPlaceholderText('e.g. your-page-id') as HTMLInputElement).value).toBe('page-def')
  })

  it('pre-fills Page Title from team and sprint when both provided', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<ExportModal sessionId="sess-1" sessionTeam="Frontend" sessionSprint={42} onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })

    const titleInput = screen.getByPlaceholderText('e.g. Frontend Sprint 42 Retro Board') as HTMLInputElement
    expect(titleInput.value).toBe('Frontend Sprint 42 Retro Board')
  })

  it('pre-fills Page Title as empty string when team and sprint are absent', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })

    const titleInput = screen.getByPlaceholderText('e.g. Frontend Sprint 42 Retro Board') as HTMLInputElement
    expect(titleInput.value).toBe('')
  })

  it('sends page_title in POST body when exporting', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ pageId: 'p-1', pageUrl: 'https://app.clickup.com/1/v/dc/d/p-1' }),
      }))

    render(<ExportModal sessionId="sess-1" sessionTeam="Frontend" sessionSprint={42} onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    await user.click(screen.getByRole('button', { name: 'Export to ClickUp' }))
    await screen.findByText('Export successful!')

    const postCall = mockFetch.mock.calls[1]
    const body = JSON.parse(postCall[1].body)
    expect(body.page_title).toBe('Frontend Sprint 42 Retro Board')
  })

  it('Export button is disabled when workspace ID is empty', async () => {
    mockFetch.mockReturnValue(settingsOk({ ...SETTINGS_WITH_TOKEN, clickup_workspace_id: null }))
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    expect(screen.getByRole('button', { name: 'Export to ClickUp' })).toBeDisabled()
  })

  it('Export button is disabled when doc ID is empty', async () => {
    mockFetch.mockReturnValue(settingsOk({ ...SETTINGS_WITH_TOKEN, clickup_doc_id: null }))
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    expect(screen.getByRole('button', { name: 'Export to ClickUp' })).toBeDisabled()
  })

  it('Export button is enabled when workspace ID and doc ID are filled', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    expect(screen.getByRole('button', { name: 'Export to ClickUp' })).not.toBeDisabled()
  })
})

describe('ExportModal — success state', () => {
  it('shows success message and Open in ClickUp link after export', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ pageId: 'page-123', pageUrl: 'https://app.clickup.com/123/v/dc/doc-abc/page-123' }),
      }))

    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    await user.click(screen.getByRole('button', { name: 'Export to ClickUp' }))

    expect(await screen.findByText('Export successful!')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Open in ClickUp →' })
    expect(link).toHaveAttribute('href', 'https://app.clickup.com/123/v/dc/doc-abc/page-123')
  })
})

describe('ExportModal — error states', () => {
  it('shows token invalid message on 401 from export endpoint', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'token_invalid' }),
      }))

    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    await user.click(screen.getByRole('button', { name: 'Export to ClickUp' }))

    expect(await screen.findByText('ClickUp token is invalid or expired.')).toBeInTheDocument()
  })

  it('shows workspace not found message on 404', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'workspace_or_doc_not_found' }),
      }))

    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    await user.click(screen.getByRole('button', { name: 'Export to ClickUp' }))

    expect(await screen.findByText('Workspace or Doc ID not found in ClickUp.')).toBeInTheDocument()
  })

  it('shows Try again button which resets to ready state', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockReturnValueOnce(settingsOk(SETTINGS_WITH_TOKEN))
      .mockReturnValueOnce(Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: 'clickup_error' }),
      }))

    render(<ExportModal sessionId="sess-1" onClose={jest.fn()} />)
    await screen.findByRole('button', { name: 'Export to ClickUp' })
    await user.click(screen.getByRole('button', { name: 'Export to ClickUp' }))
    await screen.findByRole('button', { name: 'Try again' })

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByRole('button', { name: 'Export to ClickUp' })).toBeInTheDocument()
  })
})

describe('ExportModal — close', () => {
  it('calls onClose when × is clicked', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    const onClose = jest.fn()
    render(<ExportModal sessionId="sess-1" onClose={onClose} />)
    await screen.findByRole('button', { name: '×' })
    await userEvent.click(screen.getByRole('button', { name: '×' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('calls onClose when backdrop is clicked', async () => {
    mockFetch.mockReturnValue(settingsOk(SETTINGS_WITH_TOKEN))
    const onClose = jest.fn()
    const { container } = render(<ExportModal sessionId="sess-1" onClose={onClose} />)
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement
    await userEvent.click(backdrop)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
