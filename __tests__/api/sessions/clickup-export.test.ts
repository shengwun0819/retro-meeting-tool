/**
 * Unit tests for POST /api/sessions/[id]/clickup-export
 *
 * Mocks: requireGoogleUser, getDecryptedClickUpToken,
 *        fetchRetroExportPayload, global.fetch (ClickUp API)
 */

// Must be first — next/server uses Web Crypto which is unavailable in jsdom.
// NextResponse must be a class so that `auth instanceof NextResponse` works in route.ts.
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

import { POST } from '@/app/api/sessions/[id]/clickup-export/route'

// --- Mocks ---

jest.mock('@/lib/apiAuth', () => ({
  requireGoogleUser: jest.fn(),
}))
jest.mock('@/lib/clickupCrypto', () => ({
  getDecryptedClickUpToken: jest.fn(),
}))
jest.mock('@/lib/clickup', () => ({
  fetchRetroExportPayload: jest.fn(),
}))
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(() => ({})),
}))

import { requireGoogleUser } from '@/lib/apiAuth'
import { getDecryptedClickUpToken } from '@/lib/clickupCrypto'
import { fetchRetroExportPayload } from '@/lib/clickup'

const mockRequireGoogleUser = requireGoogleUser as jest.Mock
const mockGetToken = getDecryptedClickUpToken as jest.Mock
const mockFetchPayload = fetchRetroExportPayload as jest.Mock
const mockFetch = jest.fn()
global.fetch = mockFetch

const MOCK_PAYLOAD = {
  taskName: 'Turing Sprint 42 Retro Board',
  markdownContent: '# Sprint 42\n\n## Continue\n\n- item 1',
}

// Minimal request mock — avoids NextRequest's dependency on Web Crypto API in jsdom
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRequest(body: object | null = {}): any {
  return {
    json: () => (body === null ? Promise.reject(new SyntaxError('bad json')) : Promise.resolve(body)),
  }
}

async function makeParams(id = 'sess-1') {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireGoogleUser.mockResolvedValue({ supabase: {}, user: { id: 'user-123' } })
  mockGetToken.mockResolvedValue('pk_testtoken123')
  mockFetchPayload.mockResolvedValue(MOCK_PAYLOAD)
})

describe('POST clickup-export — auth', () => {
  it('forwards 401 when requireGoogleUser returns NextResponse', async () => {
    const { NextResponse } = jest.requireMock('next/server') as { NextResponse: { json: (b: unknown, i?: { status?: number }) => { status: number } } }
    mockRequireGoogleUser.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(401)
  })
})

describe('POST clickup-export — validation', () => {
  it('returns 400 when workspace_id is missing', async () => {
    const res = await POST(makeRequest({ doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_body' })
  })

  it('returns 400 when doc_id is missing', async () => {
    const res = await POST(makeRequest({ workspace_id: '123' }), await makeParams())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_body' })
  })

  it('returns 400 when body is invalid JSON', async () => {
    const res = await POST(makeRequest(null), await makeParams())
    expect(res.status).toBe(400)
  })
})

describe('POST clickup-export — no token', () => {
  it('returns 400 no_token when user has no ClickUp token', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'no_token' })
  })

  it('returns 500 when token lookup throws', async () => {
    mockGetToken.mockRejectedValue(new Error('db error'))

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'token_lookup_failed' })
  })
})

describe('POST clickup-export — payload errors', () => {
  it('returns 404 when session not found', async () => {
    mockFetchPayload.mockRejectedValue(new Error('Session not found'))

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(404)
  })

  it('returns 500 on other payload fetch error', async () => {
    mockFetchPayload.mockRejectedValue(new Error('db connection failed'))

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(500)
  })
})

describe('POST clickup-export — ClickUp API errors', () => {
  it('returns 502 when ClickUp is unreachable', async () => {
    mockFetch.mockRejectedValue(new Error('fetch failed'))

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ error: 'clickup_unreachable' })
  })

  it('returns 401 when ClickUp returns 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: jest.fn() })

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'token_invalid' })
  })

  it('returns 404 when ClickUp returns 404', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: jest.fn() })

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'workspace_or_doc_not_found' })
  })

  it('returns 502 on other ClickUp error status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: jest.fn() })

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ error: 'clickup_error' })
  })
})

describe('POST clickup-export — success', () => {
  it('returns pageId and pageUrl on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'page-xyz' }),
    })

    const res = await POST(
      makeRequest({ workspace_id: 'workspace123', doc_id: 'doc-abc', parent_page_id: 'page-def' }),
      await makeParams()
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pageId).toBe('page-xyz')
    expect(body.pageUrl).toBe('https://app.clickup.com/workspace123/v/dc/doc-abc/page-xyz')
  })

  it('includes parent_page_id in ClickUp request body when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'page-xyz' }),
    })

    await POST(
      makeRequest({ workspace_id: '123', doc_id: 'abc', parent_page_id: 'parent-99' }),
      await makeParams()
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.parent_page_id).toBe('parent-99')
  })

  it('omits parent_page_id from ClickUp request when not provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'page-xyz' }),
    })

    await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.parent_page_id).toBeUndefined()
  })

  it('uses page_title as ClickUp page name when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'page-xyz' }),
    })

    await POST(
      makeRequest({ workspace_id: '123', doc_id: 'abc', page_title: 'My Custom Title' }),
      await makeParams()
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.name).toBe('My Custom Title')
  })

  it('falls back to payload.taskName when page_title is absent', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'page-xyz' }),
    })

    await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.name).toBe(MOCK_PAYLOAD.taskName)
  })

  it('falls back to payload.taskName when page_title is an empty string', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'page-xyz' }),
    })

    await POST(
      makeRequest({ workspace_id: '123', doc_id: 'abc', page_title: '   ' }),
      await makeParams()
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.name).toBe(MOCK_PAYLOAD.taskName)
  })

  it('returns 502 when ClickUp response has no id', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    })

    const res = await POST(makeRequest({ workspace_id: '123', doc_id: 'abc' }), await makeParams())
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ error: 'clickup_unexpected_response' })
  })
})
