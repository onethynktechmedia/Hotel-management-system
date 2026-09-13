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
        order_items(
          *,
          dishes(*)
        )
      `)
      .order('created_at', { ascending: true })

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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
    const { table_id, waiter_id, status, total_amount } = body

    const { data, error } = await supabase
      .from('orders')
      .insert({
        table_id,
        waiter_id,
        status,
        total_amount
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
