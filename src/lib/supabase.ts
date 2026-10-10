import { createClient } from '@supabase/supabase-js'

// createClient throws on empty strings. Fall back to inert placeholders so the
// app still renders; calls then fail and screens surface the Supabase error.
const url = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'missing-publishable-key'

export const supabase = createClient(url, key)
