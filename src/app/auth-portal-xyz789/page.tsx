'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User } from '@/types'
import { playClickSound, playSuccessSound, playErrorSound } from '@/lib/sound-effects'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        playErrorSound()
        setError(data.error || 'Invalid credentials')
        return
      }

      // Set secure cookies for session management
      document.cookie = `hotel_session=${data.session_token || data.user.id}; path=/; secure; samesite=strict; max-age=86400`
      document.cookie = `hotel_role=${data.user.role}; path=/; secure; samesite=strict; max-age=86400`
      document.cookie = `hotel_user_id=${data.user.id}; path=/; secure; samesite=strict; max-age=86400`
      
      // Store minimal user data in localStorage for UI (non-sensitive)
      localStorage.setItem('user_name', data.user.name || '')
      localStorage.setItem('user_role', data.user.role || '')
      
      playSuccessSound()

      // Redirect based on role to secure routes
      switch (data.user.role) {
        case 'admin':
          router.push('/admin')
          break
        case 'waiter':
          router.push('/staff-portal-abc456')
          break
        case 'kitchen':
          router.push('/chef-station-def123')
          break
        case 'offline-admin':
          router.push('/backup-control-ghi789')
          break
        default:
          setError('Invalid role')
      }
    } catch (error) {
      playErrorSound()
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-2 border-[#5D3A1A]">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src="/logo.png" alt="Dhole Patil Hotel Logo" className="w-24 h-24 mx-auto rounded-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-[#5D3A1A] mb-2">
            Dhole Patil Khanawal
          </h1>
          <p className="text-gray-600">Staff Login</p>
          <p className="text-sm text-gray-500 mt-1">Enter your credentials to access the system</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#8B4513] rounded-xl focus:ring-2 focus:ring-[#5D3A1A] focus:border-[#5D3A1A] transition-all duration-300 outline-none"
              placeholder="admin@hotel.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#8B4513] rounded-xl focus:ring-2 focus:ring-[#5D3A1A] focus:border-[#5D3A1A] transition-all duration-300 outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5D3A1A] text-white py-3 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[#8B4513] hover:text-[#A0522D] text-sm font-semibold transition-colors">
            ← Back to Home
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 text-center mb-3">Default credentials:</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">Admin:</span>
              <span className="font-mono text-gray-800 text-xs">admin@hotel.com / admin123</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">Waiter:</span>
              <span className="font-mono text-gray-800 text-xs">waiter@hotel.com / waiter123</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">Kitchen:</span>
              <span className="font-mono text-gray-800 text-xs">kitchen@hotel.com / kitchen123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
