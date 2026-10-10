import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
