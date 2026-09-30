import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

// Generate a random verification token
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// POST - Initiate password change request (sends email to waiter)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { waiter_id, new_password } = body

    if (!waiter_id || !new_password) {
      return NextResponse.json({ error: 'Waiter ID and new password are required' }, { status: 400 })
    }

    // Get waiter details
    const { data: waiter, error: waiterError } = await supabase
      .from('users')
      .select('*')
      .eq('id', waiter_id)
      .eq('role', 'waiter')
      .single()

    if (waiterError || !waiter) {
      return NextResponse.json({ error: 'Waiter not found' }, { status: 404 })
    }

    // Generate verification token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Store password change request in database
    const { error: insertError } = await supabase
      .from('password_change_requests')
      .insert({
        user_id: waiter_id,
        new_password: new_password,
        token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })

    if (insertError) {
      console.error('Error storing password change request:', insertError)
      // If table doesn't exist, create it
      if (insertError.code === '42P01') {
        // Table doesn't exist, return instructions to create it
        return NextResponse.json({ 
          error: 'Password change table not found. Please create the password_change_requests table.',
          sql: `
            CREATE TABLE password_change_requests (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID REFERENCES users(id),
              new_password TEXT NOT NULL,
              token TEXT UNIQUE NOT NULL,
              expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
              status TEXT DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to create password change request' }, { status: 500 })
    }

    // In a real application, you would send an email here
    // For now, we'll return the token for testing purposes
    // In production, use a service like SendGrid, AWS SES, or Resend
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-password?token=${token}`

    console.log('Password change verification link:', verificationLink)
    console.log('Waiter email:', waiter.email)

    // TODO: Implement actual email sending
    // Example using Resend:
    // await resend.emails.send({
    //   from: 'your-email@yourdomain.com',
    //   to: waiter.email,
    //   subject: 'Password Change Verification',
    //   html: `<p>Click <a href="${verificationLink}">here</a> to confirm your password change. This link expires in 24 hours.</p>`
    // })

    return NextResponse.json({ 
      success: true,
      message: 'Password change verification email sent',
      // For testing only - remove in production
      verificationLink,
      token
    })
  } catch (error) {
    console.error('Error initiating password change:', error)
    return NextResponse.json({ error: 'Failed to initiate password change' }, { status: 500 })
  }
}

// PATCH - Confirm password change (called by waiter from email link)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body as { token: string }

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find valid password change request
    const { data: changeRequest, error: requestError } = await supabase
      .from('password_change_requests')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (requestError || !changeRequest) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    // Check if token has expired
    if (new Date(changeRequest.expires_at) < new Date()) {
      await supabase
        .from('password_change_requests')
        .update({ status: 'expired' })
        .eq('id', changeRequest.id)
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: changeRequest.new_password })
      .eq('id', changeRequest.user_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    // Mark request as completed
    await supabase
      .from('password_change_requests')
      .update({ status: 'completed' })
      .eq('id', changeRequest.id)

    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error confirming password change:', error)
    return NextResponse.json({ error: 'Failed to confirm password change' }, { status: 500 })
  }
}

// GET - Check token status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const { data: changeRequest, error } = await supabase
      .from('password_change_requests')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !changeRequest) {
      return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 400 })
    }

    if (changeRequest.status !== 'pending') {
      return NextResponse.json({ valid: false, error: 'Token already used or expired' }, { status: 400 })
    }

    if (new Date(changeRequest.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Token has expired' }, { status: 400 })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Error checking token:', error)
    return NextResponse.json({ error: 'Failed to check token' }, { status: 500 })
  }
}
