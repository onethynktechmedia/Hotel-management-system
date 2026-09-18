import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, dish_id, quantity, price, status } = body

    const result = await query(
      'INSERT INTO order_items (order_id, dish_id, quantity, price, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [order_id, dish_id, quantity, price, status]
    )

    // Fetch dish details
    const dishResult = await query('SELECT * FROM dishes WHERE id = $1', [dish_id])
    const orderItem = result.rows[0]
    orderItem.dishes = dishResult.rows[0] ? { ...dishResult.rows[0], price: parseFloat(dishResult.rows[0].price) } : null
    orderItem.dish = dishResult.rows[0] ? { ...dishResult.rows[0], price: parseFloat(dishResult.rows[0].price) } : null
    orderItem.price = parseFloat(orderItem.price)

    return NextResponse.json(orderItem)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order item' }, { status: 500 })
  }
}
