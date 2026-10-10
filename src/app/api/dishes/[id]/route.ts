import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', params.id)
    
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { name, marathi_name, description, price, category, image_url, is_available, food_type } = body

    const updateData: any = {}
    if (name !== undefined && name !== null) updateData.name = name
    if (marathi_name !== undefined && marathi_name !== null) updateData.marathi_name = marathi_name
    if (description !== undefined && description !== null) updateData.description = description
    if (price !== undefined && price !== null) updateData.price = price
    if (category !== undefined && category !== null) updateData.category = category
    if (image_url !== undefined && image_url !== null) updateData.image_url = image_url
    if (is_available !== undefined && is_available !== null) updateData.is_available = is_available
    if (food_type !== undefined && food_type !== null) updateData.food_type = food_type

    const { data: dish, error } = await supabase
      .from('dishes')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(dish)
  } catch (error: any) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update dish' }, { status: 500 })
  }
}
