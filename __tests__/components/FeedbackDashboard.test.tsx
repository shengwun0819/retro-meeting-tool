import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedbackDashboard from '@/app/feedback/page'
import type { Feedback } from '@/types'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock useUser — overridable per test
let mockUser: { id: string; name: string; color: string } | null = null
jest.mock('@/contexts/UserContext', () => ({
  useUser: () => ({
    user: mockUser,
    authName: '',
    authEmail: '',
    setUserName: jest.fn(),
    clearUser: jest.fn(),
    signOut: jest.fn(),
  }),
}))

// Mock useTheme — minimal
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, toggleTheme: jest.fn() }),
}))

// Mock useToast
const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() }
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => mockToast,
}))

const FIXTURE: Feedback[] = [
  {
    id: 'fb-1',
    content: 'Spotlight cursor disappears',
    user_id: 'me',
    author_name: 'Kevin',
    status: 'pending',
    admin_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fb-2',
    content: 'Auto-arrange overlap',
    user_id: 'someone-else',
    author_name: 'Anna',
    status: 'done',
    admin_note: 'Fixed in v1.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fb-3',
    content: 'Add dark mode toggle',
    user_id: 'me',
    author_name: 'Kevin',
    status: 'in_progress',
    admin_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

beforeEach(() => {
  mockFetch.mockReset()
  mockToast.success.mockReset()
  mockToast.error.mockReset()
  mockUser = null
  // Default: GET /api/feedback returns the fixture
  mockFetch.mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/feedback' && (!init || init.method === undefined)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ feedback: FIXTURE }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

describe('FeedbackDashboard — list rendering', () => {
  it('shows skeleton loader initially', () => {
    render(<FeedbackDashboard />)
    // role=status with aria-label is the skeleton list
    expect(screen.getByRole('status', { name: /loading feedback/i })).toBeInTheDocument()
  })

  it('renders all feedback items after fetch resolves', async () => {
    render(<FeedbackDashboard />)
    expect(await screen.findByText('Spotlight cursor disappears')).toBeInTheDocument()
    expect(screen.getByText('Auto-arrange overlap')).toBeInTheDocument()
    expect(screen.getByText('Add dark mode toggle')).toBeInTheDocument()
  })

  it('shows author name and status chip per item', async () => {
    render(<FeedbackDashboard />)
    expect(await screen.findByText('Spotlight cursor disappears')).toBeInTheDocument()
    expect(screen.getAllByText(/kevin/i).length).toBeGreaterThan(0)
    // Each status label appears at least once (filter chip + status badge on items)
    expect(screen.getAllByText(/^Pending$/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^Done$/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/in progress/i).length).toBeGreaterThan(0)
  })

  it('renders existing admin reply when present', async () => {
    render(<FeedbackDashboard />)
    expect(await screen.findByText('Fixed in v1.0')).toBeInTheDocument()
  })

  it('shows empty state when feedback list is empty', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ feedback: [] }) })
    render(<FeedbackDashboard />)
    expect(await screen.findByText(/no feedback to show/i)).toBeInTheDocument()
  })
})

describe('FeedbackDashboard — tabs', () => {
  it('All tab shows total count of all feedback', async () => {
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')
    expect(screen.getByRole('button', { name: /^all \(3\)/i })).toBeInTheDocument()
  })

  it('My Feedback tab is disabled when not signed in', async () => {
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')
    const myTab = screen.getByRole('button', { name: /my feedback/i })
    expect(myTab).toBeDisabled()
  })

  it('My Feedback tab filters to current user’s items', async () => {
    mockUser = { id: 'me', name: 'Kevin', color: '#fff' }
    const user = userEvent.setup()
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')

    const myTab = screen.getByRole('button', { name: /my feedback \(2\)/i })
    expect(myTab).not.toBeDisabled()
    await user.click(myTab)

    // Mine: fb-1, fb-3
    expect(screen.getByText('Spotlight cursor disappears')).toBeInTheDocument()
    expect(screen.getByText('Add dark mode toggle')).toBeInTheDocument()
    expect(screen.queryByText('Auto-arrange overlap')).not.toBeInTheDocument()
  })

  it('shows "yours" badge on items belonging to current user', async () => {
    mockUser = { id: 'me', name: 'Kevin', color: '#fff' }
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')
    expect(screen.getAllByText(/yours/i)).toHaveLength(2)
  })
})

describe('FeedbackDashboard — status filter', () => {
  it('filters list when a status chip is clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')

    // Click "Done" filter chip — there will be two "Done" texts (filter + status badge)
    const doneFilterChip = screen.getAllByRole('button', { name: /done/i })[0]
    await user.click(doneFilterChip)

    expect(screen.getByText('Auto-arrange overlap')).toBeInTheDocument()
    expect(screen.queryByText('Spotlight cursor disappears')).not.toBeInTheDocument()
  })
})

describe('FeedbackDashboard — status edit', () => {
  it('PATCHes /api/feedback/:id when status is changed via dropdown', async () => {
    const user = userEvent.setup()
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')

    const item = screen.getByText('Spotlight cursor disappears').closest('li')!
    const select = within(item).getByTitle(/change status/i) as HTMLSelectElement
    await user.selectOptions(select, 'in_progress')

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(c => c[0] === '/api/feedback/fb-1' && c[1]?.method === 'PATCH')
      expect(patchCall).toBeTruthy()
      expect(JSON.parse(patchCall![1].body)).toEqual({ status: 'in_progress' })
    })
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/in progress/i))
  })

  it('shows error toast and reverts status when PATCH fails', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/feedback' && !init?.method) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ feedback: FIXTURE }) })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
    const user = userEvent.setup()
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')

    const item = screen.getByText('Spotlight cursor disappears').closest('li')!
    const select = within(item).getByTitle(/change status/i) as HTMLSelectElement
    await user.selectOptions(select, 'done')

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled())
    // Reverted back to original 'pending'
    expect(select.value).toBe('pending')
  })
})

describe('FeedbackDashboard — admin reply edit', () => {
  it('saves admin note via PATCH', async () => {
    const user = userEvent.setup()
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')

    const item = screen.getByText('Spotlight cursor disappears').closest('li')!
    await user.click(within(item).getByText(/\+ add reply/i))

    const textarea = within(item).getByPlaceholderText(/reply/i)
    await user.type(textarea, 'Will look at this')
    await user.click(within(item).getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(c => c[0] === '/api/feedback/fb-1' && c[1]?.method === 'PATCH')
      expect(patchCall).toBeTruthy()
      expect(JSON.parse(patchCall![1].body)).toEqual({ admin_note: 'Will look at this' })
    })
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/note saved/i))
  })

  it('clicking an existing reply opens it for editing', async () => {
    const user = userEvent.setup()
    render(<FeedbackDashboard />)
    await screen.findByText('Auto-arrange overlap')

    const item = screen.getByText('Auto-arrange overlap').closest('li')!
    await user.click(within(item).getByText(/fixed in v1\.0/i))

    expect(within(item).getByPlaceholderText(/reply/i)).toHaveValue('Fixed in v1.0')
  })

  it('Cancel button discards admin note edit', async () => {
    const user = userEvent.setup()
    render(<FeedbackDashboard />)
    await screen.findByText('Spotlight cursor disappears')

    const item = screen.getByText('Spotlight cursor disappears').closest('li')!
    await user.click(within(item).getByText(/\+ add reply/i))
    await user.type(within(item).getByPlaceholderText(/reply/i), 'Drafting...')
    await user.click(within(item).getByRole('button', { name: /cancel/i }))

    expect(within(item).queryByPlaceholderText(/reply/i)).not.toBeInTheDocument()
    // No PATCH should have been issued
    const patchCall = mockFetch.mock.calls.find(c => c[1]?.method === 'PATCH')
    expect(patchCall).toBeUndefined()
  })
})
