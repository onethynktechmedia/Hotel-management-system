import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    console.log('Fetching order items for order:', params.id)
    
    const { data: items, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', params.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch dish details for each item
    const dishIds = [...new Set(items?.map((item: any) => item.dish_id) || [])]
    const dishesMap: Record<string, any> = {}
    
    if (dishIds.length > 0) {
      const { data: dishes } = await supabase
        .from('dishes')
        .select('*')
        .in('id', dishIds)
      
      dishes?.forEach((dish: any) => {
        dishesMap[dish.id] = {
          ...dish,
          price: parseFloat(dish.price)
        }
      })
    }

    // Attach dish data to items and convert prices
    items?.forEach((item: any) => {
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
