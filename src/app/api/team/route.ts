export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('team')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('team')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error saving team member:', error)
    return NextResponse.json({ error: 'Failed to save team member' }, { status: 500 })
  }
}
