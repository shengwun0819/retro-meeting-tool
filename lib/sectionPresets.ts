import type { SectionOverride } from '@/types'

export type SectionPreset = 'cisa' | 'mad-sad-glad'

export const SECTION_PRESETS: Record<SectionPreset, SectionOverride[]> = {
  'cisa': [],
  'mad-sad-glad': [
    { id: 'continue', title: 'Glad',  subtitle: 'What made us happy?',   color: '#10b981' },
    { id: 'stop',     title: 'Sad',   subtitle: 'What disappointed us?', color: '#ef4444' },
    { id: 'invent',   title: 'Mad',   subtitle: 'What frustrated us?',   color: '#f97316' },
    { id: 'act',      title: 'Act',   subtitle: 'What should we do next?', color: '#0ea5e9' },
  ],
}
