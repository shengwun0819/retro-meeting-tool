import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActionItemModal from '@/components/modals/ActionItemModal'
import { ActionItem, StickyNote } from '@/types'

const CURRENT_USER = { id: 'user-1', name: 'Alice' }

function makeNote(overrides: Partial<StickyNote> = {}): StickyNote {
  return {
    id: 'note-1',
    board_id: 'board-1',
    section_id: 'continue',
    content: 'Fix the login bug',
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

function makeItem(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: 'item-1',
    board_id: 'board-1',
    title: 'Fix auth flow',
    status: 'Open',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function setup(options: {
  note?: StickyNote | null
  initialView?: 'list' | 'create'
  existingItems?: ActionItem[]
} = {}) {
  const onClose = jest.fn()
  const onCreate = jest.fn().mockResolvedValue(undefined)
  const onUpdate = jest.fn().mockResolvedValue(undefined)
  const onUpdateStatus = jest.fn().mockResolvedValue(undefined)
  const onDelete = jest.fn().mockResolvedValue(undefined)

  render(
    <ActionItemModal
      note={options.note ?? null}
      existingItems={options.existingItems ?? []}
      initialView={options.initialView}
      currentUser={CURRENT_USER}
      onClose={onClose}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onUpdateStatus={onUpdateStatus}
      onDelete={onDelete}
    />
  )
  return { onClose, onCreate, onUpdate, onUpdateStatus, onDelete }
}

describe('ActionItemModal — default (list view)', () => {
  it('opens in list view by default', () => {
    setup()
    expect(screen.getByRole('button', { name: /all items/i })).toHaveClass('border-b-2')
  })

  it('shows empty state when no items exist', () => {
    setup()
    expect(screen.getByText(/no action items yet/i)).toBeInTheDocument()
  })

  it('shows existing action items', () => {
    setup({ existingItems: [makeItem({ title: 'Write docs' })] })
    expect(screen.getByText('Write docs')).toBeInTheDocument()
  })

  it('shows item count in the tab label', () => {
    setup({ existingItems: [makeItem(), makeItem({ id: 'item-2', title: 'Another task' })] })
    expect(screen.getByText(/all items \(2\)/i)).toBeInTheDocument()
  })

  it('calls onClose when × button is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('button', { name: '×' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('calls onUpdateStatus when status badge is clicked', async () => {
    const user = userEvent.setup()
    const { onUpdateStatus } = setup({
      existingItems: [makeItem({ status: 'Open' })],
    })
    await user.click(screen.getByText('Open'))
    expect(onUpdateStatus).toHaveBeenCalledWith('item-1', 'InProgress')
  })

  it('calls onDelete when delete button on an item is clicked', async () => {
    const user = userEvent.setup()
    const { onDelete } = setup({ existingItems: [makeItem()] })
    await user.click(screen.getByTitle('Delete'))
    expect(onDelete).toHaveBeenCalledWith('item-1')
  })
})

describe('ActionItemModal — inline edit', () => {
  it('shows the edit form when the edit button is clicked', async () => {
    const user = userEvent.setup()
    setup({ existingItems: [makeItem({ title: 'Fix auth flow' })] })
    await user.click(screen.getByTitle('Edit'))
    expect(screen.getByDisplayValue('Fix auth flow')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('Save is disabled when title is cleared', async () => {
    const user = userEvent.setup()
    setup({ existingItems: [makeItem({ title: 'Fix auth flow' })] })
    await user.click(screen.getByTitle('Edit'))
    await user.clear(screen.getByDisplayValue('Fix auth flow'))
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('calls onUpdate with edited fields on Save', async () => {
    const user = userEvent.setup()
    const { onUpdate } = setup({ existingItems: [makeItem({ title: 'Fix auth flow' })] })
    await user.click(screen.getByTitle('Edit'))
    const titleInput = screen.getByDisplayValue('Fix auth flow')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated title')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onUpdate).toHaveBeenCalledWith('item-1', expect.objectContaining({ title: 'Updated title' }))
  })

  it('cancels edit and returns to normal view', async () => {
    const user = userEvent.setup()
    setup({ existingItems: [makeItem({ title: 'Fix auth flow' })] })
    await user.click(screen.getByTitle('Edit'))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(screen.getByText('Fix auth flow')).toBeInTheDocument()
  })

  it('pre-fills owner and due date fields in edit form', async () => {
    const user = userEvent.setup()
    setup({ existingItems: [makeItem({ owner_name: 'Bob', due_date: '2025-06-01' })] })
    await user.click(screen.getByTitle('Edit'))
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-06-01')).toBeInTheDocument()
  })
})

describe('ActionItemModal — initialView=create', () => {
  it('opens directly in create form when initialView is "create"', () => {
    setup({ initialView: 'create' })
    expect(screen.getByRole('button', { name: /\+ new item/i })).toHaveClass('border-b-2')
    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument()
  })

  it('pre-fills title from note content', () => {
    setup({ note: makeNote({ content: 'Fix the login bug' }), initialView: 'create' })
    expect(screen.getByDisplayValue('Fix the login bug')).toBeInTheDocument()
  })

  it('shows the source note preview', () => {
    setup({ note: makeNote({ content: 'Improve onboarding' }), initialView: 'create' })
    expect(screen.getByText('Improve onboarding')).toBeInTheDocument()
    expect(screen.getByText(/from sticky note/i)).toBeInTheDocument()
  })

  it('Create button is disabled when title is empty', () => {
    setup({ note: makeNote({ content: '' }), initialView: 'create' })
    expect(screen.getByRole('button', { name: /create action item/i })).toBeDisabled()
  })

  it('Create button enables once title is filled', async () => {
    const user = userEvent.setup()
    setup({ note: makeNote({ content: '' }), initialView: 'create' })
    await user.type(screen.getByPlaceholderText(/what needs to be done/i), 'New task')
    expect(screen.getByRole('button', { name: /create action item/i })).not.toBeDisabled()
  })

  it('calls onCreate with correct payload on submit', async () => {
    const user = userEvent.setup()
    const { onCreate } = setup({ note: makeNote({ content: 'Fix auth' }), initialView: 'create' })
    await user.clear(screen.getByPlaceholderText(/what needs to be done/i))
    await user.type(screen.getByPlaceholderText(/what needs to be done/i), 'Fix auth flow')
    await user.click(screen.getByRole('button', { name: /create action item/i }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Fix auth flow',
      status: 'Open',
      source_sticky_note_id: 'note-1',
    }))
  })

  it('returns to list view after successful create', async () => {
    const user = userEvent.setup()
    setup({ note: makeNote(), initialView: 'create' })
    await user.type(screen.getByPlaceholderText(/what needs to be done/i), 'New task')
    await user.click(screen.getByRole('button', { name: /create action item/i }))
    // After create, should go back to list
    expect(await screen.findByText(/no action items yet/i)).toBeInTheDocument()
  })
})

describe('ActionItemModal — tab switching', () => {
  it('switches from list to create when "+ New Item" tab is clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /\+ new item/i }))
    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument()
  })

  it('switches back to list when "All Items" tab is clicked from create', async () => {
    const user = userEvent.setup()
    setup({ initialView: 'create' })
    await user.click(screen.getByRole('button', { name: /all items/i }))
    expect(screen.getByText(/no action items yet/i)).toBeInTheDocument()
  })
})
