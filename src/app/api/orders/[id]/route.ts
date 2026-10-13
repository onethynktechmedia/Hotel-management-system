import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params
    console.log('Fetching order with ID:', id)

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        tables:table_id (*),
        users:waiter_id (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    console.log('Order fetched:', order.id)

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
    }
    console.log('Items fetched:', items?.length, 'items')

    order.order_items = items || []

    // Fetch dish details
    const dishIds = [...new Set(order.order_items.map((item: any) => item.dish_id))]
    console.log('Dish IDs:', dishIds)
    if (dishIds.length > 0) {
      const { data: dishes } = await supabase
        .from('dishes')
        .select('*')
        .in('id', dishIds)

      console.log('Dishes fetched:', dishes?.length)

      const dishesMap: Record<string, any> = {}
      dishes?.forEach((dish: any) => {
        dishesMap[dish.id] = {
          ...dish,
          price: parseFloat(dish.price)
        }
      })

      order.order_items.forEach((item: any) => {
        item.dishes = dishesMap[item.dish_id] || null
        item.dish = dishesMap[item.dish_id] || null
        item.price = parseFloat(item.price)
      })
    }

    order.total_amount = parseFloat(order.total_amount)
    console.log('Final order with items:', order.order_items?.length)
    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params
    const body = await request.json()
    const { status, total_amount, is_printed } = body

    console.log('Updating order with ID:', id, 'with data:', body)

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (total_amount !== undefined) updateData.total_amount = total_amount
    if (is_printed !== undefined) updateData.is_printed = is_printed

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error updating order:', error)
      throw error
    }

    console.log('Order updated successfully:', order.id, 'new status:', order.status)

    if (order.total_amount) {
      order.total_amount = parseFloat(order.total_amount)
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message },
      { status: 500 }
    )
  }
}
