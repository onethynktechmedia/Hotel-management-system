import { NextRequest } from 'next/server'

export function validateSession(request: NextRequest) {
  const sessionToken = request.cookies.get('hotel_session')?.value
  const userId = request.cookies.get('hotel_user_id')?.value

  if (!sessionToken || !userId) {
    return false
  }

  return true
}

export function requireAuth(request: NextRequest) {
  if (!validateSession(request)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return null
}
