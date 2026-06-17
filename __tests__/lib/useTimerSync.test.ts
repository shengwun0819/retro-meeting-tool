import { renderHook, act } from '@testing-library/react'
import { useTimerSync } from '@/lib/useTimerSync'
import type { TimerBroadcastPayload } from '@/lib/useTimerSync'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { RefObject } from 'react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChannelRef(state: string = 'joined'): RefObject<RealtimeChannel | null> {
  const send = jest.fn()
  return { current: { state, send } as unknown as RealtimeChannel }
}

function renderTimer(channelRef = makeChannelRef()) {
  return renderHook(() => useTimerSync(channelRef))
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useTimerSync — initial state', () => {
  it('starts with 5 minutes remaining and not running', () => {
    const { result } = renderTimer()
    expect(result.current.remaining).toBe(300)
    expect(result.current.running).toBe(false)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.selected).toBe(300)
  })
})

// ---------------------------------------------------------------------------
// start / pause
// ---------------------------------------------------------------------------

describe('useTimerSync — start and pause', () => {
  it('sets running to true when start() is called', () => {
    const { result } = renderTimer()
    act(() => { result.current.start() })
    expect(result.current.running).toBe(true)
  })

  it('broadcasts "start" action when start() is called', () => {
    const ref = makeChannelRef()
    const { result } = renderHook(() => useTimerSync(ref))
    act(() => { result.current.start() })
    const [call] = (ref.current!.send as jest.Mock).mock.calls
    expect(call[0].payload.action).toBe('start')
    expect(call[0].payload.remaining).toBe(300)
  })

  it('sets running to false when pause() is called', () => {
    const { result } = renderTimer()
    act(() => { result.current.start() })
    act(() => { result.current.pause() })
    expect(result.current.running).toBe(false)
  })

  it('broadcasts "pause" with current remaining when pause() is called', () => {
    const ref = makeChannelRef()
    const { result } = renderHook(() => useTimerSync(ref))
    act(() => { result.current.start() })
    act(() => { result.current.pause() })
    const calls = (ref.current!.send as jest.Mock).mock.calls
    const pauseCall = calls.find((c: { payload: TimerBroadcastPayload }[]) => c[0].payload.action === 'pause')
    expect(pauseCall).toBeDefined()
    expect(pauseCall[0].payload.remaining).toBe(300)
  })
})

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('useTimerSync — reset', () => {
  it('resets remaining to the selected duration and stops the timer', () => {
    const { result } = renderTimer()
    act(() => { result.current.selectDuration(180) })
    act(() => { result.current.start() })
    act(() => { result.current.reset() })
    expect(result.current.remaining).toBe(180)
    expect(result.current.running).toBe(false)
  })

  it('broadcasts "reset" with the selected duration as remaining', () => {
    const ref = makeChannelRef()
    const { result } = renderHook(() => useTimerSync(ref))
    act(() => { result.current.selectDuration(600) })
    act(() => { result.current.reset() })
    const calls = (ref.current!.send as jest.Mock).mock.calls
    const resetCall = calls.find((c: { payload: TimerBroadcastPayload }[]) => c[0].payload.action === 'reset')
    expect(resetCall[0].payload.remaining).toBe(600)
    expect(resetCall[0].payload.selected).toBe(600)
  })
})

// ---------------------------------------------------------------------------
// selectDuration
// ---------------------------------------------------------------------------

describe('useTimerSync — selectDuration', () => {
  it('updates selected and remaining when not running', () => {
    const { result } = renderTimer()
    act(() => { result.current.selectDuration(180) })
    expect(result.current.selected).toBe(180)
    expect(result.current.remaining).toBe(180)
  })

  it('updates selected but NOT remaining when running', () => {
    const { result } = renderTimer()
    act(() => { result.current.start() })
    act(() => { result.current.selectDuration(180) })
    expect(result.current.selected).toBe(180)
    expect(result.current.remaining).toBe(300) // unchanged while running
  })
})

// ---------------------------------------------------------------------------
// handleIncoming — sync from remote broadcasts
// ---------------------------------------------------------------------------

describe('useTimerSync — handleIncoming', () => {
  function incoming(overrides: Partial<TimerBroadcastPayload>): TimerBroadcastPayload {
    return { action: 'start', remaining: 300, selected: 300, ...overrides }
  }

  it('"start" sets running to true and syncs remaining', () => {
    const { result } = renderTimer()
    act(() => {
      result.current.handleIncoming(incoming({ action: 'start', remaining: 240 }))
    })
    expect(result.current.running).toBe(true)
    expect(result.current.remaining).toBe(240)
  })

  it('"pause" stops the timer and sets remaining', () => {
    const { result } = renderTimer()
    act(() => { result.current.start() })
    act(() => {
      result.current.handleIncoming(incoming({ action: 'pause', remaining: 200 }))
    })
    expect(result.current.running).toBe(false)
    expect(result.current.remaining).toBe(200)
  })

  it('"reset" stops the timer and restores remaining', () => {
    const { result } = renderTimer()
    act(() => { result.current.start() })
    act(() => {
      result.current.handleIncoming(incoming({ action: 'reset', remaining: 300, selected: 300 }))
    })
    expect(result.current.running).toBe(false)
    expect(result.current.remaining).toBe(300)
    expect(result.current.isComplete).toBe(false)
  })

  it('"select" updates selected and remaining when not running', () => {
    const { result } = renderTimer()
    act(() => {
      result.current.handleIncoming(incoming({ action: 'select', remaining: 600, selected: 600 }))
    })
    expect(result.current.selected).toBe(600)
    expect(result.current.remaining).toBe(600)
  })

  it('does not broadcast when receiving an incoming event (avoid echo)', () => {
    const ref = makeChannelRef()
    const { result } = renderHook(() => useTimerSync(ref))
    act(() => {
      result.current.handleIncoming(incoming({ action: 'start', remaining: 300 }))
    })
    expect(ref.current!.send).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// No broadcast when channel is not joined
// ---------------------------------------------------------------------------

describe('useTimerSync — offline behaviour', () => {
  it('does not call send when channel state is not "joined"', () => {
    const ref = makeChannelRef('closed')
    const { result } = renderHook(() => useTimerSync(ref))
    act(() => { result.current.start() })
    expect(ref.current!.send).not.toHaveBeenCalled()
  })

  it('does not throw when channelRef.current is null', () => {
    const ref: RefObject<RealtimeChannel | null> = { current: null }
    const { result } = renderHook(() => useTimerSync(ref))
    expect(() => act(() => { result.current.start() })).not.toThrow()
  })
})
