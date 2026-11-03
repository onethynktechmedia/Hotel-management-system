export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('rooms')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error saving room:', error)
    return NextResponse.json({ error: 'Failed to save room' }, { status: 500 })
  }
}
