import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', params.id)
    
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete order item' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { status, quantity } = body

    console.log('Updating order item:', params.id, 'with status:', status)

    const updateData: any = {}
    if (status !== undefined) {
      updateData.status = status
    }
    if (quantity !== undefined) {
      updateData.quantity = quantity
    }

    const { data: orderItem, error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error updating order item:', error)
      throw error
    }

    console.log('Order item updated successfully:', orderItem.id, 'new status:', orderItem.status)

    if (orderItem.price) {
      orderItem.price = parseFloat(orderItem.price)
    }

    return NextResponse.json(orderItem)
  } catch (error) {
    console.error('Error updating order item:', error)
    return NextResponse.json({ error: 'Failed to update order item' }, { status: 500 })
  }
}
