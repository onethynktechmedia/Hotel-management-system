import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { is_read } = body

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(notification)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
