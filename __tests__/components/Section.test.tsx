import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Section from '@/components/board/Section'
import { SectionConfig } from '@/types'

const MOCK_CONFIG: SectionConfig = {
  id: 'continue',
  title: 'Continue',
  emoji: '✅',
  subtitle: 'What went well?',
  headerBg: 'bg-emerald-500',
  sectionBg: 'bg-emerald-50',
  sectionDarkBg: 'dark:bg-emerald-950/20',
  defaultNoteColor: '#bbf7d0',
}

function setup(overrides: Partial<Parameters<typeof Section>[0]> = {}) {
  const onAddNote = jest.fn()
  render(
    <Section
      config={MOCK_CONFIG}
      noteCount={0}
      onAddNote={onAddNote}
      {...overrides}
    />
  )
  return { onAddNote }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('Section — rendering', () => {
  it('renders the section emoji', () => {
    setup()
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  it('renders the section title', () => {
    setup()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('renders the note count badge', () => {
    setup({ noteCount: 5 })
    expect(screen.getByTitle('Notes in this section')).toHaveTextContent('5')
  })

  it('note count badge shows 0 when noteCount is 0', () => {
    setup({ noteCount: 0 })
    expect(screen.getByTitle('Notes in this section')).toHaveTextContent('0')
  })

  it('renders the + add button with correct title', () => {
    setup()
    expect(screen.getByTitle('Add sticky note to Continue')).toBeInTheDocument()
  })

  it('+ button has high-contrast styling (not transparent text)', () => {
    setup()
    const btn = screen.getByTitle('Add sticky note to Continue')
    // Should have visible background — not the old invisible bg-white/60 text-white
    expect(btn.className).toMatch(/bg-white/)
    expect(btn.className).toMatch(/text-gray/)
  })

})

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('Section — empty state', () => {
  it('shows empty state hint when noteCount is 0', () => {
    setup({ noteCount: 0 })
    expect(screen.getByText(/click/i)).toBeInTheDocument()
  })

  it('does not show empty state hint when noteCount is greater than 0', () => {
    setup({ noteCount: 3 })
    expect(screen.queryByText(/click.*add your first note/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

describe('Section — interactions', () => {
  it('calls onAddNote with the section id when + is clicked', async () => {
    const user = userEvent.setup()
    const { onAddNote } = setup()
    await user.click(screen.getByTitle('Add sticky note to Continue'))
    expect(onAddNote).toHaveBeenCalledWith('continue')
  })

})

// ---------------------------------------------------------------------------
// Highlighted state
// ---------------------------------------------------------------------------

describe('Section — highlighted state', () => {
  it('applies highlight border class when isHighlighted is true', () => {
    const { container } = render(
      <Section
        config={MOCK_CONFIG}
        noteCount={0}
        onAddNote={jest.fn()}
        isHighlighted
      />
    )
    expect(container.firstChild).toHaveClass('border-blue-400')
  })

  it('does not apply highlight border class when isHighlighted is false', () => {
    const { container } = render(
      <Section
        config={MOCK_CONFIG}
        noteCount={0}
        onAddNote={jest.fn()}
        isHighlighted={false}
      />
    )
    expect(container.firstChild).not.toHaveClass('border-blue-400')
  })
})
