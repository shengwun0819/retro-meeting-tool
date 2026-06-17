/**
 * Unit tests for GET/PUT/DELETE /api/user/settings
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number
    _body: unknown
    constructor(body: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200
      this._body = body
    }
    json() { return Promise.resolve(this._body) }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init)
    }
  }
  return { NextResponse: MockNextResponse }
})

import { GET, PUT, DELETE } from '@/app/api/user/settings/route'

jest.mock('@/lib/apiAuth', () => ({ requireGoogleUser: jest.fn() }))
jest.mock('@/lib/clickupCrypto', () => ({
  saveEncryptedClickUpToken: jest.fn(),
  clearClickUpToken: jest.fn(),
  updateClickUpTargets: jest.fn(),
}))

import { requireGoogleUser } from '@/lib/apiAuth'
import {
  saveEncryptedClickUpToken,
  clearClickUpToken,
  updateClickUpTargets,
} from '@/lib/clickupCrypto'

const mockAuth = requireGoogleUser as jest.Mock
const mockSaveToken = saveEncryptedClickUpToken as jest.Mock
const mockClear = clearClickUpToken as jest.Mock
const mockUpdateTargets = updateClickUpTargets as jest.Mock

const MOCK_SUPABASE = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRequest(body: unknown): any {
  return {
    json: () => (body === null ? Promise.reject(new SyntaxError('bad json')) : Promise.resolve(body)),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ supabase: MOCK_SUPABASE, user: { id: 'user-123' } })
  MOCK_SUPABASE.from.mockReturnThis()
  MOCK_SUPABASE.select.mockReturnThis()
  MOCK_SUPABASE.eq.mockReturnThis()
  MOCK_SUPABASE.maybeSingle.mockResolvedValue({ data: null, error: null })
})

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/user/settings — auth', () => {
  it('forwards 401 when requireGoogleUser returns NextResponse', async () => {
    const { NextResponse } = jest.requireMock('next/server') as { NextResponse: { json: (b: unknown, i?: { status?: number }) => { status: number } } }
    mockAuth.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
    const res = await GET()
    expect(res.status).toBe(401)
  })
})

describe('GET /api/user/settings — response', () => {
  it('returns clickup_token_set: false when no settings row', async () => {
    MOCK_SUPABASE.maybeSingle.mockResolvedValue({ data: null, error: null })
    const res = await GET()
    const body = await res.json()
    expect(body.clickup_token_set).toBe(false)
    expect(body.clickup_workspace_id).toBeNull()
  })

  it('returns clickup_token_set: true when token is set', async () => {
    MOCK_SUPABASE.maybeSingle.mockResolvedValue({
      data: {
        clickup_token_encrypted: 'enc_blob',
        clickup_workspace_id: 'workspace123',
        clickup_doc_id: 'doc-abc',
        clickup_parent_page_id: 'page-def',
      },
      error: null,
    })
    const res = await GET()
    const body = await res.json()
    expect(body.clickup_token_set).toBe(true)
    expect(body).not.toHaveProperty('clickup_token')
    expect(body.clickup_workspace_id).toBe('workspace123')
  })

  it('returns 500 on db error', async () => {
    MOCK_SUPABASE.maybeSingle.mockResolvedValue({ data: null, error: new Error('db fail') })
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// PUT — token
// ---------------------------------------------------------------------------

describe('PUT /api/user/settings — body validation', () => {
  it('returns 400 on invalid JSON', async () => {
    const res = await PUT(makeRequest(null))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_body' })
  })

  it('returns 400 when token is too short', async () => {
    const res = await PUT(makeRequest({ clickup_token: 'pk_12' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_token_format' })
  })

  it('returns 400 when token does not start with pk_', async () => {
    const res = await PUT(makeRequest({ clickup_token: 'sk_toolongbutbad' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_token_format' })
  })

  it('returns 400 when no token and no targets provided', async () => {
    const res = await PUT(makeRequest({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'nothing_to_update' })
  })
})

describe('PUT /api/user/settings — save token', () => {
  it('saves valid token and returns ok', async () => {
    mockSaveToken.mockResolvedValue(undefined)
    const res = await PUT(makeRequest({ clickup_token: 'pk_validtoken123' }))
    expect(mockSaveToken).toHaveBeenCalledWith(MOCK_SUPABASE, 'user-123', 'pk_validtoken123', expect.any(Object))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('returns 500 when saveEncryptedClickUpToken throws', async () => {
    mockSaveToken.mockRejectedValue(new Error('crypto fail'))
    const res = await PUT(makeRequest({ clickup_token: 'pk_validtoken123' }))
    expect(res.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// PUT — null clearing (regression for typo-app review bug)
// ---------------------------------------------------------------------------

describe('PUT /api/user/settings — null target clearing', () => {
  it('clears workspace_id when null is passed', async () => {
    mockUpdateTargets.mockResolvedValue(undefined)
    const res = await PUT(makeRequest({ clickup_workspace_id: null }))
    expect(res.status).toBe(200)
    expect(mockUpdateTargets).toHaveBeenCalledWith(
      MOCK_SUPABASE, 'user-123',
      expect.objectContaining({ workspaceId: null })
    )
  })

  it('clears all targets when all are null', async () => {
    mockUpdateTargets.mockResolvedValue(undefined)
    const res = await PUT(makeRequest({
      clickup_workspace_id: null,
      clickup_doc_id: null,
      clickup_parent_page_id: null,
    }))
    expect(res.status).toBe(200)
    expect(mockUpdateTargets).toHaveBeenCalledWith(
      MOCK_SUPABASE, 'user-123',
      { workspaceId: null, docId: null, parentPageId: null }
    )
  })

  it('does NOT return 400 when only null targets are provided', async () => {
    mockUpdateTargets.mockResolvedValue(undefined)
    const res = await PUT(makeRequest({ clickup_doc_id: null }))
    expect(res.status).not.toBe(400)
  })
})

describe('PUT /api/user/settings — update targets (no token)', () => {
  it('updates targets and returns ok', async () => {
    mockUpdateTargets.mockResolvedValue(undefined)
    const res = await PUT(makeRequest({ clickup_workspace_id: '99', clickup_doc_id: 'doc-1' }))
    expect(res.status).toBe(200)
    expect(mockUpdateTargets).toHaveBeenCalledWith(
      MOCK_SUPABASE, 'user-123',
      expect.objectContaining({ workspaceId: '99', docId: 'doc-1' })
    )
  })

  it('returns 500 when updateClickUpTargets throws', async () => {
    mockUpdateTargets.mockRejectedValue(new Error('db fail'))
    const res = await PUT(makeRequest({ clickup_workspace_id: '99' }))
    expect(res.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/user/settings — auth', () => {
  it('forwards 401 when requireGoogleUser returns NextResponse', async () => {
    const { NextResponse } = jest.requireMock('next/server') as { NextResponse: { json: (b: unknown, i?: { status?: number }) => { status: number } } }
    mockAuth.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
    const res = await DELETE()
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/user/settings', () => {
  it('clears token and returns ok', async () => {
    mockClear.mockResolvedValue(undefined)
    const res = await DELETE()
    expect(mockClear).toHaveBeenCalledWith(MOCK_SUPABASE, 'user-123')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('returns 500 when clearClickUpToken throws', async () => {
    mockClear.mockRejectedValue(new Error('fail'))
    const res = await DELETE()
    expect(res.status).toBe(500)
  })
})
