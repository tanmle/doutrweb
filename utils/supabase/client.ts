import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Fallback to empty string if missing to avoid runtime crash on load,
    // though auth will fail until user provides the key.
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' 
  )
}
