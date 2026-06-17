import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmojiPicker from '@/components/board/EmojiPicker'

function setup() {
  const onSelect = jest.fn()
  const onClose = jest.fn()
  render(<EmojiPicker onSelect={onSelect} onClose={onClose} />)
  return { onSelect, onClose }
}

describe('EmojiPicker', () => {
  it('renders 8 category tab buttons', () => {
    setup()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(8)
  })

  it('shows emoji buttons in the default category', () => {
    setup()
    // First category (Smileys) should show 😀 in the grid
    expect(screen.getByRole('button', { name: '😀' })).toBeInTheDocument()
  })

  it('calls onSelect with the clicked emoji', async () => {
    const user = userEvent.setup()
    const { onSelect } = setup()
    await user.click(screen.getByRole('button', { name: '😀' }))
    expect(onSelect).toHaveBeenCalledWith('😀')
  })

  it('calls onClose after selecting an emoji', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('button', { name: '😀' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches to another category on tab click', async () => {
    const user = userEvent.setup()
    setup()
    // Click the 🍕 (food) category tab (role="tab")
    await user.click(screen.getByRole('tab', { name: 'category-🍕' }))
    // 🍕 should now appear as a selectable emoji button in the grid
    expect(screen.getByRole('button', { name: '🍕' })).toBeInTheDocument()
  })

  it('shows different emoji after switching category', async () => {
    const user = userEvent.setup()
    setup()
    // Switch to activities category ⚽
    await user.click(screen.getByRole('tab', { name: 'category-⚽' }))
    // ⚽ should appear in the grid
    expect(screen.getByRole('button', { name: '⚽' })).toBeInTheDocument()
  })

  it('opens upward (bottom-10) by default when openDown is not set', () => {
    const { container } = render(<EmojiPicker onSelect={jest.fn()} onClose={jest.fn()} />)
    expect(container.firstChild).toHaveClass('bottom-10')
    expect(container.firstChild).not.toHaveClass('top-8')
  })

  it('opens downward (top-8) when openDown is true', () => {
    const { container } = render(<EmojiPicker onSelect={jest.fn()} onClose={jest.fn()} openDown={true} />)
    expect(container.firstChild).toHaveClass('top-8')
    expect(container.firstChild).not.toHaveClass('bottom-10')
  })
})
