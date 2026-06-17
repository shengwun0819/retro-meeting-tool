'use client'

import { CursorPosition } from '@/types'

interface CursorOverlayProps {
  cursors: CursorPosition[]
  currentUserId: string
  /** Hide all cursors (e.g. when a modal or panel is open) */
  hidden?: boolean
  /** Spotlight this user's cursor — larger size + constant glow */
  spotlightUserId?: string | null
}

export default function CursorOverlay({ cursors, currentUserId, hidden, spotlightUserId }: CursorOverlayProps) {
  if (hidden) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {cursors
        .filter((c) => c.userId !== currentUserId)
        .map((cursor) => {
          const isSpotlit = spotlightUserId === cursor.userId
          const filterId = `glow-${cursor.userId}`
          return (
            <div
              key={cursor.userId}
              className="absolute transition-all duration-75"
              style={{ left: cursor.x, top: cursor.y }}
            >
              {isSpotlit ? (
                /* Spotlit cursor — shape-conforming glow via SVG filter */
                <>
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      <filter id={filterId} x="-150%" y="-150%" width="400%" height="400%">
                        {/* Tight inner glow */}
                        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur1" />
                        <feFlood floodColor={cursor.color} floodOpacity="1" result="color1" />
                        <feComposite in="color1" in2="blur1" operator="in" result="layer1" />
                        {/* Mid glow */}
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur2" />
                        <feFlood floodColor={cursor.color} floodOpacity="0.7" result="color2" />
                        <feComposite in="color2" in2="blur2" operator="in" result="layer2" />
                        {/* Outer soft halo */}
                        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur3" />
                        <feFlood floodColor={cursor.color} floodOpacity="0.35" result="color3" />
                        <feComposite in="color3" in2="blur3" operator="in" result="layer3" />
                        <feMerge>
                          <feMergeNode in="layer3" />
                          <feMergeNode in="layer2" />
                          <feMergeNode in="layer1" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d="M4 2l12 7-6 1-3 6L4 2z"
                      fill={cursor.color}
                      stroke="white"
                      strokeWidth="1.5"
                      filter={`url(#${filterId})`}
                    />
                  </svg>
                  <span
                    className="absolute top-9 left-2 text-sm text-white rounded-full px-3 py-1 whitespace-nowrap font-bold shadow-lg"
                    style={{
                      backgroundColor: cursor.color,
                      boxShadow: `0 0 10px ${cursor.color}, 0 0 20px ${cursor.color}, 0 0 32px ${cursor.color}60`,
                    }}
                  >
                    {cursor.userName}
                  </span>
                </>
              ) : (
                /* Normal cursor */
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 2l12 7-6 1-3 6L4 2z"
                      fill={cursor.color}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span
                    className="absolute top-5 left-2 text-xs text-white rounded-full px-2 py-0.5 whitespace-nowrap font-medium"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {cursor.userName}
                  </span>
                </>
              )}
            </div>
          )
        })}
    </div>
  )
}
