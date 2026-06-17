import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FloatingActionMenu from '@/components/FloatingActionMenu'

jest.mock('@/components/HelpButton', () => function MockHelpButton() { return <div data-testid="help-button">Help</div> })
jest.mock('@/components/FeedbackButton', () => function MockFeedbackButton() { return <div data-testid="feedback-button">Feedback</div> })

// ---------------------------------------------------------------------------
// ? toggle button
// ---------------------------------------------------------------------------

describe('FloatingActionMenu — toggle button', () => {
  it('renders the ? button', () => {
    render(<FloatingActionMenu />)
    expect(screen.getByTitle('Help & Feedback')).toBeInTheDocument()
  })

  it('? button shows "?" label when closed', () => {
    render(<FloatingActionMenu />)
    expect(screen.getByTitle('Help & Feedback')).toHaveTextContent('?')
  })

  it('? button shows "×" label when open', async () => {
    const user = userEvent.setup()
    render(<FloatingActionMenu />)
    await user.click(screen.getByTitle('Help & Feedback'))
    expect(screen.getByTitle('Close')).toHaveTextContent('×')
  })
})

// ---------------------------------------------------------------------------
// Expand / collapse
// ---------------------------------------------------------------------------

describe('FloatingActionMenu — expand/collapse', () => {
  it('Help and Feedback buttons are pointer-events-none when closed', () => {
    render(<FloatingActionMenu />)
    const helpBtn = screen.getByTestId('help-button')
    expect(helpBtn.closest('.pointer-events-none')).not.toBeNull()
  })

  it('Help and Feedback buttons are pointer-events-auto after opening', async () => {
    const user = userEvent.setup()
    render(<FloatingActionMenu />)
    await user.click(screen.getByTitle('Help & Feedback'))
    const helpBtn = screen.getByTestId('help-button')
    expect(helpBtn.closest('.pointer-events-none')).toBeNull()
  })

  it('closes when ? is clicked a second time', async () => {
    const user = userEvent.setup()
    render(<FloatingActionMenu />)
    await user.click(screen.getByTitle('Help & Feedback'))
    await user.click(screen.getByTitle('Close'))
    const helpBtn = screen.getByTestId('help-button')
    expect(helpBtn.closest('.pointer-events-none')).not.toBeNull()
  })

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<FloatingActionMenu />)
    await user.click(screen.getByTitle('Help & Feedback'))
    // The backdrop is a fixed inset-0 div rendered before the menu container
    const backdrop = document.querySelector('.fixed.inset-0')
    await user.click(backdrop!)
    const helpBtn = screen.getByTestId('help-button')
    expect(helpBtn.closest('.pointer-events-none')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// rightOffset prop
// ---------------------------------------------------------------------------

describe('FloatingActionMenu — rightOffset prop', () => {
  it('applies default right offset of 20px when no prop is given', () => {
    render(<FloatingActionMenu />)
    const container = document.querySelector('[style*="right"]') as HTMLElement
    expect(container?.style.right).toBe('20px')
  })

  it('shifts right by rightOffset px when prop is supplied', () => {
    render(<FloatingActionMenu rightOffset={320} />)
    const container = document.querySelector('[style*="right"]') as HTMLElement
    expect(container?.style.right).toBe('340px')
  })
})
