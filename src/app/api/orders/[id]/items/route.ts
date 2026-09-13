import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    console.log('Fetching order items for order:', params.id)
    
    const { data, error } = await supabase
      .from('order_items')
      .select('*, dishes(*)')
      .eq('order_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Order items fetched:', data)
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching order items:', error)
    return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
  }
}
