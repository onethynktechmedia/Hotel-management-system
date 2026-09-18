import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query('SELECT * FROM tables ORDER BY table_number')
    return NextResponse.json(result.rows)
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
          const result = await query(
            'INSERT INTO tables (table_number, capacity, is_master) VALUES ($1, $2, $3) ON CONFLICT (table_number) DO NOTHING RETURNING *',
            [i, 4, false]
          )
          if (result.rows.length > 0) {
            tables.push(result.rows[0])
          }
        } catch (error) {
          console.log(`Table ${i} might already exist`)
        }
      }
      return NextResponse.json({ success: true, tables, message: 'Initialized 8 tables' })
    }

    // Create single table
    const result = await query(
      'INSERT INTO tables (table_number, capacity, is_master) VALUES ($1, $2, $3) RETURNING *',
      [table_number, capacity, is_master || false]
    )

    return NextResponse.json(result.rows[0])
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
    const ordersResult = await query('SELECT id FROM orders WHERE table_id = $1', [id])
    const orders = ordersResult.rows

    // Delete all orders associated with this table
    for (const order of orders) {
      // Delete notifications for each order
      await query('DELETE FROM notifications WHERE order_id = $1', [order.id])
      // Delete order items
      await query('DELETE FROM order_items WHERE order_id = $1', [order.id])
      // Delete the order
      await query('DELETE FROM orders WHERE id = $1', [order.id])
    }

    // Delete the table
    await query('DELETE FROM tables WHERE id = $1', [id])

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

    const updateFields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (is_occupied !== undefined) {
      updateFields.push(`is_occupied = $${paramCount++}`)
      values.push(is_occupied)
    }
    if (is_master !== undefined) {
      updateFields.push(`is_master = $${paramCount++}`)
      values.push(is_master)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    const queryText = `UPDATE tables SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`

    const result = await query(queryText, values)
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}
