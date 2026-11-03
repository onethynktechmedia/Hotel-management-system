import { createClient } from '@supabase/supabase-js'

let supabaseInstance: any = null

function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
  }

  return supabaseInstance
}

export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient()
    return client[prop]
  }
}) as any

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



