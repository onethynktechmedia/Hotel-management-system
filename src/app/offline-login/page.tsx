'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Wifi, WifiOff, ArrowRight } from 'lucide-react'
import { playClickSound, playSuccessSound, playErrorSound } from '@/lib/sound-effects'

export default function OfflineLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check if user is already logged in
    const sessionToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('hotel_session='))
      ?.split('=')[1]

    if (sessionToken) {
      // User is already logged in, redirect to appropriate dashboard
      const role = document.cookie
        .split('; ')
        .find(row => row.startsWith('hotel_role='))
        ?.split('=')[1] || 'admin'

      let dashboardUrl = '/secure-dashboard-xyz789'
      if (role === 'waiter') dashboardUrl = '/staff-portal-abc456'
      else if (role === 'kitchen') dashboardUrl = '/chef-station-def123'
      else if (role === 'offline-admin') dashboardUrl = '/backup-control-ghi789'

      router.push(dashboardUrl)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const handleOfflineLogin = (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()
    setLoading(true)
    setError('')

    try {
      // For offline mode, use a simplified authentication
      // In production, this should verify against local SQLite database
      const localUsers = [
        { email: 'admin@hotel.com', password: 'admin123', name: 'Admin', role: 'admin' },
        { email: 'waiter@hotel.com', password: 'waiter123', name: 'Waiter', role: 'waiter' },
        { email: 'kitchen@hotel.com', password: 'kitchen123', name: 'Kitchen', role: 'kitchen' }
      ]

      const user = localUsers.find(u => u.email === email && u.password === password)

      if (!user) {
        playErrorSound()
        setError('Invalid credentials')
        setLoading(false)
        return
      }

      // Store user in localStorage for offline mode
      localStorage.setItem('offline_user', JSON.stringify(user))
      
      playSuccessSound()
      
      // Redirect based on role
      switch (user.role) {
        case 'admin':
          router.push('/offline-admin')
          break
        case 'waiter':
          router.push('/staff-portal-abc456')
          break
        case 'kitchen':
          router.push('/chef-station-def123')
          break
        default:
          router.push('/offline-admin')
      }
    } catch (error) {
      playErrorSound()
      setError('Login failed. Please try again.')
      setLoading(false)
    }
  }

  const handleOnlineLogin = () => {
    playClickSound()
    router.push('/auth-portal-xyz789')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Online/Offline Toggle */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white rounded-full p-1 shadow-lg">
            <button
              onClick={handleOnlineLogin}
              className={`px-6 py-2 rounded-full flex items-center gap-2 transition-all ${
                isOnline ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Wifi size={18} />
              Online
            </button>
            <button
              className={`px-6 py-2 rounded-full flex items-center gap-2 transition-all ${
                !isOnline ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <WifiOff size={18} />
              Offline
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-200">
          <div className="text-center mb-8">
            <div className="mb-4">
              <img src="/logo.png" alt="Dhole Patil Hotel Logo" className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-amber-200" />
            </div>
            <h1 className="text-3xl font-bold text-amber-900 mb-1">
              Dhole Patil
            </h1>
            <p className="text-xl font-semibold text-amber-800 mb-2">Khanawal</p>
            <p className="text-gray-600">Offline Mode Login</p>
            <p className="text-sm text-gray-500 mt-1">Access the system without internet</p>
          </div>

          <form onSubmit={handleOfflineLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Default credentials: admin@hotel.com / admin123
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Offline Mode:</strong> All data is stored locally on your device. 
            When you reconnect to the internet, you can sync your data with the cloud.
          </p>
        </div>
      </div>
    </div>
  )
}
