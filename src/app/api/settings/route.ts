export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

const DEFAULT_SETTINGS = {
  hotel_name: 'Dhole Patil Khanawal',
  gst_rate: '5',
  currency: 'INR',
  logo_url: '',
  address: '',
  phone: '',
  email: '',
  gstin: '',
  tax_rates: { cgst: 5, sgst: 5 },
  printer_settings: { printer_type: 'thermal_58mm', auto_print: true, paper_size: '58mm' },
  notification_settings: { new_orders: true, low_inventory: true, staff_changes: false },
  theme_settings: { primary_color: '#6B3E26', secondary_color: '#9A572D' }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    return NextResponse.json({ ...DEFAULT_SETTINGS, ...data[0] })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Ensure there is only ever one settings row
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .limit(1)

    let data, error
    if (existing && existing.length > 0) {
      ;({ data, error } = await supabase
        .from('settings')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select()
        .single())
    } else {
      ;({ data, error } = await supabase
        .from('settings')
        .insert(body)
        .select()
        .single())
    }

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
