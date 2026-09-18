import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    console.log('Fetching order items for order:', params.id)
    
    const result = await query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
      [params.id]
    )

    const items = result.rows

    // Fetch dish details for each item
    const dishIds = new Set<string>()
    items.forEach((item: any) => {
      if (item.dish_id) dishIds.add(item.dish_id)
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

    // Attach dish data to items and convert prices
    items.forEach((item: any) => {
      item.dishes = dishesMap[item.dish_id] || null
      item.dish = dishesMap[item.dish_id] || null
      item.price = parseFloat(item.price)
    })

    console.log('Order items fetched:', items)
    return NextResponse.json(items || [])
  } catch (error) {
    console.error('Error fetching order items:', error)
    return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
  }
}
