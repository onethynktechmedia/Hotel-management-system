import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('table_number')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
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
        const { data, error } = await supabase
          .from('tables')
          .insert({
            table_number: i,
            capacity: 4,
            is_master: false
          })
          .select()
          .single()

        if (error) {
          // Table might already exist, continue
          console.log(`Table ${i} might already exist:`, error.message)
        } else {
          tables.push(data)
        }
      }
      return NextResponse.json({ success: true, tables, message: 'Initialized 8 tables' })
    }

    // Create single table
    const { data, error } = await supabase
      .from('tables')
      .insert({
        table_number,
        capacity,
        is_master: is_master || false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
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
    if (orders && orders.length > 0) {
      for (const order of orders) {
        // Delete notifications for each order
        await supabase
          .from('notifications')
          .delete()
          .eq('order_id', order.id)

        // Delete the order (CASCADE will handle order_items)
        await supabase
          .from('orders')
          .delete()
          .eq('id', order.id)
      }
    }

    // Delete the table
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting table:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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

    const { data, error } = await supabase
      .from('tables')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}
