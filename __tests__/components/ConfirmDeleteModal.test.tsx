import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'

const BOARD_NAME = 'Sprint 42 — Retro'

function setup() {
  const onConfirm = jest.fn()
  const onCancel = jest.fn()
  render(<ConfirmDeleteModal boardName={BOARD_NAME} onConfirm={onConfirm} onCancel={onCancel} />)
  return { onConfirm, onCancel }
}

describe('ConfirmDeleteModal', () => {
  it('renders board name in the dialog', () => {
    setup()
    expect(screen.getByText(`\u201c${BOARD_NAME}\u201d`)).toBeInTheDocument()
  })

  it('shows expected confirmation text in the hint', () => {
    setup()
    expect(screen.getByText(`Delete ${BOARD_NAME}`)).toBeInTheDocument()
  })

  it('Delete button is disabled initially', () => {
    setup()
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
  })

  it('Delete button stays disabled with wrong input', async () => {
    const user = userEvent.setup()
    setup()
    const input = screen.getByPlaceholderText(`Delete ${BOARD_NAME}`)
    await user.type(input, 'wrong text')
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
  })

  it('Delete button becomes enabled with exact correct input', async () => {
    const user = userEvent.setup()
    setup()
    const input = screen.getByPlaceholderText(`Delete ${BOARD_NAME}`)
    await user.type(input, `Delete ${BOARD_NAME}`)
    expect(screen.getByRole('button', { name: /delete/i })).not.toBeDisabled()
  })

  it('calls onConfirm when Delete button is clicked after correct input', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    const input = screen.getByPlaceholderText(`Delete ${BOARD_NAME}`)
    await user.type(input, `Delete ${BOARD_NAME}`)
    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when Enter is pressed after correct input', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    const input = screen.getByPlaceholderText(`Delete ${BOARD_NAME}`)
    await user.type(input, `Delete ${BOARD_NAME}`)
    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = setup()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
  })

  it('calls onCancel when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const { onCancel } = setup()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
  })

  it('does not call onConfirm when Delete is clicked without correct input', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    // Button is disabled — click should have no effect
    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteBtn)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
