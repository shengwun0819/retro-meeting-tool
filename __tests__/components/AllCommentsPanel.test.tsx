import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AllCommentsPanel from '@/components/modals/AllCommentsPanel'
import { StickyNote } from '@/types'

const CURRENT_USER = { id: 'user-1', name: 'Alice', color: '#3b82f6' }

function makeNote(overrides: Partial<StickyNote> = {}): StickyNote {
  return {
    id: 'note-1',
    board_id: 'board-1',
    section_id: 'continue',
    content: 'Test note content',
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

function setup(notes: StickyNote[] = []) {
  const onClose = jest.fn()
  const onDeleteComment = jest.fn()
  const onAddComment = jest.fn().mockResolvedValue(undefined)
  const onEditComment = jest.fn().mockResolvedValue(undefined)
  render(
    <AllCommentsPanel
      notes={notes}
      currentUser={CURRENT_USER}
      onClose={onClose}
      onDeleteComment={onDeleteComment}
      onAddComment={onAddComment}
      onEditComment={onEditComment}
    />
  )
  return { onClose, onDeleteComment, onAddComment, onEditComment }
}

describe('AllCommentsPanel', () => {
  it('shows empty state when no notes have comments', () => {
    setup([makeNote()])
    expect(screen.getByText('No comments yet')).toBeInTheDocument()
  })

  it('shows total comment count in header', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hello', created_at: new Date().toISOString() },
        { id: 'c2', sticky_note_id: 'note-1', author_id: 'user-2', author_name: 'Bob', content: 'World', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.getByText(/2 comments/i)).toBeInTheDocument()
  })

  it('renders note content for notes that have comments', () => {
    const note = makeNote({
      content: 'My important note',
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Nice!', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.getByText('My important note')).toBeInTheDocument()
  })

  it('renders comment content', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Great idea!', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.getByText('Great idea!')).toBeInTheDocument()
  })

  it('does not show notes without comments', () => {
    const noteWithComment = makeNote({
      id: 'note-1',
      content: 'Note with comment',
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
      ],
    })
    const noteWithoutComment = makeNote({ id: 'note-2', content: 'Note without comment', comments: [] })
    setup([noteWithComment, noteWithoutComment])
    expect(screen.getByText('Note with comment')).toBeInTheDocument()
    expect(screen.queryByText('Note without comment')).not.toBeInTheDocument()
  })

  it('clicking Reply opens the inline reply view with a back button', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.queryByTitle('Back to all comments')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /reply/i }))
    expect(screen.getByTitle('Back to all comments')).toBeInTheDocument()
  })

  it('clicking back button from reply view returns to list', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    await user.click(screen.getByRole('button', { name: /reply/i }))
    expect(screen.getByTitle('Back to all comments')).toBeInTheDocument()
    await user.click(screen.getByTitle('Back to all comments'))
    expect(screen.queryByTitle('Back to all comments')).not.toBeInTheDocument()
  })

  it('Escape key goes back to list when in reply view, then closes', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
      ],
    })
    const { onClose } = setup([note])
    await user.click(screen.getByRole('button', { name: /reply/i }))
    // First Escape → goes back to list
    await user.keyboard('{Escape}')
    expect(screen.queryByTitle('Back to all comments')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    // Second Escape → closes the panel
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup([])
    // Close button (X icon)
    const closeButtons = screen.getAllByRole('button')
    const closeBtn = closeButtons.find(b => b.querySelector('svg line'))
    await user.click(closeBtn!)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const { onClose } = setup([])
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('shows delete button for own comments on hover', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'My comment', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    // Delete button exists (opacity-0 by default, visible on hover)
    const deleteBtn = screen.getByTitle('Delete comment')
    expect(deleteBtn).toBeInTheDocument()
  })

  it('does not show delete button for other users comments', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-99', author_name: 'Bob', content: 'Not mine', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.queryByTitle('Delete comment')).not.toBeInTheDocument()
  })

  it('calls onDeleteComment when delete button is clicked', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'My comment', created_at: new Date().toISOString() },
      ],
    })
    const { onDeleteComment } = setup([note])
    await user.click(screen.getByTitle('Delete comment'))
    expect(onDeleteComment).toHaveBeenCalledWith('c1')
  })

  it('shows correct section label for note', () => {
    const note = makeNote({ section_id: 'stop' })
    note.comments = [
      { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
    ]
    setup([note])
    expect(screen.getByText(/stop/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Reply view (inline slide-in panel)
// ---------------------------------------------------------------------------

const BASE_COMMENT = {
  id: 'c1',
  sticky_note_id: 'note-1',
  author_id: 'user-1',
  author_name: 'Alice',
  content: 'Original content',
  created_at: new Date().toISOString(),
}

async function setupReplyView() {
  const user = userEvent.setup()
  const note = makeNote({ comments: [BASE_COMMENT] })
  const handlers = setup([note])
  await user.click(screen.getByRole('button', { name: /reply/i }))
  return { user, note, ...handlers }
}

describe('AllCommentsPanel — reply view', () => {
  it('shows the note content as a preview card', async () => {
    await setupReplyView()
    // makeNote default content is 'Test note content'
    expect(screen.getAllByText('Test note content').length).toBeGreaterThan(0)
  })

  it('renders the comment content inside the reply view', async () => {
    await setupReplyView()
    // Both list view and reply view are in the DOM simultaneously (CSS translateX hides one visually)
    expect(screen.getAllByText('Original content')).toHaveLength(2)
  })

  it('shows the reply input field when currentUser is set', async () => {
    await setupReplyView()
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
  })

  it('calls onAddComment when reply is submitted', async () => {
    const { user, note, onAddComment } = await setupReplyView()
    const input = screen.getByPlaceholderText('Add a comment...')
    await user.type(input, 'New reply')
    await user.click(screen.getByRole('button', { name: '↑' }))
    expect(onAddComment).toHaveBeenCalledWith(note.id, 'New reply')
  })

  it('shows the edit button (title="Edit") for comments in reply view', async () => {
    await setupReplyView()
    expect(screen.getByTitle('Edit')).toBeInTheDocument()
  })

  it('clicking edit button shows textarea pre-filled with comment content', async () => {
    const { user } = await setupReplyView()
    await user.click(screen.getByTitle('Edit'))
    // getByDisplayValue finds the textarea by its current value
    expect(screen.getByDisplayValue('Original content')).toBeInTheDocument()
  })

  it('calls onEditComment with updated content when Save is clicked', async () => {
    const { user, onEditComment } = await setupReplyView()
    await user.click(screen.getByTitle('Edit'))
    const textarea = screen.getByDisplayValue('Original content')
    await user.clear(textarea)
    await user.type(textarea, 'Updated content')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onEditComment).toHaveBeenCalledWith('c1', 'Updated content')
  })

  it('Cancel hides the edit form and shows the original comment content again', async () => {
    const { user } = await setupReplyView()
    await user.click(screen.getByTitle('Edit'))
    expect(screen.getByDisplayValue('Original content')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByDisplayValue('Original content')).not.toBeInTheDocument()
    // Comment content still rendered as plain text (× 2: list view + reply view)
    expect(screen.getAllByText('Original content')).toHaveLength(2)
  })

  it('shows the delete button (title="Delete") in reply view and calls onDeleteComment', async () => {
    const { user, onDeleteComment } = await setupReplyView()
    await user.click(screen.getByTitle('Delete'))
    expect(onDeleteComment).toHaveBeenCalledWith('c1')
  })
})

// ---------------------------------------------------------------------------
// Reply view — own comment highlight
// ---------------------------------------------------------------------------

describe('AllCommentsPanel — reply view own comment highlight', () => {
  it('applies blue background to own comments in reply view', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [{
        id: 'c1', sticky_note_id: 'note-1',
        author_id: CURRENT_USER.id, author_name: 'Alice',
        content: 'My reply comment', created_at: new Date().toISOString(),
      }],
    })
    setup([note])
    await user.click(screen.getByRole('button', { name: /reply/i }))
    // List view uses rounded-lg; reply view uses rounded-xl
    const texts = screen.getAllByText('My reply comment')
    const replyCard = texts.map(t => t.closest('.rounded-xl')).find(Boolean)
    expect(replyCard).toHaveClass('bg-blue-50')
  })

  it('applies gray background to other users comments in reply view', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [{
        id: 'c2', sticky_note_id: 'note-1',
        author_id: 'user-99', author_name: 'Carol',
        content: "Carol's reply", created_at: new Date().toISOString(),
      }],
    })
    setup([note])
    await user.click(screen.getByRole('button', { name: /reply/i }))
    const texts = screen.getAllByText("Carol's reply")
    const replyCard = texts.map(t => t.closest('.rounded-xl')).find(Boolean)
    expect(replyCard).toHaveClass('bg-gray-50')
    expect(replyCard).not.toHaveClass('bg-blue-50')
  })
})
