import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qthtkmlvoarafrxyjdpe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aHRrbWx2b2FyYWZyeHlqZHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjY2MTcsImV4cCI6MjEwNDI0MjYxN30.VagDFieZVq2Ni5ofDBXENH0KC34SD744hjbqIGD1IvE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
