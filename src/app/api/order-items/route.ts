import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle both single item and array of items
    const items = Array.isArray(body) ? body : [body]
    
    console.log('Creating order items:', items)
    
    const createdItems = []
    
    for (const item of items) {
      const { order_id, dish_id, quantity, price, status, dish_type } = item
      
      const { data: orderItem, error } = await supabase
        .from('order_items')
        .insert({
          order_id,
          dish_id,
          quantity,
          price,
          status,
          dish_type: dish_type || 'Normal'
        })
        .select()
        .single()
      
      if (error) throw error
      
      orderItem.price = parseFloat(orderItem.price)
      createdItems.push(orderItem)
    }
    
    // Fetch dish details for all items
    const dishIds = [...new Set(items.map((item: any) => item.dish_id))]
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
    
    // Attach dish data to items
    createdItems.forEach((item: any) => {
      item.dishes = dishesMap[item.dish_id] || null
      item.dish = dishesMap[item.dish_id] || null
    })
    
    return NextResponse.json(Array.isArray(body) ? createdItems : createdItems[0])
  } catch (error) {
    console.error('Error creating order items:', error)
    return NextResponse.json({ error: 'Failed to create order items', details: String(error) }, { status: 500 })
  }
}
