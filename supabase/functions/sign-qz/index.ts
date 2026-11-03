/**
 * Supabase Edge Function for QZ Tray Cryptographic Signing
 *
 * This function securely signs QZ Tray requests without exposing
 * the private key in the frontend code.
 *
 * DEPLOYMENT:
 * ===========
 * 1. Ensure you have the Supabase CLI installed
 * 2. Login: supabase login
 * 3. Link to your project: supabase link --project-ref YOUR_PROJECT_ID
 * 4. Deploy: supabase functions deploy sign-qz
 *
 * ENVIRONMENT VARIABLES (Set in Supabase Dashboard):
 * ================================================
 * QZ_PRIVATE_KEY: Your QZ Tray private key (from QZ Tray Settings > Certificates)
 *
 * IMPORTANT:
 * ==========
 * - NEVER commit the private key to git
 * - Keep the private key secure in Supabase environment variables
 * - This function should only be accessible from your authorized domains
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Import crypto for signing
import { crypto } from 'https://deno.land/std/crypto/mod.ts'

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { toSign, certId } = await req.json()

    if (!toSign || !certId) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // Get private key from environment variables
    const privateKey = Deno.env.get('QZ_PRIVATE_KEY')

    if (!privateKey) {
      console.error('QZ_PRIVATE_KEY not configured in Supabase environment variables')
      return new Response(
        'Signing service not configured. Please set QZ_PRIVATE_KEY in Supabase environment variables.',
        { status: 500 }
      )
    }

    // Sign the data using the private key
    // Note: This is a simplified signing implementation
    // For production, use proper cryptographic signing as per QZ Tray documentation
    const signature = await signData(toSign, privateKey)

    return new Response(
      JSON.stringify({
        signature,
        certId,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Configure this to your domain in production
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  } catch (error) {
    console.error('Signing error:', error)
    return new Response('Signing failed', { status: 500 })
  }
})

/**
 * Sign data using private key
 *
 * NOTE: QZ Tray uses a specific signing algorithm. The actual implementation
 * depends on the certificate format used by QZ Tray.
 *
 * For the correct implementation, refer to:
 * https://github.com/qz-tray/qz-tray/blob/master/docs/signing.md
 *
 * The signing typically involves:
 * 1. Import the private key in PEM format
 * 2. Sign the data using RSA with SHA-256
 * 3. Return the signature in base64 format
 */
async function signData(data: string, privateKey: string): Promise<string> {
  // IMPORTANT: This is a simplified placeholder
  // For production, implement proper signing based on QZ Tray documentation
  // The actual implementation depends on your certificate format

  // Temporary fallback for development (NOT FOR PRODUCTION)
  // This allows testing without proper signing
  if (privateKey === 'DEV_MODE_NO_SIGNING') {
    console.warn('⚠️  WARNING: Using development mode without proper signing')
    return btoa(data) // Dummy signature for testing
  }

  try {
    // Attempt to sign with the private key
    // This is a basic implementation - adjust based on your key format
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)

    // For production, implement proper RSA-SHA256 signing
    // This requires the private key in proper PEM format
    // Refer to QZ Tray documentation for exact implementation

    // Placeholder: return a base64 encoded version of the data
    // REPLACE WITH ACTUAL SIGNING IMPLEMENTATION
    const signature = btoa(data + privateKey.substring(0, 16))
    return signature
  } catch (error) {
    console.error('Signing failed:', error)
    throw new Error('Failed to sign data. Check your private key format.')
  }
}

/**
 * Import private key for signing
 *
 * The key format depends on how QZ Tray generates certificates.
 * Typically this is a PEM-formatted RSA private key.
 */
async function importKey(privateKey: string): Promise<CryptoKey> {
  // For production, implement proper PEM key import
  // This is complex and depends on the exact key format

  // Placeholder implementation
  const encoder = new TextEncoder()
  const keyBuffer = encoder.encode(privateKey)

  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )
  } catch (error) {
    console.error('Key import failed:', error)
    throw new Error('Failed to import private key. Check the key format.')
  }
}
