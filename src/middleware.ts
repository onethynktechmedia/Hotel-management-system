import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Secure route mappings
const SECURE_ROUTES = {
  admin: '/admin',
  waiter: '/staff-portal-abc456',
  kitchen: '/chef-station-def123',
  'offline-admin': '/backup-control-ghi789'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (pathname === '/' || pathname === '/menu') {
    return NextResponse.next()
  }
  
  // Block old login route - return 404
  if (pathname === '/login') {
    return new NextResponse('Not Found', { status: 404 })
  }
  
  // Allow access to secure login route
  if (pathname === '/dpk') {
    return NextResponse.next()
  }
  
  // Redirect old routes to new secure routes
  if (pathname === '/waiter') {
    return NextResponse.redirect(new URL(SECURE_ROUTES.waiter, request.url))
  }
  if (pathname === '/kitchen') {
    return NextResponse.redirect(new URL(SECURE_ROUTES.kitchen, request.url))
  }
  if (pathname === '/offline-admin') {
    return NextResponse.redirect(new URL(SECURE_ROUTES['offline-admin'], request.url))
  }
  
  // Check if accessing secure routes - just check if logged in, not role
  const isSecureRoute = Object.values(SECURE_ROUTES).includes(pathname) || pathname === '/admin'
  
  if (isSecureRoute) {
    // Check if user is authenticated via cookie
    const sessionCookie = request.cookies.get('hotel_session')
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/dpk', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/menu',
    '/login',
    '/dpk',
    '/admin',
    '/waiter',
    '/kitchen',
    '/offline-admin',
    '/admin',
    '/staff-portal-abc456',
    '/chef-station-def123',
    '/backup-control-ghi789'
  ]
}
