-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- RetroSessions
create table if not exists retro_sessions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sprint_number integer,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- Boards
create table if not exists boards (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references retro_sessions(id) on delete cascade,
  template_id text default 'cisa',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sticky Notes
create table if not exists sticky_notes (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references boards(id) on delete cascade,
  section_id text not null check (section_id in ('continue', 'stop', 'invent', 'act')),
  content text not null default '',
  color text default '#fef08a',
  author_id text not null,
  author_name text not null,
  pos_x float default 0,
  pos_y float default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reactions
create table if not exists reactions (
  id uuid primary key default uuid_generate_v4(),
  sticky_note_id uuid references sticky_notes(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(sticky_note_id, user_id, emoji)
);

-- Comments
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  sticky_note_id uuid references sticky_notes(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Action Items
create table if not exists action_items (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references boards(id) on delete cascade,
  source_sticky_note_id uuid references sticky_notes(id) on delete set null,
  title text not null,
  description text,
  owner_name text,
  due_date date,
  status text default 'Open' check (status in ('Open', 'InProgress', 'Done')),
  created_at timestamptz default now()
);

-- Enable Row Level Security (allow all for MVP - no auth)
alter table retro_sessions enable row level security;
alter table boards enable row level security;
alter table sticky_notes enable row level security;
alter table reactions enable row level security;
alter table comments enable row level security;
alter table action_items enable row level security;

-- Open policies for MVP (no auth required)
create policy "allow_all_sessions" on retro_sessions for all using (true) with check (true);
create policy "allow_all_boards" on boards for all using (true) with check (true);
create policy "allow_all_stickies" on sticky_notes for all using (true) with check (true);
create policy "allow_all_reactions" on reactions for all using (true) with check (true);
create policy "allow_all_comments" on comments for all using (true) with check (true);
create policy "allow_all_action_items" on action_items for all using (true) with check (true);

-- Enable Realtime for sticky_notes, reactions, comments
alter publication supabase_realtime add table sticky_notes;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table action_items;
