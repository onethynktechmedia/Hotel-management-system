export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()

    if (error) {
      // If settings don't exist, return default settings
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          hotel_name: 'Dhole Patil Khanawal',
          gst_rate: '5',
          currency: 'INR',
          logo_url: ''
        })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('settings')
      .upsert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
