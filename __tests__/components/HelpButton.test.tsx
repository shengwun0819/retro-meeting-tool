import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HelpButton from '@/components/HelpButton'

// Mock next/navigation
const mockUsePathname = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

function setup(pathname = '/') {
  mockUsePathname.mockReturnValue(pathname)
  render(<HelpButton />)
}

// ---------------------------------------------------------------------------
// Button rendering
// ---------------------------------------------------------------------------

describe('HelpButton — button', () => {
  it('renders the 💡 Help button', () => {
    setup()
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument()
  })

  it('does not show the modal initially', () => {
    setup()
    expect(screen.queryByText(/board help/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/how to use the homepage/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Modal open / close
// ---------------------------------------------------------------------------

describe('HelpButton — modal open/close', () => {
  it('opens the modal when Help button is clicked', async () => {
    const user = userEvent.setup()
    setup('/')
    await user.click(screen.getByRole('button', { name: /help/i }))
    expect(screen.getByText(/how to use the homepage/i)).toBeInTheDocument()
  })

  it('closes the modal when × is clicked', async () => {
    const user = userEvent.setup()
    setup('/')
    await user.click(screen.getByRole('button', { name: /help/i }))
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(screen.queryByText(/how to use the homepage/i)).not.toBeInTheDocument()
  })

  it('closes the modal when backdrop is clicked', async () => {
    const user = userEvent.setup()
    setup('/')
    await user.click(screen.getByRole('button', { name: /help/i }))
    const backdrop = document.querySelector('.fixed.inset-0')
    await user.click(backdrop!)
    expect(screen.queryByText(/how to use the homepage/i)).not.toBeInTheDocument()
  })

  it('closes the modal when Escape is pressed', async () => {
    const user = userEvent.setup()
    setup('/')
    await user.click(screen.getByRole('button', { name: /help/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByText(/how to use the homepage/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Content by route
// ---------------------------------------------------------------------------

describe('HelpButton — content by route', () => {
  it('shows home help content on the homepage', async () => {
    const user = userEvent.setup()
    setup('/')
    await user.click(screen.getByRole('button', { name: /help/i }))
    expect(screen.getByText('Start New Retro')).toBeInTheDocument()
    expect(screen.getByText('Recent Sessions')).toBeInTheDocument()
  })

  it('shows board help content on a board route', async () => {
    const user = userEvent.setup()
    setup('/board/some-uuid')
    await user.click(screen.getByRole('button', { name: /help/i }))
    expect(screen.getByText(/board help/i)).toBeInTheDocument()
    expect(screen.getByText('Sticky Notes')).toBeInTheDocument()
    expect(screen.getByText('Canvas Drawing Tools')).toBeInTheDocument()
  })

  it('shows subtitle "All board features at a glance" on board route', async () => {
    const user = userEvent.setup()
    setup('/board/some-uuid')
    await user.click(screen.getByRole('button', { name: /help/i }))
    expect(screen.getByText('All board features at a glance')).toBeInTheDocument()
  })

  it('shows subtitle "How to use the homepage" on home route', async () => {
    const user = userEvent.setup()
    setup('/')
    await user.click(screen.getByRole('button', { name: /help/i }))
    expect(screen.getByText('How to use the homepage')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Portal rendering
// ---------------------------------------------------------------------------

describe('HelpButton — portal rendering', () => {
  it('renders the modal as a direct child of document.body', async () => {
    const user = userEvent.setup()
    setup('/')
    await user.click(screen.getByRole('button', { name: /help/i }))
    const backdrop = document.body.querySelector('.fixed.inset-0')
    expect(backdrop).not.toBeNull()
    expect(backdrop?.parentElement).toBe(document.body)
  })
})
