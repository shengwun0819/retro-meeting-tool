/**
 * Unit tests for lib/apiAuth — requireGoogleUser().
 *
 * Mocks @supabase/ssr and next/headers so no real DB / cookie parsing happens.
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

jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))

import { requireGoogleUser } from '@/lib/apiAuth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const mockCreateServerClient = createServerClient as jest.Mock
const mockCookies = cookies as jest.Mock

function makeSupabase(authResult: object) {
  return { auth: { getUser: jest.fn().mockResolvedValue(authResult) } }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCookies.mockResolvedValue({ getAll: () => [], set: jest.fn() })
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

describe('requireGoogleUser — unauthenticated', () => {
  it('returns 401 when getUser returns an error', async () => {
    const supabase = makeSupabase({ data: { user: null }, error: new Error('jwt expired') })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser() as { status: number; json: () => Promise<unknown> }
    expect(result.status).toBe(401)
    expect(await result.json()).toEqual({ error: 'unauthorized' })
  })

  it('returns 401 when user is null and no error', async () => {
    const supabase = makeSupabase({ data: { user: null }, error: null })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser() as { status: number }
    expect(result.status).toBe(401)
  })
})

describe('requireGoogleUser — non-Google user (anonymous)', () => {
  it('returns 403 when app_metadata.provider is anonymous', async () => {
    const supabase = makeSupabase({
      data: { user: { id: 'anon-1', app_metadata: { provider: 'anonymous' }, identities: [] } },
      error: null,
    })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser() as { status: number; json: () => Promise<unknown> }
    expect(result.status).toBe(403)
    expect(await result.json()).toEqual({ error: 'google_login_required' })
  })

  it('returns 403 when app_metadata is empty and identities has no google', async () => {
    const supabase = makeSupabase({
      data: { user: { id: 'anon-2', app_metadata: {}, identities: [{ provider: 'email' }] } },
      error: null,
    })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser() as { status: number }
    expect(result.status).toBe(403)
  })

  it('returns 403 when identities is undefined', async () => {
    const supabase = makeSupabase({
      data: { user: { id: 'anon-3', app_metadata: {}, identities: undefined } },
      error: null,
    })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser() as { status: number }
    expect(result.status).toBe(403)
  })
})

describe('requireGoogleUser — Google user', () => {
  it('returns { supabase, user } when app_metadata.provider is google', async () => {
    const user = { id: 'g-1', app_metadata: { provider: 'google' }, identities: [] }
    const supabase = makeSupabase({ data: { user }, error: null })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser()
    expect(result).toEqual({ supabase, user })
  })

  it('returns { supabase, user } when identities array includes google provider', async () => {
    const user = { id: 'g-2', app_metadata: {}, identities: [{ provider: 'google' }] }
    const supabase = makeSupabase({ data: { user }, error: null })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser()
    expect(result).toEqual({ supabase, user })
  })

  it('returns { supabase, user } when both app_metadata and identities confirm google', async () => {
    const user = {
      id: 'g-3',
      app_metadata: { provider: 'google' },
      identities: [{ provider: 'google' }],
    }
    const supabase = makeSupabase({ data: { user }, error: null })
    mockCreateServerClient.mockReturnValue(supabase)

    const result = await requireGoogleUser()
    expect(result).toEqual({ supabase, user })
  })
})
