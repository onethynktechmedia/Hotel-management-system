import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET() {
  try {
    const { data: tables, error } = await supabase
      .from('tables')
      .select('*')
      .order('table_number')
    
    if (error) throw error
    return NextResponse.json(tables || [])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table_number, capacity, is_master, initialize } = body

    // Initialize 8 tables if requested
    if (initialize) {
      const tables = []
      for (let i = 1; i <= 8; i++) {
        try {
          const { data: table, error } = await supabase
            .from('tables')
            .upsert({ table_number: i, capacity: 4, is_master: false }, { onConflict: 'table_number' })
            .select()
            .single()
          
          if (!error && table) {
            tables.push(table)
          }
        } catch (error) {
          console.log(`Table ${i} might already exist`)
        }
      }
      return NextResponse.json({ success: true, tables, message: 'Initialized 8 tables' })
    }

    // Create single table
    const { data: table, error } = await supabase
      .from('tables')
      .insert({ table_number, capacity, is_master: is_master || false })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(table)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    // Get all orders for this table
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', id)

    // Delete all orders associated with this table
    for (const order of orders || []) {
      // Delete notifications for each order
      await supabase.from('notifications').delete().eq('order_id', order.id)
      // Delete order items
      await supabase.from('order_items').delete().eq('order_id', order.id)
      // Delete the order
      await supabase.from('orders').delete().eq('id', order.id)
    }

    // Delete the table
    await supabase.from('tables').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, is_occupied, is_master } = body

    const updateData: any = {}
    if (is_occupied !== undefined) updateData.is_occupied = is_occupied
    if (is_master !== undefined) updateData.is_master = is_master

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: table, error } = await supabase
      .from('tables')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(table)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}
