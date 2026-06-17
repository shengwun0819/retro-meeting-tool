-- Add text formatting columns to sticky_notes
alter table sticky_notes
  add column if not exists is_bold boolean not null default false,
  add column if not exists is_italic boolean not null default false,
  add column if not exists is_underline boolean not null default false;
