-- Allow reactions and comments on canvas elements

ALTER TABLE reactions ALTER COLUMN sticky_note_id DROP NOT NULL;
ALTER TABLE reactions ADD COLUMN IF NOT EXISTS canvas_element_id uuid REFERENCES canvas_elements(id) ON DELETE CASCADE;

ALTER TABLE comments ALTER COLUMN sticky_note_id DROP NOT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS canvas_element_id uuid REFERENCES canvas_elements(id) ON DELETE CASCADE;

-- Sticky note resize dimensions
ALTER TABLE sticky_notes ADD COLUMN IF NOT EXISTS width integer NOT NULL DEFAULT 176;
ALTER TABLE sticky_notes ADD COLUMN IF NOT EXISTS height integer NOT NULL DEFAULT 110;
