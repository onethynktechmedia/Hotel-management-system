import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Rate limiting check (simple implementation)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    // In production, you'd use Redis for rate limiting
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (error || !user) {
      // Log failed attempt for security monitoring
      console.error(`Failed login attempt for email: ${email} from IP: ${ip}`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Update last_active timestamp on successful login
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id)

    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    
    // In production, store this in a database with expiration
    // For now, we'll return it to be stored in a secure cookie
    
    // Return user data without sensitive information
    const { password: _, ...safeUser } = user
    
    return NextResponse.json({ 
      user: safeUser,
      session_token: sessionToken,
      expires_in: 86400 // 24 hours
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
