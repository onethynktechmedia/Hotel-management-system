import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET() {
  try {
    const { data: dishes, error } = await supabase
      .from('dishes')
      .select('*')
      .order('name')
    
    if (error) throw error
    return NextResponse.json(dishes || [])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dishes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, marathi_name, description, price, category, image_url, is_available, food_type } = body

    const { data: dish, error } = await supabase
      .from('dishes')
      .insert({
        name,
        marathi_name,
        description,
        price,
        category,
        image_url,
        is_available: is_available !== undefined ? is_available : true,
        food_type: food_type || 'veg'
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(dish)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dish' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Dish ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, marathi_name, description, price, category, image_url, is_available, food_type } = body

    console.log('=== PATCH dishes request ===')
    console.log('Full body:', body)
    console.log('Dish ID:', id)

    // First check if dish exists
    const { data: existingDish, error: checkError } = await supabase
      .from('dishes')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existingDish) {
      console.error('Dish not found:', checkError)
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined && name !== null) updateData.name = name
    if (marathi_name !== undefined && marathi_name !== null) updateData.marathi_name = marathi_name
    if (description !== undefined && description !== null) updateData.description = description
    if (price !== undefined && price !== null) updateData.price = price
    if (category !== undefined && category !== null) updateData.category = category
    if (image_url !== undefined && image_url !== null) updateData.image_url = image_url
    if (is_available !== undefined && is_available !== null) updateData.is_available = is_available
    if (food_type !== undefined && food_type !== null) updateData.food_type = food_type

    console.log('Update data:', updateData)

    const { data: dish, error } = await supabase
      .from('dishes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Updated dish result:', dish)
    console.log('=== PATCH complete ===')
    return NextResponse.json(dish)
  } catch (error: any) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update dish' }, { status: 500 })
  }
}
