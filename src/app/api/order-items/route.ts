import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, dish_id, quantity, price, status } = body

    const { data, error } = await supabase
      .from('order_items')
      .insert({
        order_id,
        dish_id,
        quantity,
        price,
        status
      })
      .select('*, dishes(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order item' }, { status: 500 })
  }
}
