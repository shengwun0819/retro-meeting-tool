import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedbackButton from '@/components/FeedbackButton'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Per-test override for useUser; default returns no user / no auth name.
let mockUserContext: { user: { id: string; name: string; color: string } | null; authName: string } = {
  user: null,
  authName: '',
}
jest.mock('@/contexts/UserContext', () => ({
  useUser: () => ({
    ...mockUserContext,
    authEmail: '',
    setUserName: jest.fn(),
    clearUser: jest.fn(),
    signOut: jest.fn(),
  }),
}))

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true })
  mockUserContext = { user: null, authName: '' }
})

function setup() {
  render(<FeedbackButton />)
}

describe('FeedbackButton', () => {
  it('renders the floating feedback button', () => {
    setup()
    expect(screen.getByRole('button', { name: /feedback/i })).toBeInTheDocument()
  })

  it('does not show the modal initially', () => {
    setup()
    expect(screen.queryByPlaceholderText(/e\.g\./i)).not.toBeInTheDocument()
  })

  it('opens the modal when feedback button is clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    expect(screen.getByText(/share your feedback/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\./i)).toBeInTheDocument()
  })

  it('closes the modal when Cancel is clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => expect(screen.queryByText(/share your feedback/i)).not.toBeInTheDocument())
  })

  it('closes the modal when × is clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.click(screen.getByRole('button', { name: '×' }))
    await waitFor(() => expect(screen.queryByText(/share your feedback/i)).not.toBeInTheDocument())
  })

  it('Send button is disabled when textarea is empty', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('Send button becomes enabled when feedback is typed', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Great tool!')
    expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled()
  })

  it('calls POST /api/feedback with the typed content and submitter info', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Loving this tool')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.content).toBe('Loving this tool')
    // No user / authName mocked — userId is null, authorName is empty string (falls through to '' from authName)
    expect(body).toHaveProperty('userId', null)
    expect(body).toHaveProperty('authorName', '')
  })

  it('shows "Sent!" confirmation after sending', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Nice UX!')
    await user.click(screen.getByRole('button', { name: /^send$/i }))
    expect(await screen.findByText(/sent!/i)).toBeInTheDocument()
  })

  it('shows Open Dashboard link in success state', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Great!')
    await user.click(screen.getByRole('button', { name: /^send$/i }))
    const link = await screen.findByRole('link', { name: /open dashboard/i })
    expect(link).toHaveAttribute('href', '/feedback')
  })
})

// ---------------------------------------------------------------------------
// Submitter info — pulled from UserContext when available
// ---------------------------------------------------------------------------

describe('FeedbackButton — submitter info', () => {
  it('falls back to authName when no nickname is set', async () => {
    mockUserContext = { user: null, authName: 'Kevin (auth)' }
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Hi')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.userId).toBeNull()
    expect(body.authorName).toBe('Kevin (auth)')
  })

  it('uses user.id and user.name when nickname is set', async () => {
    mockUserContext = {
      user: { id: 'user-123', name: 'Kevin', color: '#fff' },
      authName: 'Kevin (auth)',
    }
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Hi')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.userId).toBe('user-123')
    expect(body.authorName).toBe('Kevin')
  })
})

// ---------------------------------------------------------------------------
// Portal rendering
// ---------------------------------------------------------------------------

describe('FeedbackButton — portal rendering', () => {
  it('renders the modal as a direct child of document.body', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    const backdrop = document.body.querySelector('.fixed.inset-0')
    expect(backdrop).not.toBeNull()
    expect(backdrop?.parentElement).toBe(document.body)
  })
})
