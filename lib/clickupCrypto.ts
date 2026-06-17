import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side helpers for the ClickUp Personal Token crypto flow.
 *
 * Storage model:
 *   - `user_settings.clickup_token_encrypted` is a `bytea` column produced by
 *     `pgp_sym_encrypt(plaintext, key)`.
 *   - The symmetric key lives only as `CLICKUP_TOKEN_ENCRYPTION_KEY` in the
 *     server environment; it is passed into pgcrypto at the moment of
 *     encrypt / decrypt and never written to disk.
 *
 * Auth model:
 *   - Callers MUST pass a user-scoped Supabase client (created with the
 *     caller's `access_token` cookie via `@supabase/ssr` `createServerClient`),
 *     not a service-role client. The four RPCs run with caller privileges and
 *     are protected by `user_settings`'s RLS policies, which require
 *     `user_id = auth.uid()`.
 *   - As a result, `p_user_id` MUST equal the caller's auth uid. Helpers do
 *     not accept arbitrary user_ids — passing someone else's uid will be
 *     rejected by RLS at the database layer.
 *
 * RPCs (defined in migration 011):
 *   - save_clickup_token
 *   - decrypt_clickup_token
 *   - clear_clickup_token
 *   - update_clickup_targets
 *
 * These helpers must run server-side only (API routes / server actions).
 */

function requireEncryptionKey(): string {
  const key = process.env.CLICKUP_TOKEN_ENCRYPTION_KEY
  if (!key || key.length < 16) {
    throw new Error(
      'CLICKUP_TOKEN_ENCRYPTION_KEY is not set or is too short (need ≥16 chars). ' +
      'See README "Environment Setup" for how to generate one.'
    )
  }
  return key
}

export interface ClickUpTargets {
  workspaceId?: string | null
  docId?: string | null
  parentPageId?: string | null
}

/** Persist (or rotate) the encrypted token, optionally bundled with target IDs. */
export async function saveEncryptedClickUpToken(
  supabase: SupabaseClient,
  userId: string,
  plaintextToken: string,
  targets: ClickUpTargets = {}
): Promise<void> {
  const { error } = await supabase.rpc('save_clickup_token', {
    p_user_id: userId,
    p_token: plaintextToken,
    p_key: requireEncryptionKey(),
    p_workspace_id: targets.workspaceId ?? null,
    p_doc_id: targets.docId ?? null,
    p_parent_page_id: targets.parentPageId ?? null,
  })
  if (error) throw error
}

/** Returns the plaintext token, or null if the user has not set one. */
export async function getDecryptedClickUpToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('decrypt_clickup_token', {
    p_user_id: userId,
    p_key: requireEncryptionKey(),
  })
  if (error) throw error
  if (data == null || data === '') return null
  return data as string
}

/** Removes only the encrypted token; default targets are kept. */
export async function clearClickUpToken(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('clear_clickup_token', { p_user_id: userId })
  if (error) throw error
}

/** Updates default ClickUp targets without touching the token. */
export async function updateClickUpTargets(
  supabase: SupabaseClient,
  userId: string,
  targets: ClickUpTargets
): Promise<void> {
  const { error } = await supabase.rpc('update_clickup_targets', {
    p_user_id: userId,
    p_workspace_id: targets.workspaceId ?? null,
    p_doc_id: targets.docId ?? null,
    p_parent_page_id: targets.parentPageId ?? null,
  })
  if (error) throw error
}
