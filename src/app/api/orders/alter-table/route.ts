import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, new_table_id } = body

    // Get the current order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, tables(*)')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if new table is available
    const { data: newTable, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', new_table_id)
      .single()

    if (tableError || !newTable) {
      return NextResponse.json({ error: 'New table not found' }, { status: 404 })
    }

    if (newTable.is_occupied) {
      return NextResponse.json({ error: 'New table is already occupied' }, { status: 400 })
    }

    // Update order with new table
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ table_id: new_table_id })
      .eq('id', order_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Free up the old table
    await supabase
      .from('tables')
      .update({ is_occupied: false })
      .eq('id', order.table_id)

    // Mark the new table as occupied
    await supabase
      .from('tables')
      .update({ is_occupied: true })
      .eq('id', new_table_id)

    return NextResponse.json(updatedOrder)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to alter table' }, { status: 500 })
  }
}
