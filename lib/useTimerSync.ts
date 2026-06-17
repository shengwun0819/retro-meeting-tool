'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { RefObject } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type TimerAction = 'start' | 'pause' | 'reset' | 'select'

export interface TimerBroadcastPayload {
  action: TimerAction
  remaining: number
  selected: number
}

export const TIMER_DURATIONS = [
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
] as const

const DEFAULT_DURATION = 300

export interface TimerState {
  remaining: number
  running: boolean
  isComplete: boolean
  selected: number
}

export interface TimerActions {
  start: () => void
  pause: () => void
  reset: () => void
  selectDuration: (seconds: number) => void
}

/**
 * Manages the countdown timer state and syncs it across all connected clients
 * via Supabase realtime broadcast.
 *
 * The hook owns all timer state so Board.tsx can wire the incoming broadcast
 * handler into the channel subscription without coupling Timer.tsx to Supabase.
 */
export function useTimerSync(
  channelRef: RefObject<RealtimeChannel | null>,
): TimerState & TimerActions & { handleIncoming: (payload: TimerBroadcastPayload) => void } {
  const [selected, setSelected] = useState(DEFAULT_DURATION)
  const [remaining, setRemaining] = useState(DEFAULT_DURATION)
  const [running, setRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const prevRunningRef = useRef(false)
  // Mirror state in refs so callbacks can read current values without stale closures
  // and without putting side effects inside state updater functions (unsafe in StrictMode).
  const remainingRef = useRef(DEFAULT_DURATION)
  const selectedRef = useRef(DEFAULT_DURATION)
  const runningRef = useRef(false)
  useEffect(() => { remainingRef.current = remaining }, [remaining])
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { runningRef.current = running }, [running])

  // Countdown tick
  useEffect(() => {
    if (!running) {
      if (prevRunningRef.current && remaining === 0) {
        prevRunningRef.current = false
        const showTimer = setTimeout(() => setIsComplete(true), 0)
        const hideTimer = setTimeout(() => setIsComplete(false), 3000)
        return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
      }
      prevRunningRef.current = false
      return
    }
    prevRunningRef.current = true
    if (remaining <= 0) {
      const t = setTimeout(() => setRunning(false), 0)
      return () => clearTimeout(t)
    }
    const id = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(id)
  }, [running, remaining])

  const broadcast = useCallback((payload: TimerBroadcastPayload) => {
    const ch = channelRef.current
    if (ch?.state === 'joined') {
      ch.send({ type: 'broadcast', event: 'timer', payload })
    }
  }, [channelRef])

  const start = useCallback(() => {
    if (runningRef.current) return
    setRunning(true)
    setIsComplete(false)
    broadcast({ action: 'start', remaining: remainingRef.current, selected: selectedRef.current })
  }, [broadcast])

  const pause = useCallback(() => {
    setRunning(false)
    broadcast({ action: 'pause', remaining: remainingRef.current, selected: selectedRef.current })
  }, [broadcast])

  const reset = useCallback(() => {
    setRunning(false)
    setIsComplete(false)
    setRemaining(selectedRef.current)
    broadcast({ action: 'reset', remaining: selectedRef.current, selected: selectedRef.current })
  }, [broadcast])

  const selectDuration = useCallback((seconds: number) => {
    setSelected(seconds)
    if (!runningRef.current) {
      setRemaining(seconds)
      setIsComplete(false)
      broadcast({ action: 'select', remaining: seconds, selected: seconds })
    }
  }, [broadcast])

  // Called by Board.tsx when a timer broadcast arrives from another client
  const handleIncoming = useCallback((payload: TimerBroadcastPayload) => {
    setSelected(payload.selected)
    switch (payload.action) {
      case 'start': {
        setRemaining(payload.remaining)
        setRunning(true)
        setIsComplete(false)
        break
      }
      case 'pause':
        setRemaining(payload.remaining)
        setRunning(false)
        break
      case 'reset':
        setRunning(false)
        setIsComplete(false)
        setRemaining(payload.remaining)
        break
      case 'select':
        setRemaining(payload.remaining)
        setIsComplete(false)
        break
    }
  }, [])

  return { remaining, running, isComplete, selected, start, pause, reset, selectDuration, handleIncoming }
}
