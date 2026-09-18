import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { status, total_amount } = body

    const updateFields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`)
      values.push(status)
    }
    if (total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramCount++}`)
      values.push(total_amount)
    }

    values.push(params.id)
    const queryText = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`

    const result = await query(queryText, values)
    const order = result.rows[0]
    if (order.total_amount) {
      order.total_amount = parseFloat(order.total_amount)
    }

    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
