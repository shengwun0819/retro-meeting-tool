/**
 * Unit tests for POST /api/user/settings/test-token
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

import { POST } from '@/app/api/user/settings/test-token/route'

jest.mock('@/lib/apiAuth', () => ({ requireGoogleUser: jest.fn() }))

import { requireGoogleUser } from '@/lib/apiAuth'

const mockAuth = requireGoogleUser as jest.Mock
const mockFetch = jest.fn()
global.fetch = mockFetch

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRequest(body: unknown): any {
  return {
    json: () => (body === null ? Promise.reject(new SyntaxError('bad json')) : Promise.resolve(body)),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ supabase: {}, user: { id: 'user-123' } })
})

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('POST /api/user/settings/test-token — auth', () => {
  it('forwards 401 when requireGoogleUser returns NextResponse', async () => {
    const { NextResponse } = jest.requireMock('next/server') as { NextResponse: { json: (b: unknown, i?: { status?: number }) => { status: number } } }
    mockAuth.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
    const res = await POST(makeRequest({ token: 'pk_valid123' }))
    expect(res.status).toBe(401)
  })

  it('forwards 403 when guest user calls the endpoint', async () => {
    const { NextResponse } = jest.requireMock('next/server') as { NextResponse: { json: (b: unknown, i?: { status?: number }) => { status: number } } }
    mockAuth.mockResolvedValue(NextResponse.json({ error: 'google_login_required' }, { status: 403 }))
    const res = await POST(makeRequest({ token: 'pk_valid123' }))
    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('POST /api/user/settings/test-token — validation', () => {
  it('returns 400 with reason: invalid when token is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('returns 400 with reason: invalid when token is empty string', async () => {
    const res = await POST(makeRequest({ token: '   ' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('returns 400 with reason: invalid when body is invalid JSON', async () => {
    const res = await POST(makeRequest(null))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

// ---------------------------------------------------------------------------
// ClickUp API errors
// ---------------------------------------------------------------------------

describe('POST /api/user/settings/test-token — ClickUp errors', () => {
  it('returns ok: false reason: unknown when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const res = await POST(makeRequest({ token: 'pk_validtoken' }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'unknown' })
  })

  it('returns ok: false reason: unauthorized when ClickUp returns 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    const res = await POST(makeRequest({ token: 'pk_badtoken' }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'unauthorized' })
  })

  it('returns ok: false reason: rate_limited when ClickUp returns 429', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 })
    const res = await POST(makeRequest({ token: 'pk_validtoken' }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'rate_limited' })
  })

  it('returns ok: false reason: unknown on other non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    const res = await POST(makeRequest({ token: 'pk_validtoken' }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'unknown' })
  })

  it('returns ok: false reason: unknown when ClickUp response has no username', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ user: {} }),
    })
    const res = await POST(makeRequest({ token: 'pk_validtoken' }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'unknown' })
  })

  it('returns ok: false reason: unknown when ClickUp response JSON parse fails', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError('bad json')),
    })
    const res = await POST(makeRequest({ token: 'pk_validtoken' }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'unknown' })
  })
})

// ---------------------------------------------------------------------------
// Success
// ---------------------------------------------------------------------------

describe('POST /api/user/settings/test-token — success', () => {
  it('returns ok: true and username on valid token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ user: { username: 'kevin' } }),
    })
    const res = await POST(makeRequest({ token: 'pk_validtoken123' }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, username: 'kevin' })
  })

  it('does NOT include email or other user fields in the response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        user: { username: 'kevin', email: 'kevin@example.com', color: '#ff0000' },
      }),
    })
    const res = await POST(makeRequest({ token: 'pk_validtoken123' }))
    const body = await res.json()
    expect(body).not.toHaveProperty('email')
    expect(body).not.toHaveProperty('color')
    expect(body.username).toBe('kevin')
  })

  it('trims whitespace from token before sending to ClickUp', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ user: { username: 'kevin' } }),
    })
    await POST(makeRequest({ token: '  pk_validtoken123  ' }))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.clickup.com/api/v2/user')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'pk_validtoken123' })
  })
})
