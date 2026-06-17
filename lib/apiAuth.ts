import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Builds a user-scoped Supabase client from the request's cookies.
 * Subsequent DB queries are performed under the caller's auth uid, so RLS
 * policies on user_settings (and elsewhere) are correctly enforced.
 */
export async function getUserScopedSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export interface AuthedContext {
  supabase: SupabaseClient
  user: User
}

/**
 * Guard for endpoints that require an authenticated Google user.
 *
 * Returns either:
 *   - `{ supabase, user }` when the caller is a Google-identified user, or
 *   - `NextResponse` (401 / 403) which the route should return immediately.
 *
 * Guests (anonymous Supabase sign-ins) are rejected with 403 — the ClickUp
 * integration is intentionally not available to them per
 * docs/plans/2026-05-19-clickup-personal-token-export.md §3.
 */
export async function requireGoogleUser(): Promise<AuthedContext | NextResponse> {
  const supabase = await getUserScopedSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const isGoogle =
    data.user.app_metadata?.provider === 'google' ||
    data.user.identities?.some((i) => i.provider === 'google') ||
    false
  if (!isGoogle) {
    return NextResponse.json({ error: 'google_login_required' }, { status: 403 })
  }

  return { supabase, user: data.user }
}
