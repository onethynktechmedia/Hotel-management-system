import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('orders')
      .select(`
        *,
        tables:table_id (*),
        users:waiter_id (*)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const { data: orders, error } = await query

    if (error) throw error

    // Fetch order items for each order
    for (const order of orders || []) {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
      
      order.order_items = items || []

      // Fetch dish details
      const dishIds = [...new Set(order.order_items.map((item: any) => item.dish_id))]
      if (dishIds.length > 0) {
        const { data: dishes } = await supabase
          .from('dishes')
          .select('*')
          .in('id', dishIds)
        
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
    }

    return NextResponse.json(orders || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table_id, waiter_id, status, total_amount, customer_name, customer_mobile } = body

    console.log('Creating order with:', { table_id, waiter_id, status, total_amount, customer_name, customer_mobile })

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        table_id,
        waiter_id,
        status,
        total_amount,
        customer_name: customer_name || null,
        customer_mobile: customer_mobile || null
      })
      .select()
      .single()

    if (error) throw error

    order.total_amount = parseFloat(order.total_amount)
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order', details: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Delete notifications first
    await supabase.from('notifications').delete().eq('order_id', id)

    // Delete order items
    await supabase.from('order_items').delete().eq('order_id', id)

    // Delete the order
    await supabase.from('orders').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, total_amount } = body

    const updateData: any = { status }
    if (total_amount !== undefined) {
      updateData.total_amount = total_amount
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    order.total_amount = parseFloat(order.total_amount)
    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
