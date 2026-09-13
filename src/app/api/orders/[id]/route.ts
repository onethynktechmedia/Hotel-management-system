import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { status, total_amount } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (total_amount !== undefined) updateData.total_amount = total_amount

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select('*, tables(*), users(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create notification if order is confirmed
    if (status === 'confirmed') {
      await supabase
        .from('notifications')
        .insert({
          user_id: data.waiter_id,
          order_id: data.id,
          type: 'order_confirmed',
          message: `Order for Table ${data.tables?.table_number} confirmed and sent to kitchen`,
          is_read: false
        })
    }

    // Create notification if order is ready (for waiter)
    if (status === 'ready') {
      await supabase
        .from('notifications')
        .insert({
          user_id: data.waiter_id,
          order_id: data.id,
          type: 'order_ready',
          message: `Order is ready to serve`,
          is_read: false
        })
    }

    // Create notification if order is served (for admin)
    if (status === 'served') {
      // Get admin user
      const { data: adminData } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .single()

      if (adminData) {
        await supabase
          .from('notifications')
          .insert({
            user_id: adminData.id,
            order_id: data.id,
            type: 'order_served',
            message: `Order has been served - ready for billing`,
            is_read: false
          })
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
