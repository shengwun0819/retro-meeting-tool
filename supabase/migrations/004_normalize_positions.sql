-- Normalize sticky note positions from absolute pixels to fractions (0.0–1.0)
-- Reference canvas size: 1440×810 (typical 1440p laptop minus 56px toolbar)
-- Only converts rows that still hold pixel values (pos_x > 1 or pos_y > 1).
-- Rows at (0, 0) are "unpositioned legacy" and will be placed by the app on first load.
UPDATE sticky_notes
SET
  pos_x = GREATEST(0.001, LEAST(0.999, pos_x / 1440.0)),
  pos_y = GREATEST(0.001, LEAST(0.999, pos_y /  810.0))
WHERE pos_x > 1 OR pos_y > 1;
