'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function VerifyPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. No token provided.')
      return
    }

    verifyPasswordChange()
  }, [token])

  const verifyPasswordChange = async () => {
    try {
      // First check if token is valid
      const checkResponse = await fetch(`/api/password-change?token=${token}`)
      const checkData = await checkResponse.json()

      if (!checkData.valid) {
        setStatus('error')
        setMessage(checkData.error || 'Invalid or expired verification link.')
        return
      }

      // Confirm the password change
      const response = await fetch('/api/password-change', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage('Your password has been successfully changed. You can now log in with your new password.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to verify password change.')
      }
    } catch (error) {
      console.error('Error verifying password change:', error)
      setStatus('error')
      setMessage('An error occurred while verifying your password change. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Password Change</h2>
            <p className="text-gray-600">Please wait while we verify your password change request...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Changed Successfully!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/dpk')}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-300"
            >
              Go to Login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/dpk')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-all duration-300"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <VerifyPasswordContent />
    </Suspense>
  )
}
