-- Canvas Elements: text boxes, shapes, and arrows on the retro board
create table if not exists canvas_elements (
  id           uuid primary key default uuid_generate_v4(),
  board_id     uuid references boards(id) on delete cascade not null,
  type         text not null check (type in ('text', 'rect', 'circle', 'arrow')),

  -- Position and size in pixels
  pos_x        float not null default 0,
  pos_y        float not null default 0,
  width        float not null default 120,
  height       float not null default 80,

  -- Arrow endpoint (pos_x/pos_y = start, x2/y2 = end)
  x2           float,
  y2           float,

  -- Visual properties
  fill_color   text not null default '#ffffff',
  stroke_color text not null default '#374151',
  stroke_width integer not null default 2,
  text_content text not null default '',
  text_color   text not null default '#111827',
  font_size    integer not null default 14,

  created_by   text not null default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table canvas_elements enable row level security;
create policy "allow_all_canvas_elements" on canvas_elements
  for all using (true) with check (true);

alter publication supabase_realtime add table canvas_elements;
