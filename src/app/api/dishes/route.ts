import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query('SELECT * FROM dishes ORDER BY name')
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch dishes:', error)
    return NextResponse.json({ error: 'Failed to fetch dishes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, price, category, image_url, is_available } = body
    const result = await query(
      'INSERT INTO dishes (name, description, price, category, image_url, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, category, image_url, is_available !== undefined ? is_available : true]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dish' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, price, category, image_url, is_available } = body
    const result = await query(
      'UPDATE dishes SET name = $1, description = $2, price = $3, category = $4, image_url = $5, is_available = $6 WHERE id = $7 RETURNING *',
      [name, description, price, category, image_url, is_available, id]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await query('DELETE FROM dishes WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 })
  }
}
