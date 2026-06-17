'use client'

import { SectionConfig } from '@/types'

interface SectionProps {
  config: SectionConfig
  noteCount: number
  isHighlighted?: boolean
  onAddNote: (sectionId: string) => void
}

export default function Section({ config, noteCount, isHighlighted, onAddNote }: SectionProps) {
  return (
    <div
      className={`h-full flex flex-col rounded-2xl border-2 transition-all duration-150 overflow-hidden ${
        isHighlighted ? 'border-blue-400 shadow-xl scale-[1.005]' : 'border-transparent shadow-sm'
      } ${config.sectionBg} ${config.sectionDarkBg}`}
    >
      {/* Section Header */}
      <div className={`${config.headerBg} px-4 py-3 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.emoji}</span>
          <h2 className="text-white font-bold text-lg">{config.title}</h2>
          <span className="bg-white/50 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[1.5rem] text-center tabular-nums shadow-sm" title="Notes in this section">
            {noteCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAddNote(config.id)}
            className="bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full w-8 h-8 flex items-center justify-center transition-all text-xl font-bold shadow-md"
            title={`Add sticky note to ${config.title}`}
          >
            +
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900/40 shrink-0">
        <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">{config.subtitle}</p>
      </div>

      {/* Notes area — purely visual; actual notes rendered in canvas overlay */}
      <div className="flex-1 flex items-center justify-center">
        {noteCount === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 opacity-60 pointer-events-none select-none text-center px-4">
            Click <span className="font-bold">+</span> to add your first note
          </p>
        )}
      </div>
    </div>
  )
}
