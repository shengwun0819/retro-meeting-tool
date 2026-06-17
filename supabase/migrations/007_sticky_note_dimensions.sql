-- Add width and height columns to sticky_notes for user-resizable notes
alter table sticky_notes
  add column if not exists width float,
  add column if not exists height float;
