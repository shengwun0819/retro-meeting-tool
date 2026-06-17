/**
 * Unit tests for lib/clickupCrypto.
 * Supabase is a fake { rpc } object passed in by each test; no DB needed.
 *
 * For end-to-end DB validation see clickupCrypto.integration.test.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  saveEncryptedClickUpToken,
  getDecryptedClickUpToken,
  clearClickUpToken,
  updateClickUpTargets,
} from '@/lib/clickupCrypto'

const VALID_KEY = 'test-key-must-be-at-least-16-chars-long'

function makeFakeClient(rpcImpl: jest.Mock): SupabaseClient {
  return { rpc: rpcImpl } as unknown as SupabaseClient
}

let mockRpc: jest.Mock
let client: SupabaseClient

beforeEach(() => {
  mockRpc = jest.fn()
  client = makeFakeClient(mockRpc)
  process.env.CLICKUP_TOKEN_ENCRYPTION_KEY = VALID_KEY
})

afterAll(() => {
  delete process.env.CLICKUP_TOKEN_ENCRYPTION_KEY
})

describe('clickupCrypto — encryption key validation', () => {
  it('throws when CLICKUP_TOKEN_ENCRYPTION_KEY is missing', async () => {
    delete process.env.CLICKUP_TOKEN_ENCRYPTION_KEY
    await expect(getDecryptedClickUpToken(client, 'user-1')).rejects.toThrow(/CLICKUP_TOKEN_ENCRYPTION_KEY/)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('throws when key is too short (<16 chars)', async () => {
    process.env.CLICKUP_TOKEN_ENCRYPTION_KEY = 'short-key'
    await expect(saveEncryptedClickUpToken(client, 'user-1', 'pk_x')).rejects.toThrow(/too short/)
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

describe('clickupCrypto — saveEncryptedClickUpToken', () => {
  it('calls save_clickup_token RPC with token, key, and target IDs', async () => {
    mockRpc.mockResolvedValueOnce({ error: null })

    await saveEncryptedClickUpToken(client, 'user-1', 'pk_abc', {
      workspaceId: 'ws-1',
      docId: 'doc-1',
      parentPageId: 'page-1',
    })

    expect(mockRpc).toHaveBeenCalledWith('save_clickup_token', {
      p_user_id: 'user-1',
      p_token: 'pk_abc',
      p_key: VALID_KEY,
      p_workspace_id: 'ws-1',
      p_doc_id: 'doc-1',
      p_parent_page_id: 'page-1',
    })
  })

  it('passes null for omitted target IDs', async () => {
    mockRpc.mockResolvedValueOnce({ error: null })

    await saveEncryptedClickUpToken(client, 'user-1', 'pk_abc')

    expect(mockRpc).toHaveBeenCalledWith('save_clickup_token', expect.objectContaining({
      p_workspace_id: null,
      p_doc_id: null,
      p_parent_page_id: null,
    }))
  })

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ error: new Error('rpc failed') })
    await expect(saveEncryptedClickUpToken(client, 'user-1', 'pk_x')).rejects.toThrow('rpc failed')
  })
})

describe('clickupCrypto — getDecryptedClickUpToken', () => {
  it('returns the decrypted token string from RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'pk_decrypted', error: null })

    const result = await getDecryptedClickUpToken(client, 'user-1')

    expect(result).toBe('pk_decrypted')
    expect(mockRpc).toHaveBeenCalledWith('decrypt_clickup_token', {
      p_user_id: 'user-1',
      p_key: VALID_KEY,
    })
  })

  it('returns null when RPC returns null (no token set)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })
    expect(await getDecryptedClickUpToken(client, 'user-1')).toBeNull()
  })

  it('returns null when RPC returns empty string', async () => {
    mockRpc.mockResolvedValueOnce({ data: '', error: null })
    expect(await getDecryptedClickUpToken(client, 'user-1')).toBeNull()
  })

  it('throws when RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('decrypt failed') })
    await expect(getDecryptedClickUpToken(client, 'user-1')).rejects.toThrow('decrypt failed')
  })
})

describe('clickupCrypto — clearClickUpToken', () => {
  it('calls clear_clickup_token RPC with user id only', async () => {
    mockRpc.mockResolvedValueOnce({ error: null })
    await clearClickUpToken(client, 'user-1')
    expect(mockRpc).toHaveBeenCalledWith('clear_clickup_token', { p_user_id: 'user-1' })
  })

  it('throws when RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({ error: new Error('clear failed') })
    await expect(clearClickUpToken(client, 'user-1')).rejects.toThrow('clear failed')
  })
})

describe('clickupCrypto — updateClickUpTargets', () => {
  it('calls update_clickup_targets with provided IDs', async () => {
    mockRpc.mockResolvedValueOnce({ error: null })
    await updateClickUpTargets(client, 'user-1', { workspaceId: 'ws-9', docId: 'doc-9' })
    expect(mockRpc).toHaveBeenCalledWith('update_clickup_targets', {
      p_user_id: 'user-1',
      p_workspace_id: 'ws-9',
      p_doc_id: 'doc-9',
      p_parent_page_id: null,
    })
  })

  it('passes null for all targets when none provided', async () => {
    mockRpc.mockResolvedValueOnce({ error: null })
    await updateClickUpTargets(client, 'user-1', {})
    expect(mockRpc).toHaveBeenCalledWith('update_clickup_targets', expect.objectContaining({
      p_workspace_id: null,
      p_doc_id: null,
      p_parent_page_id: null,
    }))
  })

  it('throws when RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({ error: new Error('update failed') })
    await expect(updateClickUpTargets(client, 'user-1', {})).rejects.toThrow('update failed')
  })
})
