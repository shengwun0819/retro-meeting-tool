-- User-level settings, currently scoped to ClickUp integration credentials.
-- The ClickUp Personal Token is stored encrypted via pgcrypto's pgp_sym_encrypt;
-- the symmetric key (CLICKUP_TOKEN_ENCRYPTION_KEY) is supplied by application
-- code at encrypt/decrypt time and never persisted in the database.

create extension if not exists pgcrypto;

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clickup_token_encrypted bytea,
  clickup_workspace_id text,
  clickup_doc_id text,
  clickup_parent_page_id text,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

-- Read own row. The encrypted token bytea is never sent to the client; the API
-- layer projects only a `token_set` boolean.
drop policy if exists "user_settings select own" on user_settings;
create policy "user_settings select own" on user_settings
  for select using (user_id = auth.uid());

-- Insert / update / delete own row.
drop policy if exists "user_settings write own" on user_settings;
create policy "user_settings write own" on user_settings
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-bump updated_at on UPDATE.
create or replace function user_settings_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_settings_touch_updated_at on user_settings;
create trigger user_settings_touch_updated_at
  before update on user_settings
  for each row execute function user_settings_touch_updated_at();

-- =========================================================================
-- ClickUp token crypto RPCs
--
-- These functions wrap pgp_sym_encrypt / pgp_sym_decrypt so that the
-- application can call them via supabase.rpc(...) without writing raw SQL.
--
-- They run with the CALLER's privileges (no SECURITY DEFINER), so the RLS
-- policies on user_settings ('user_id = auth.uid()') still apply. API routes
-- must therefore use a user-scoped Supabase client (one created with the
-- caller's access_token) — a service-role client would have no auth.uid() and
-- be rejected by RLS, which is the desired behaviour: it prevents any code
-- path from operating on another user's row.
-- =========================================================================

create or replace function save_clickup_token(
  p_user_id uuid,
  p_token text,
  p_key text,
  p_workspace_id text default null,
  p_doc_id text default null,
  p_parent_page_id text default null
) returns void as $$
begin
  insert into user_settings (
    user_id,
    clickup_token_encrypted,
    clickup_workspace_id,
    clickup_doc_id,
    clickup_parent_page_id
  ) values (
    p_user_id,
    pgp_sym_encrypt(p_token, p_key),
    p_workspace_id,
    p_doc_id,
    p_parent_page_id
  )
  on conflict (user_id) do update set
    clickup_token_encrypted = excluded.clickup_token_encrypted,
    clickup_workspace_id    = coalesce(excluded.clickup_workspace_id,    user_settings.clickup_workspace_id),
    clickup_doc_id          = coalesce(excluded.clickup_doc_id,          user_settings.clickup_doc_id),
    clickup_parent_page_id  = coalesce(excluded.clickup_parent_page_id,  user_settings.clickup_parent_page_id);
end;
$$ language plpgsql;

create or replace function decrypt_clickup_token(
  p_user_id uuid,
  p_key text
) returns text as $$
declare
  v_encrypted bytea;
begin
  select clickup_token_encrypted into v_encrypted
  from user_settings where user_id = p_user_id;

  if v_encrypted is null then
    return null;
  end if;

  return pgp_sym_decrypt(v_encrypted, p_key);
end;
$$ language plpgsql;

-- Updates only the non-secret default targets without touching the token.
create or replace function update_clickup_targets(
  p_user_id uuid,
  p_workspace_id text default null,
  p_doc_id text default null,
  p_parent_page_id text default null
) returns void as $$
begin
  insert into user_settings (
    user_id,
    clickup_workspace_id,
    clickup_doc_id,
    clickup_parent_page_id
  ) values (
    p_user_id, p_workspace_id, p_doc_id, p_parent_page_id
  )
  on conflict (user_id) do update set
    clickup_workspace_id   = coalesce(excluded.clickup_workspace_id,   user_settings.clickup_workspace_id),
    clickup_doc_id         = coalesce(excluded.clickup_doc_id,         user_settings.clickup_doc_id),
    clickup_parent_page_id = coalesce(excluded.clickup_parent_page_id, user_settings.clickup_parent_page_id);
end;
$$ language plpgsql;

-- Removes only the token, keeping defaults intact.
create or replace function clear_clickup_token(p_user_id uuid) returns void as $$
begin
  update user_settings
    set clickup_token_encrypted = null
    where user_id = p_user_id;
end;
$$ language plpgsql;
