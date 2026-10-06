# Password Change Verification Setup

This document explains how to set up the password change verification system with email confirmation.

## Overview

The password change system now requires email verification before a waiter's password is actually changed. This ensures security by:

1. Admin initiates password change from dashboard
2. Verification email is sent to waiter's email address
3. Waiter clicks link in email to confirm the change
4. Password is only updated after email verification

## Database Setup

The `password_change_requests` table should already exist. If not, run:

```bash
psql -U postgres -d your_database -f add-password-change-verification.sql
```

Or run the SQL directly in your Supabase SQL editor.

## Email Service Setup (Resend)

### 1. Create a Resend Account

1. Go to https://resend.com and sign up
2. Verify your email address
3. Navigate to API Keys section
4. Create a new API key

### 2. Configure Domain

1. In Resend, go to Domains section
2. Add your domain (e.g., yourdomain.com)
3. Follow the DNS instructions to verify your domain
4. Once verified, you can send emails from your domain

### 3. Set Environment Variables

Add these to your `.env.local` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

For local development:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Deploy to Production

When deploying to Vercel or other platforms:

1. Add the environment variables in your deployment platform's settings
2. Set `NEXT_PUBLIC_APP_URL` to your production domain
3. Deploy the application

## How It Works

### For Admin

1. Go to Admin Dashboard → Waiters tab
2. Click the Key icon next to a waiter
3. Enter the new password (minimum 6 characters)
4. Click OK - this initiates the password change request
5. A verification email is sent to the waiter's email address
6. The password is NOT changed yet - waiter must verify via email

### For Waiter

1. Waiter receives email with verification link
2. Waiter clicks the link in the email
3. They are redirected to `/verify-password?token=...`
4. The page verifies the token and updates the password
5. Waiter sees success message and can log in with new password

## Security Features

- **Token-based verification**: Each request gets a unique token
- **24-hour expiration**: Tokens expire after 24 hours
- **One-time use**: Tokens can only be used once
- **Status tracking**: Requests marked as pending, completed, or expired
- **Email verification**: Password only changes after email confirmation

## Testing Without Email

For development/testing without email configuration:

1. Leave `RESEND_API_KEY` empty or not set
2. The system will still create password change requests
3. The verification link will be returned in the API response
4. You can manually use the link to test the verification flow

Example response when email is not configured:

```json
{
  "success": true,
  "message": "Password change request created (email not configured)",
  "verificationLink": "http://localhost:3000/verify-password?token=abc123...",
  "token": "abc123..."
}
```

## Troubleshooting

### Emails not sending

- Check that `RESEND_API_KEY` is set correctly
- Verify your domain is verified in Resend
- Check Resend dashboard for email logs
- Ensure waiter has a valid email address

### Verification link not working

- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- Ensure the `/verify-password` page exists
- Check browser console for errors
- Verify token hasn't expired (24-hour limit)

### Password not updating after verification

- Check Supabase logs for errors
- Verify `password_change_requests` table exists
- Check that user ID is valid
- Ensure token hasn't already been used

## Database Cleanup

To clean up expired password change requests, you can run:

```sql
DELETE FROM password_change_requests
WHERE status = 'expired'
AND expires_at < NOW() - INTERVAL '7 days';
```

Or create a scheduled job in Supabase to automatically clean up old requests.
