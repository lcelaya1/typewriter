import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Use only in server-side code.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
// Fallback placeholders prevent build-time crashes when env vars aren't set.
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)
