import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Timer from '@/components/toolbar/Timer'
import type { TimerProps } from '@/components/toolbar/Timer'

function makeProps(overrides: Partial<TimerProps> = {}): TimerProps {
  return {
    remaining: 300,
    running: false,
    isComplete: false,
    selected: 300,
    start: jest.fn(),
    pause: jest.fn(),
    reset: jest.fn(),
    selectDuration: jest.fn(),
    ...overrides,
  }
}

describe('Timer', () => {
  it('renders the remaining time as MM:SS', () => {
    render(<Timer {...makeProps()} />)
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  it('shows the correct time for a non-default remaining value', () => {
    render(<Timer {...makeProps({ remaining: 180, selected: 180 })} />)
    expect(screen.getByText('03:00')).toBeInTheDocument()
  })

  it('calls selectDuration when a duration button is clicked', async () => {
    const user = userEvent.setup()
    const selectDuration = jest.fn()
    render(<Timer {...makeProps({ selectDuration })} />)
    await user.click(screen.getByRole('button', { name: '3m' }))
    expect(selectDuration).toHaveBeenCalledWith(180)
  })

  it('calls selectDuration with 10m seconds when 10m is clicked', async () => {
    const user = userEvent.setup()
    const selectDuration = jest.fn()
    render(<Timer {...makeProps({ selectDuration })} />)
    await user.click(screen.getByRole('button', { name: '10m' }))
    expect(selectDuration).toHaveBeenCalledWith(600)
  })

  it('calls start when ▶ is clicked (not running)', async () => {
    const user = userEvent.setup()
    const start = jest.fn()
    render(<Timer {...makeProps({ start })} />)
    await user.click(screen.getByRole('button', { name: '▶' }))
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('shows ⏸ button when running', () => {
    render(<Timer {...makeProps({ running: true })} />)
    expect(screen.getByRole('button', { name: '⏸' })).toBeInTheDocument()
  })

  it('calls pause when ⏸ is clicked', async () => {
    const user = userEvent.setup()
    const pause = jest.fn()
    render(<Timer {...makeProps({ running: true, pause })} />)
    await user.click(screen.getByRole('button', { name: '⏸' }))
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('calls reset when ↺ is clicked', async () => {
    const user = userEvent.setup()
    const reset = jest.fn()
    render(<Timer {...makeProps({ reset })} />)
    await user.click(screen.getByRole('button', { name: '↺' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('shows "Time\'s up!" when isComplete is true', () => {
    render(<Timer {...makeProps({ isComplete: true, remaining: 0 })} />)
    expect(screen.getByText("Time's up!")).toBeInTheDocument()
  })

  it('highlights the selected duration button', () => {
    render(<Timer {...makeProps({ selected: 180 })} />)
    const btn = screen.getByRole('button', { name: '3m' })
    expect(btn.className).toMatch(/bg-blue-500/)
  })
})
