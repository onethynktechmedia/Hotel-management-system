import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out successfully' })

  // Clear all auth cookies
  response.cookies.delete('hotel_session')
  response.cookies.delete('hotel_role')
  response.cookies.delete('hotel_user_id')

  return response
}
