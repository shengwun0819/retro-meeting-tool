-- Stores per-board section overrides as a JSONB array.
-- Each element: { id, title?, subtitle?, color? }
-- NULL means "use app defaults" (lib/constants.ts SECTION_CONFIGS).
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS section_config JSONB;
