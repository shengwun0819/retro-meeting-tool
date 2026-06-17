import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '@/contexts/ToastContext'

// ---------------------------------------------------------------------------
// Test helper component
// ---------------------------------------------------------------------------

function ToastTrigger({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  const toast = useToast()
  return <button onClick={() => toast[type](message)}>trigger</button>
}

function setup(type: 'success' | 'error' | 'info', message: string) {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <ToastTrigger type={type} message={message} />
    </ToastProvider>
  )
  return user
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

describe('ToastContext — display', () => {
  it('shows a success toast with the correct message', async () => {
    const user = setup('success', 'Saved!')
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('Saved!')).toBeInTheDocument()
  })

  it('shows an error toast with the correct message', async () => {
    const user = setup('error', 'Something went wrong')
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows an info toast with the correct message', async () => {
    const user = setup('info', 'Arranged 5 notes')
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('Arranged 5 notes')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

describe('ToastContext — styling', () => {
  it('applies green background for success toasts', async () => {
    const user = setup('success', 'OK')
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('OK').closest('div')).toHaveClass('bg-green-500')
  })

  it('applies red background for error toasts', async () => {
    const user = setup('error', 'Error!')
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('Error!').closest('div')).toHaveClass('bg-red-500')
  })

  it('applies dark background for info toasts', async () => {
    const user = setup('info', 'FYI')
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('FYI').closest('div')).toHaveClass('bg-gray-800')
  })
})

// ---------------------------------------------------------------------------
// Auto-dismiss
// ---------------------------------------------------------------------------

describe('ToastContext — auto-dismiss', () => {
  it('auto-dismisses the toast after 3.2 seconds', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="Gone soon" />
      </ToastProvider>
    )
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('Gone soon')).toBeInTheDocument()
    act(() => { jest.advanceTimersByTime(3200) })
    expect(screen.queryByText('Gone soon')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('toast is still visible just before the 3.2 second mark', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <ToastProvider>
        <ToastTrigger type="info" message="Still here" />
      </ToastProvider>
    )
    await user.click(screen.getByRole('button', { name: 'trigger' }))
    act(() => { jest.advanceTimersByTime(3199) })
    expect(screen.getByText('Still here')).toBeInTheDocument()
    jest.useRealTimers()
  })
})
