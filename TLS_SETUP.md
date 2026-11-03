# TLS 1.3 Setup Guide

This guide explains how to enable TLS 1.3 for the Electron desktop application.

## Enabling TLS 1.3

### Step 1: Generate SSL Certificates

For local development/testing, you can generate self-signed certificates:

```bash
# Create certs directory
mkdir -p certs

# Generate private key
openssl genrsa -out certs/key.pem 2048

# Generate certificate
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365
```

### Step 2: Configure Environment Variables

Create or update your `.env` file with the following:

```env
USE_HTTPS=true
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
```

### Step 3: Restart the Application

When you restart the Electron application with these settings:

- If SSL certificates are found, the app will run on HTTPS port 3443 with TLS 1.3 enforced
- If certificates are not found, it will fall back to HTTP port 3000

## Production Deployment

For production:

1. **Use a valid SSL certificate** from a trusted Certificate Authority (CA)
2. **Set USE_HTTPS=true** in your production environment
3. **Point SSL_KEY_PATH and SSL_CERT_PATH** to your production certificate files

## Security Headers

The application automatically includes the following security headers when TLS is enabled:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains` - Enforces HTTPS
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` - Restricts browser features

## Verification

To verify TLS 1.3 is enabled:

1. Open the application in a browser
2. Check the browser's security info (click the lock icon)
3. Verify the connection uses TLS 1.3

Alternatively, use `openssl` to test:

```bash
openssl s_client -connect 127.0.0.1:3443 -tls1_3
```

## Note for Vercel Deployment

If deploying to Vercel, TLS is handled automatically by Vercel's infrastructure with modern TLS versions including 1.3. No additional configuration is needed.
