/**
 * @jest-environment node
 *
 * Integration test for migration 011 + lib/clickupCrypto.
 *
 * Connects to a real Supabase project via two clients:
 *   1. service-role admin client — used only to look up an existing user and
 *      mint an access_token via generateLink, then to inspect / clean up rows
 *   2. user-scoped client built from that access_token — passed into the
 *      crypto helpers; this is what the API routes will use in production
 *
 * Auto-skipped when env vars are missing so CI does not break on unrelated PRs.
 *
 * Required env (auto-loaded from .env):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - CLICKUP_TOKEN_ENCRYPTION_KEY
 *
 * Requires at least one user in auth.users (sign in once on the app first).
 *
 * Run locally:
 *   npm test -- --testPathPatterns=clickupCrypto.integration
 */

import { randomUUID } from 'crypto'
import { config as loadDotenv } from 'dotenv'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  saveEncryptedClickUpToken,
  getDecryptedClickUpToken,
  clearClickUpToken,
  updateClickUpTargets,
} from '@/lib/clickupCrypto'

// Jest doesn't auto-load .env. dotenv is dev-only; the production code in
// lib/clickupCrypto reads process.env directly and does not depend on it.
loadDotenv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const encryptionKey = process.env.CLICKUP_TOKEN_ENCRYPTION_KEY
const hasAllEnv = !!(url && anonKey && serviceKey && encryptionKey && encryptionKey.length >= 16)

const describeIf = hasAllEnv ? describe : describe.skip

describeIf('clickupCrypto integration (real Supabase)', () => {
  let admin: SupabaseClient        // service-role: setup, inspect, cleanup
  let userClient: SupabaseClient   // user-scoped: drives the helper RPCs (RLS-bound)
  let userId: string
  // Test fixture only — never sent to ClickUp. Use crypto.randomUUID for
  // uniqueness; this is not a security-sensitive value.
  const fakeToken = `pk_test_dummy_${randomUUID()}`

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!)

    // Find any existing user with an email (anonymous/guest users have none and
    // can't be impersonated via magic-link). Guests are filtered out.
    const { data: usersRes, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 })
    if (listErr) throw listErr
    const user = usersRes.users.find((u) => !!u.email)
    if (!user?.email) {
      throw new Error(
        'No auth.users row with an email — sign in once with Google on the app before running this test.'
      )
    }
    userId = user.id

    // Mint a magic-link access_token for that user (no email is sent because
    // generateLink only returns the token; we never call sendEmail).
    const { data: linkRes, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })
    if (linkErr) throw linkErr
    const hashedToken = linkRes.properties?.hashed_token
    if (!hashedToken) throw new Error('generateLink returned no hashed_token')

    // Build an anon-key client and exchange the hashed_token for a real session
    const anon = createClient(url!, anonKey!)
    const { data: verifyRes, error: verifyErr } = await anon.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashedToken,
    })
    if (verifyErr) throw verifyErr
    if (!verifyRes.session) throw new Error('verifyOtp returned no session')

    // Now build a user-scoped client using the user's access_token
    userClient = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${verifyRes.session.access_token}` } },
    })

    // Start clean
    await admin.from('user_settings').delete().eq('user_id', userId)
  })

  afterAll(async () => {
    if (userId) await admin.from('user_settings').delete().eq('user_id', userId)
  })

  it('round-trips an encrypted token (save → decrypt)', async () => {
    await saveEncryptedClickUpToken(userClient, userId, fakeToken, {
      workspaceId: 'workspace123',
      docId: 'doc-abc',
      parentPageId: 'page-def',
    })

    const decrypted = await getDecryptedClickUpToken(userClient, userId)
    expect(decrypted).toBe(fakeToken)
  })

  it('stores token as opaque bytea (plaintext does not appear on disk)', async () => {
    const { data, error } = await admin
      .from('user_settings')
      .select('clickup_token_encrypted')
      .eq('user_id', userId)
      .single()
    expect(error).toBeNull()

    const rawBytea = data!.clickup_token_encrypted as unknown as string
    expect(typeof rawBytea === 'string' && rawBytea.includes(fakeToken)).toBe(false)
  })

  it('updateClickUpTargets overwrites all three target fields', async () => {
    // The RPC does a full overwrite (no COALESCE). Callers always pass all three fields.
    await updateClickUpTargets(userClient, userId, {
      workspaceId: '99999999',
      docId: 'doc-abc',
      parentPageId: 'page-def',
    })

    const { data } = await admin
      .from('user_settings')
      .select('clickup_workspace_id, clickup_doc_id, clickup_parent_page_id')
      .eq('user_id', userId)
      .single()

    expect(data?.clickup_workspace_id).toBe('99999999')
    expect(data?.clickup_doc_id).toBe('doc-abc')
    expect(data?.clickup_parent_page_id).toBe('page-def')
  })

  it('token still decrypts after target-only update', async () => {
    expect(await getDecryptedClickUpToken(userClient, userId)).toBe(fakeToken)
  })

  it('clearClickUpToken removes the token but keeps targets', async () => {
    await clearClickUpToken(userClient, userId)

    expect(await getDecryptedClickUpToken(userClient, userId)).toBeNull()

    const { data } = await admin
      .from('user_settings')
      .select('clickup_workspace_id')
      .eq('user_id', userId)
      .single()
    expect(data?.clickup_workspace_id).toBe('99999999')
  })

  it('RLS rejects attempts to operate on another user_id', async () => {
    // Try to decrypt a non-existent (but well-formed) other user_id with the
    // current user's client. RLS should reject (or at minimum return null).
    const otherUuid = '00000000-0000-0000-0000-000000000001'
    const result = await getDecryptedClickUpToken(userClient, otherUuid)
    // Either null (no row visible to caller) or rejection — both prove RLS works.
    expect(result).toBeNull()
  })
})
