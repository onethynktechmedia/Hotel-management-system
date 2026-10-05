import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return NextResponse.json(users || [])
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
