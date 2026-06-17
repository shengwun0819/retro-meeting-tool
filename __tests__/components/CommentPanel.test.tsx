import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentPanel from '@/components/modals/CommentPanel'
import { StickyNote, Comment } from '@/types'

const CURRENT_USER = { id: 'user-1', name: 'Alice' }
const OTHER_USER_ID = 'user-99'

function makeNote(overrides: Partial<StickyNote> = {}): StickyNote {
  return {
    id: 'note-1',
    board_id: 'board-1',
    section_id: 'continue',
    content: 'Test note',
    color: '#bbf7d0',
    author_id: 'user-1',
    author_name: 'Alice',
    pos_x: 0.1,
    pos_y: 0.1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reactions: [],
    comments: [],
    ...overrides,
  }
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    sticky_note_id: 'note-1',
    author_id: 'user-1',
    author_name: 'Alice',
    content: 'Hello there!',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function setup(note: StickyNote | null = makeNote()) {
  const onClose = jest.fn()
  const onAddComment = jest.fn().mockResolvedValue(undefined)
  const onDeleteComment = jest.fn()
  const onEditComment = jest.fn().mockResolvedValue(undefined)
  render(
    <CommentPanel
      note={note}
      currentUser={CURRENT_USER}
      onClose={onClose}
      onAddComment={onAddComment}
      onDeleteComment={onDeleteComment}
      onEditComment={onEditComment}
    />
  )
  return { onClose, onAddComment, onDeleteComment, onEditComment }
}

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe('CommentPanel — rendering', () => {
  it('returns nothing when note is null', () => {
    const { container } = render(
      <CommentPanel
        note={null}
        currentUser={CURRENT_USER}
        onClose={jest.fn()}
        onAddComment={jest.fn()}
        onDeleteComment={jest.fn()}
        onEditComment={jest.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows the note content as a preview', () => {
    setup(makeNote({ content: 'Sprint planning needed' }))
    expect(screen.getByText('Sprint planning needed')).toBeInTheDocument()
  })

  it('shows the author name in the preview', () => {
    setup(makeNote({ author_name: 'Bob' }))
    expect(screen.getByText(/— Bob/)).toBeInTheDocument()
  })

  it('shows empty state when there are no comments', () => {
    setup()
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('renders comment content', () => {
    setup(makeNote({ comments: [makeComment({ content: 'Great idea!' })] }))
    expect(screen.getByText('Great idea!')).toBeInTheDocument()
  })

  it('renders multiple comments', () => {
    const comments = [
      makeComment({ id: 'c1', content: 'First comment' }),
      makeComment({ id: 'c2', content: 'Second comment' }),
    ]
    setup(makeNote({ comments }))
    expect(screen.getByText('First comment')).toBeInTheDocument()
    expect(screen.getByText('Second comment')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Own comment highlight
// ---------------------------------------------------------------------------

describe('CommentPanel — own comment highlight', () => {
  it('applies blue background to own comments', () => {
    const ownComment = makeComment({ author_id: CURRENT_USER.id, content: 'My comment' })
    setup(makeNote({ comments: [ownComment] }))
    const commentText = screen.getByText('My comment')
    const commentCard = commentText.closest('.rounded-xl')
    expect(commentCard).toHaveClass('bg-blue-50')
  })

  it('applies gray background to other users comments', () => {
    const otherComment = makeComment({ author_id: OTHER_USER_ID, author_name: 'Carol', content: "Carol's comment" })
    setup(makeNote({ comments: [otherComment] }))
    const commentText = screen.getByText("Carol's comment")
    const commentCard = commentText.closest('.rounded-xl')
    expect(commentCard).toHaveClass('bg-gray-50')
    expect(commentCard).not.toHaveClass('bg-blue-50')
  })

  it('correctly distinguishes own vs other comments in a mixed list', () => {
    const comments = [
      makeComment({ id: 'c1', author_id: CURRENT_USER.id, content: 'Mine' }),
      makeComment({ id: 'c2', author_id: OTHER_USER_ID, author_name: 'Dave', content: 'Not mine' }),
    ]
    setup(makeNote({ comments }))
    expect(screen.getByText('Mine').closest('.rounded-xl')).toHaveClass('bg-blue-50')
    expect(screen.getByText('Not mine').closest('.rounded-xl')).toHaveClass('bg-gray-50')
  })
})

// ---------------------------------------------------------------------------
// Comment submission
// ---------------------------------------------------------------------------

describe('CommentPanel — comment submission', () => {
  it('calls onAddComment with note id and content on submit', async () => {
    const user = userEvent.setup()
    const { onAddComment } = setup()
    await user.type(screen.getByPlaceholderText(/add a comment/i), 'Great work!')
    await user.click(screen.getByRole('button', { name: '↑' }))
    expect(onAddComment).toHaveBeenCalledWith('note-1', 'Great work!')
  })

  it('submit button is disabled when input is empty', () => {
    setup()
    expect(screen.getByRole('button', { name: '↑' })).toBeDisabled()
  })

  it('clears input after successful submit', async () => {
    const user = userEvent.setup()
    setup()
    const input = screen.getByPlaceholderText(/add a comment/i)
    await user.type(input, 'A comment')
    await user.click(screen.getByRole('button', { name: '↑' }))
    expect(input).toHaveValue('')
  })
})

// ---------------------------------------------------------------------------
// Close behaviour
// ---------------------------------------------------------------------------

describe('CommentPanel — close behaviour', () => {
  it('calls onClose when × button is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('button', { name: '×' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
