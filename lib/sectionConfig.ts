import { SECTION_CONFIGS } from '@/lib/constants'
import type { SectionConfig, SectionOverride } from '@/types'

const COLOR_TO_TAILWIND: Record<string, { headerBg: string; sectionBg: string; sectionDarkBg: string }> = {
  '#10b981': { headerBg: 'bg-emerald-500', sectionBg: 'bg-emerald-50', sectionDarkBg: 'dark:bg-emerald-950' },
  '#ef4444': { headerBg: 'bg-red-500',     sectionBg: 'bg-red-50',     sectionDarkBg: 'dark:bg-red-950'     },
  '#f97316': { headerBg: 'bg-orange-500',  sectionBg: 'bg-orange-50',  sectionDarkBg: 'dark:bg-orange-950'  },
  '#0ea5e9': { headerBg: 'bg-sky-500',     sectionBg: 'bg-sky-50',     sectionDarkBg: 'dark:bg-sky-950'     },
  '#6366f1': { headerBg: 'bg-indigo-500',  sectionBg: 'bg-indigo-50',  sectionDarkBg: 'dark:bg-indigo-950'  },
  '#a855f7': { headerBg: 'bg-purple-500',  sectionBg: 'bg-purple-50',  sectionDarkBg: 'dark:bg-purple-950'  },
  '#eab308': { headerBg: 'bg-yellow-400',  sectionBg: 'bg-yellow-50',  sectionDarkBg: 'dark:bg-yellow-950'  },
  '#ec4899': { headerBg: 'bg-pink-500',    sectionBg: 'bg-pink-50',    sectionDarkBg: 'dark:bg-pink-950'    },
}

export function resolveSectionConfigs(boardSectionConfig: SectionOverride[] | null | undefined): SectionConfig[] {
  if (!Array.isArray(boardSectionConfig) || !boardSectionConfig.length) return SECTION_CONFIGS

  return SECTION_CONFIGS.map((def) => {
    const override = boardSectionConfig.find((o) => o?.id === def.id)
    if (!override) return def

    const colorClasses = override.color ? COLOR_TO_TAILWIND[override.color] : undefined
    return {
      ...def,
      title:         override.title    ?? def.title,
      subtitle:      override.subtitle ?? def.subtitle,
      headerBg:      colorClasses?.headerBg    ?? def.headerBg,
      sectionBg:     colorClasses?.sectionBg   ?? def.sectionBg,
      sectionDarkBg: colorClasses?.sectionDarkBg ?? def.sectionDarkBg,
    }
  })
}
