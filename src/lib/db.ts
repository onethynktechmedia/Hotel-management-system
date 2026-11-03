import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
})

export async function query(text: string, params?: any[]) {
  try {
    console.log('Executing Supabase query:', text)
    throw new Error('Direct SQL queries not supported with Supabase. Please use Supabase client operations instead.')
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export default supabase



