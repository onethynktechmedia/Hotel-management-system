import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Delete notifications first
    await supabase.from('notifications').delete().eq('order_id', params.id)

    // Delete order items
    await supabase.from('order_items').delete().eq('order_id', params.id)

    // Delete the order
    await supabase.from('orders').delete().eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { status, total_amount } = body

    const updateData: any = {}
    if (status !== undefined) {
      updateData.status = status
    }
    if (total_amount !== undefined) {
      updateData.total_amount = total_amount
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    if (order.total_amount) {
      order.total_amount = parseFloat(order.total_amount)
    }

    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
