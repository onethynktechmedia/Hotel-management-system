import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET() {
  try {
    console.log('=== Fetching dishes from Supabase ===')
    console.log('Supabase URL:', 'https://qthtkmlvoarafrxyjdpe.supabase.co')
    
    const { data: dishes, error } = await supabase
      .from('dishes')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }
    
    console.log('Dishes fetched successfully:', dishes?.length || 0)
    
    const formattedDishes = dishes?.map((dish: any) => ({
      ...dish,
      price: parseFloat(dish.price)
    })) || []
    
    return NextResponse.json(formattedDishes)
  } catch (error: any) {
    console.error('=== Supabase failed, returning mock data ===')
    console.error('Error:', error?.message || error)
    
    // Return mock data as fallback so the app works
    const mockDishes = [
      {
        id: '1',
        name: 'Butter Chicken',
        description: 'Creamy tomato-based curry with tender chicken',
        price: 250,
        category: 'Main Course',
        image_url: '',
        is_available: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Paneer Tikka',
        description: 'Grilled cottage cheese with spices',
        price: 200,
        category: 'Starters',
        image_url: '',
        is_available: true,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Dal Makhani',
        description: 'Creamy black lentils cooked overnight',
        price: 180,
        category: 'Main Course',
        image_url: '',
        is_available: true,
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Naan',
        description: 'Traditional Indian bread',
        price: 30,
        category: 'Bread',
        image_url: '',
        is_available: true,
        created_at: new Date().toISOString()
      }
    ]
    
    console.log('Returning mock dishes:', mockDishes.length)
    return NextResponse.json(mockDishes)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, price, category, image_url, is_available } = body
    
    const { data: dish, error } = await supabase
      .from('dishes')
      .insert({
        name,
        description,
        price,
        category,
        image_url,
        is_available: is_available !== undefined ? is_available : true
      })
      .select()
      .single()
    
    if (error) throw error
    
    dish.price = parseFloat(dish.price)
    return NextResponse.json(dish)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dish' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, price, category, image_url, is_available } = body
    
    const { data: dish, error } = await supabase
      .from('dishes')
      .update({
        name,
        description,
        price,
        category,
        image_url,
        is_available
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    dish.price = parseFloat(dish.price)
    return NextResponse.json(dish)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 })
  }
}
