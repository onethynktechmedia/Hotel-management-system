export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

// Tables that contain transactional / demo data safe to wipe for a fresh launch.
// Master data (dishes, tables, users, settings, team, inventory, rooms) is preserved.
const TRANSACTIONAL_TABLES = [
  'order_items',
  'orders',
  'payments',
  'notifications',
  'reservations',
  'bookings',
  'delivery',
  'transactions',
  'campaigns',
  'attendance',
  'shifts',
  'dish_ratings',
  'customers'
]

export async function POST(request: NextRequest) {
  try {
    const { confirm } = await request.json().catch(() => ({}))
    if (confirm !== 'CLEAR_ALL_DATA') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "CLEAR_ALL_DATA" }' },
        { status: 400 }
      )
    }

    const results: Record<string, number | string> = {}

    for (const table of TRANSACTIONAL_TABLES) {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .not('id', 'is', null)

      if (error) {
        // Table may not exist in this Supabase project — skip it
        results[table] = `skipped: ${error.message}`
      } else {
        results[table] = count ?? 0
      }
    }

    // Reset all tables to available (no active orders remain)
    const { error: tablesError } = await supabase
      .from('tables')
      .update({ is_occupied: false, is_prebooked: false, prebooked_by: null, prebooked_time: null })

    if (tablesError) {
      results.tables_reset = `failed: ${tablesError.message}`
    } else {
      results.tables_reset = 'ok'
    }

    return NextResponse.json({ success: true, cleared: results })
  } catch (error) {
    console.error('Error clearing data:', error)
    return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 })
  }
}
