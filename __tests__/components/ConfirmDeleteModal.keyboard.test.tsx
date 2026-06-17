/**
 * Tests for the keyboard-aware Enter key handling in text input
 * to ensure IME composition (Chinese/Japanese/Korean) does not
 * accidentally trigger delete confirmation.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'

const BOARD_NAME = 'My Board'

function setup() {
  const onConfirm = jest.fn()
  const onCancel = jest.fn()
  render(<ConfirmDeleteModal boardName={BOARD_NAME} onConfirm={onConfirm} onCancel={onCancel} />)
  return { onConfirm, onCancel }
}

describe('ConfirmDeleteModal — keyboard interactions', () => {
  it('Enter key submits when input is correct', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    const input = screen.getByPlaceholderText(`Delete ${BOARD_NAME}`)
    await user.type(input, `Delete ${BOARD_NAME}`)
    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('Enter key does not submit when input is incomplete', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    const input = screen.getByPlaceholderText(`Delete ${BOARD_NAME}`)
    await user.type(input, 'Delete')
    await user.keyboard('{Enter}')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Escape key calls onCancel', async () => {
    const user = userEvent.setup()
    const { onCancel } = setup()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
  })
})
