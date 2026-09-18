import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let queryText = `
      SELECT 
        o.*,
        t.* as table_data,
        u.* as user_data
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.waiter_id = u.id
      ORDER BY o.created_at DESC
    `
    let params: any[] = []

    if (status) {
      const statuses = status.split(',')
      queryText = `
        SELECT 
          o.*,
          t.* as table_data,
          u.* as user_data
        FROM orders o
        LEFT JOIN tables t ON o.table_id = t.id
        LEFT JOIN users u ON o.waiter_id = u.id
        WHERE o.status = ANY($1)
        ORDER BY o.created_at DESC
      `
      params = [statuses]
    }

    const result = await query(queryText, params)
    const orders = result.rows

    // Fetch order items for each order
    for (const order of orders) {
      const itemsResult = await query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      )
      order.order_items = itemsResult.rows
    }

    // Fetch dish details
    const dishIds = new Set<string>()
    orders.forEach((order: any) => {
      order.order_items?.forEach((item: any) => {
        if (item.dish_id) dishIds.add(item.dish_id)
      })
    })

    let dishesMap: Record<string, any> = {}
    if (dishIds.size > 0) {
      const dishesResult = await query(
        'SELECT * FROM dishes WHERE id = ANY($1)',
        [Array.from(dishIds)]
      )
      dishesResult.rows.forEach((dish: any) => {
        dishesMap[dish.id] = {
          ...dish,
          price: parseFloat(dish.price)
        }
      })
    }

    // Attach dish data to order items and convert prices
    orders.forEach((order: any) => {
      order.total_amount = parseFloat(order.total_amount)
      order.order_items?.forEach((item: any) => {
        item.dishes = dishesMap[item.dish_id] || null
        item.dish = dishesMap[item.dish_id] || null
        item.price = parseFloat(item.price)
      })
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table_id, waiter_id, status, total_amount, customer_name, customer_mobile } = body

    const result = await query(
      'INSERT INTO orders (table_id, waiter_id, status, total_amount, customer_name, customer_mobile) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [table_id, waiter_id, status, total_amount, customer_name || null, customer_mobile || null]
    )

    const order = result.rows[0]
    order.total_amount = parseFloat(order.total_amount)
    return NextResponse.json(order)
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

    // Delete notifications first
    await query('DELETE FROM notifications WHERE order_id = $1', [id])

    // Delete order items
    await query('DELETE FROM order_items WHERE order_id = $1', [id])

    // Delete the order
    await query('DELETE FROM orders WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    const result = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )

    const order = result.rows[0]
    order.total_amount = parseFloat(order.total_amount)
    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
