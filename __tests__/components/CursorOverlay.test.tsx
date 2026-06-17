import { render, screen } from '@testing-library/react'
import CursorOverlay from '@/components/board/CursorOverlay'
import { CursorPosition } from '@/types'

const cursors: CursorPosition[] = [
  { userId: 'user-2', userName: 'Bob', x: 100, y: 200, color: '#ef4444' },
  { userId: 'user-3', userName: 'Carol', x: 300, y: 400, color: '#3b82f6' },
]

describe('CursorOverlay', () => {
  it('renders remote cursors', () => {
    render(<CursorOverlay cursors={cursors} currentUserId="user-1" />)
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('does not render the current user cursor', () => {
    const withSelf: CursorPosition[] = [
      ...cursors,
      { userId: 'user-1', userName: 'Alice', x: 50, y: 50, color: '#22c55e' },
    ]
    render(<CursorOverlay cursors={withSelf} currentUserId="user-1" />)
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders nothing when hidden=true', () => {
    const { container } = render(
      <CursorOverlay cursors={cursors} currentUserId="user-1" hidden />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders normally when hidden=false', () => {
    render(<CursorOverlay cursors={cursors} currentUserId="user-1" hidden={false} />)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders spotlit cursor with larger SVG', () => {
    const { container } = render(
      <CursorOverlay cursors={cursors} currentUserId="user-1" spotlightUserId="user-2" />
    )
    // Spotlit user has 44x44 SVG, normal has 20x20
    const svgs = container.querySelectorAll('svg')
    const sizes = Array.from(svgs).map(s => s.getAttribute('width'))
    expect(sizes).toContain('44') // Bob is spotlit
    expect(sizes).toContain('20') // Carol is normal
  })

  it('renders all cursors as normal when spotlightUserId is null', () => {
    const { container } = render(
      <CursorOverlay cursors={cursors} currentUserId="user-1" spotlightUserId={null} />
    )
    const svgs = container.querySelectorAll('svg')
    const sizes = Array.from(svgs).map(s => s.getAttribute('width'))
    expect(sizes.every(s => s === '20')).toBe(true)
  })
})
