import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

// Single SSR-compatible client for both auth (cookie-based sessions) and realtime.
// createBrowserClient from @supabase/ssr is a singleton — same URL+key always returns
// the same instance, so calling getAuthClient() from multiple places is safe.
export function getAuthClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: { params: { eventsPerSecond: 5 } },
  })
}

// Named export for Board.tsx realtime subscriptions (backward-compatible)
export const supabase = getAuthClient()

export function createServerSupabaseClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  if (serviceKey) {
    return createClient(url, serviceKey)
  }
  return createClient(url, anonKey)
}
