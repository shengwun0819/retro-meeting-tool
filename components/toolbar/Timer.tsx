'use client'

import { TIMER_DURATIONS } from '@/lib/useTimerSync'
import type { TimerState, TimerActions } from '@/lib/useTimerSync'

export type TimerProps = TimerState & TimerActions

export default function Timer({
  remaining,
  running,
  isComplete,
  selected,
  start,
  pause,
  reset,
  selectDuration,
}: TimerProps) {
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const isUrgent = remaining <= 30 && running

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {TIMER_DURATIONS.map((d) => (
          <button
            key={d.seconds}
            onClick={() => selectDuration(d.seconds)}
            className={`text-xs px-2 py-1 rounded transition-all ${
              selected === d.seconds
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={running && d.seconds !== selected ? 'Will apply on next reset' : undefined}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div
        className={`font-mono font-bold text-sm px-3 py-1 rounded-lg min-w-[56px] text-center transition-all ${
          isComplete
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 animate-pulse'
            : isUrgent
              ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 animate-pulse'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
        }`}
      >
        {isComplete ? "Time's up!" : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
      </div>

      <div className="flex gap-1">
        <button
          onClick={running ? pause : start}
          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded text-sm transition-all"
        >
          {running ? '⏸' : '▶'}
        </button>
        <button
          onClick={reset}
          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded text-sm transition-all"
        >
          ↺
        </button>
      </div>
    </div>
  )
}
