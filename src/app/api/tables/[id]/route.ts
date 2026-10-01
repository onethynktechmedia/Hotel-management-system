import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Get all orders for this table
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', params.id)

    // Delete all orders associated with this table
    for (const order of orders || []) {
      // Delete notifications for each order
      await supabase.from('notifications').delete().eq('order_id', order.id)
      // Delete order items
      await supabase.from('order_items').delete().eq('order_id', order.id)
      // Delete the order
      await supabase.from('orders').delete().eq('id', order.id)
    }

    // Delete the table
    const { error } = await supabase.from('tables').delete().eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { is_occupied, is_master, master_table_id, is_prebooked, prebooked_by, prebooked_time, capacity, table_number } = body

    const updateData: any = {}
    if (is_occupied !== undefined) updateData.is_occupied = is_occupied
    if (is_master !== undefined) updateData.is_master = is_master
    if (master_table_id !== undefined) updateData.master_table_id = master_table_id
    if (is_prebooked !== undefined) updateData.is_prebooked = is_prebooked
    if (prebooked_by !== undefined) updateData.prebooked_by = prebooked_by
    if (prebooked_time !== undefined) updateData.prebooked_time = prebooked_time
    if (capacity !== undefined) updateData.capacity = capacity
    if (table_number !== undefined) updateData.table_number = table_number

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: table, error } = await supabase
      .from('tables')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(table)
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}
