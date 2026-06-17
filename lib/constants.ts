import { SectionConfig } from '@/types'

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'continue',
    title: 'Continue',
    emoji: '👍',
    subtitle: 'What helped us move forward?',
    headerBg: 'bg-emerald-500',
    sectionBg: 'bg-emerald-50',
    sectionDarkBg: 'dark:bg-emerald-950',
    defaultNoteColor: '#bbf7d0',
  },
  {
    id: 'stop',
    title: 'Stop',
    emoji: '🛑',
    subtitle: 'What held us back?',
    headerBg: 'bg-rose-500',
    sectionBg: 'bg-rose-50',
    sectionDarkBg: 'dark:bg-rose-950',
    defaultNoteColor: '#fecaca',
  },
  {
    id: 'invent',
    title: 'Invent',
    emoji: '💡',
    subtitle: 'How could we do things differently?',
    headerBg: 'bg-amber-400',
    sectionBg: 'bg-amber-50',
    sectionDarkBg: 'dark:bg-amber-950',
    defaultNoteColor: '#fef08a',
  },
  {
    id: 'act',
    title: 'Act',
    emoji: '💪',
    subtitle: 'What should we do next?',
    headerBg: 'bg-sky-500',
    sectionBg: 'bg-sky-50',
    sectionDarkBg: 'dark:bg-sky-950',
    defaultNoteColor: '#bae6fd',
  },
]

export const REACTIONS = ['👍', '❤️', '😂', '🎉', '🤔']

export const USER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#14b8a6', '#84cc16', '#f43f5e', '#a855f7',
  '#0ea5e9', '#fb923c', '#4ade80', '#e879f9',
]

export const NOTE_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bae6fd' },
  { label: 'Pink', value: '#fecaca' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'White', value: '#ffffff' },
]
