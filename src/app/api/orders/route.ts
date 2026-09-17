import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('orders')
      .select(`
        *,
        tables(*),
        users(*),
        order_items(*)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch dish details separately for each order item
    const dishIds = new Set<string>()
    data?.forEach((order: any) => {
      order.order_items?.forEach((item: any) => {
        if (item.dish_id) dishIds.add(item.dish_id)
      })
    })

    let dishesMap: Record<string, any> = {}
    if (dishIds.size > 0) {
      const { data: dishes } = await supabase
        .from('dishes')
        .select('*')
        .in('id', Array.from(dishIds))

      dishes?.forEach((dish: any) => {
        dishesMap[dish.id] = dish
      })
    }

    // Attach dish data to order items
    data?.forEach((order: any) => {
      order.order_items?.forEach((item: any) => {
        item.dishes = dishesMap[item.dish_id] || null
        item.dish = dishesMap[item.dish_id] || null
      })
    })

    console.log('Orders fetched:', data?.length)
    data?.forEach((order: any) => {
      console.log(`Order ${order.id} has ${order.order_items?.length || 0} items`)
      order.order_items?.forEach((item: any) => {
        console.log(`Item: dish_id=${item.dish_id}, dish_name=${item.dishes?.name || 'MISSING'}`)
      })
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table_id, waiter_id, status, total_amount, customer_name, customer_mobile } = body

    const { data, error } = await supabase
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create notification for all kitchen staff when new order is placed
    const { data: kitchenStaff } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'kitchen')

    if (kitchenStaff && kitchenStaff.length > 0) {
      const notifications = kitchenStaff.map(staff => ({
        user_id: staff.id,
        order_id: data.id,
        type: 'new_order',
        message: `New order received - Table ${table_id}`,
        is_read: false
      }))

      await supabase
        .from('notifications')
        .insert(notifications)
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Delete notifications first (foreign key constraint)
    await supabase
      .from('notifications')
      .delete()
      .eq('order_id', id)

    // Delete the order - CASCADE will handle order_items automatically
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting order:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete order', details: error }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create notification if order is preparing (for kitchen staff)
    if (status === 'preparing') {
      const { data: kitchenStaff } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'kitchen')

      if (kitchenStaff && kitchenStaff.length > 0) {
        const notifications = kitchenStaff.map(staff => ({
          user_id: staff.id,
          order_id: data.id,
          type: 'order_confirmed',
          message: `Order is now being prepared`,
          is_read: false
        }))

        await supabase
          .from('notifications')
          .insert(notifications)
      }
    }

    // Create notification if order is ready (for waiter and kitchen staff)
    if (status === 'ready') {
      // Notify waiter
      await supabase
        .from('notifications')
        .insert({
          user_id: data.waiter_id,
          order_id: data.id,
          type: 'order_ready',
          message: `Order is ready to serve`,
          is_read: false
        })

      // Also notify kitchen staff
      const { data: kitchenStaff } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'kitchen')

      if (kitchenStaff && kitchenStaff.length > 0) {
        const notifications = kitchenStaff.map(staff => ({
          user_id: staff.id,
          order_id: data.id,
          type: 'order_ready',
          message: `Order marked as ready to serve`,
          is_read: false
        }))

        await supabase
          .from('notifications')
          .insert(notifications)
      }
    }

    // Create notification if order is served (for admin and kitchen staff)
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
            type: 'order_completed',
            message: `Order has been served - ready for billing`,
            is_read: false
          })
      }

      // Also notify kitchen staff
      const { data: kitchenStaff } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'kitchen')

      if (kitchenStaff && kitchenStaff.length > 0) {
        const notifications = kitchenStaff.map(staff => ({
          user_id: staff.id,
          order_id: data.id,
          type: 'order_completed',
          message: `Order has been served`,
          is_read: false
        }))

        await supabase
          .from('notifications')
          .insert(notifications)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
