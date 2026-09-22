import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qthtkmlvoarafrxyjdpe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aHRrbWx2b2FyYWZyeHlqZHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjY2MTcsImV4cCI6MjEwNDI0MjYxN30.VagDFieZVq2Ni5ofDBXENH0KC34SD744hjbqIGD1IvE'

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
