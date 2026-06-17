-- Fix: update_clickup_targets was using COALESCE, which prevents clearing a
-- field back to NULL (COALESCE(NULL, old_value) returns old_value).
-- Replace with a direct overwrite so callers can explicitly clear any field.
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
    clickup_workspace_id   = excluded.clickup_workspace_id,
    clickup_doc_id         = excluded.clickup_doc_id,
    clickup_parent_page_id = excluded.clickup_parent_page_id;
end;
$$ language plpgsql;
