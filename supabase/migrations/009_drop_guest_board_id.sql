-- Remove board_id from guest_sessions: guests are tracked at login,
-- before entering any specific board, so the column is always null.
ALTER TABLE guest_sessions DROP COLUMN IF EXISTS board_id;
