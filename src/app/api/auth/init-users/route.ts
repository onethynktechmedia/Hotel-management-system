import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function POST() {
  try {
    // Check if users already exist
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('email')
      .limit(1)

    if (checkError) {
      console.error('Error checking existing users:', checkError)
      return NextResponse.json({ error: 'Failed to check existing users' }, { status: 500 })
    }

    // If users exist, return success
    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ message: 'Users already initialized', count: existingUsers.length })
    }

    // Insert default users
    const defaultUsers = [
      { email: 'admin@hotel.com', password: 'admin123', role: 'admin', name: 'Admin User' },
      { email: 'waiter@hotel.com', password: 'waiter123', role: 'waiter', name: 'John Waiter' },
      { email: 'kitchen@hotel.com', password: 'kitchen123', role: 'kitchen', name: 'Chef Mike' }
    ]

    const { data: users, error: insertError } = await supabase
      .from('users')
      .insert(defaultUsers)
      .select()

    if (insertError) {
      console.error('Error inserting users:', insertError)
      return NextResponse.json({ error: 'Failed to insert users', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Users initialized successfully', users })
  } catch (error) {
    console.error('Init users error:', error)
    return NextResponse.json({ error: 'Failed to initialize users' }, { status: 500 })
  }
}
