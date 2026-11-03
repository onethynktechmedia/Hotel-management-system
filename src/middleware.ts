import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of protected routes that require authentication
const protectedRoutes = [
  '/secure-dashboard-xyz789',
  '/staff-portal-abc456',
  '/chef-station-def123',
  '/backup-control-ghi789',
  '/offline-admin',
  '/menu',
]

// List of public routes (login, home, etc.)
const publicRoutes = [
  '/',
  '/auth-portal-xyz789',
  '/offline-login',
  '/verify-password',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Get session token from cookies
  const sessionToken = request.cookies.get('hotel_session')?.value
  const userId = request.cookies.get('hotel_user_id')?.value

  // If trying to access protected route without session, redirect to login
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/auth-portal-xyz789', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If already logged in and trying to access login page, redirect to dashboard
  if (isPublicRoute && sessionToken && pathname === '/auth-portal-xyz789') {
    const role = request.cookies.get('hotel_role')?.value || 'admin'
    let dashboardUrl = '/secure-dashboard-xyz789'

    if (role === 'waiter') dashboardUrl = '/staff-portal-abc456'
    else if (role === 'kitchen') dashboardUrl = '/chef-station-def123'
    else if (role === 'offline-admin') dashboardUrl = '/backup-control-ghi789'

    return NextResponse.redirect(new URL(dashboardUrl, request.url))
  }



  // Role-based access control - prevent unauthorized role access
  if (sessionToken) {
    const role = request.cookies.get('hotel_role')?.value || 'admin'

    // Admin-only routes
    if (pathname.startsWith('/secure-dashboard-xyz789') && role !== 'admin') {
      return NextResponse.redirect(new URL('/auth-portal-xyz789', request.url))
    }

    // Waiter-only routes
    if (pathname.startsWith('/staff-portal-abc456') && role !== 'waiter' && role !== 'admin') {
      return NextResponse.redirect(new URL('/auth-portal-xyz789', request.url))
    }

    // Kitchen-only routes
    if (pathname.startsWith('/chef-station-def123') && role !== 'kitchen' && role !== 'admin') {
      return NextResponse.redirect(new URL('/auth-portal-xyz789', request.url))
    }

    // Offline-admin-only routes
    if (pathname.startsWith('/backup-control-ghi789') && role !== 'offline-admin' && role !== 'admin') {
      return NextResponse.redirect(new URL('/auth-portal-xyz789', request.url))
    }
  }

  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (we'll handle API authentication separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
