'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Bell, CheckCircle, XCircle, Clock, AlertCircle, Plus, Edit, Trash2, Key } from 'lucide-react'

interface Waiter {
  id: string
  name: string
  email: string
  is_available: boolean
  last_active: string
  active_orders: number
  phone?: string
}

export default function WaiterStatus() {
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null)
  const [waiterForm, setWaiterForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    is_available: true
  })

  useEffect(() => {
    fetchWaiters()
    fetchNotifications()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('waiters-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchWaiters()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchWaiters = async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'waiter')
        .order('name')

      if (users) {
        const waitersWithStats = await Promise.all(
          users.map(async (waiter) => {
            const { data: orders } = await supabase
              .from('orders')
              .select('*')
              .eq('waiter_id', waiter.id)
              .in('status', ['pending', 'preparing', 'ready'])

            return {
              ...waiter,
              is_available: waiter.is_available ?? true,
              last_active: waiter.last_active ?? new Date().toISOString(),
              active_orders: orders?.length || 0
            }
          })
        )
        setWaiters(waitersWithStats)
      }
    } catch (error) {
      console.error('Error fetching waiters:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const toggleWaiterAvailability = async (waiterId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('users')
        .update({ is_available: !currentStatus })
        .eq('id', waiterId)

      fetchWaiters()
    } catch (error) {
      console.error('Error updating waiter status:', error)
      alert('Failed to update waiter status')
    }
  }

  const handleAddWaiter = () => {
    setEditingWaiter(null)
    setWaiterForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      is_available: true
    })
    setShowWaiterModal(true)
  }

  const handleEditWaiter = (waiter: Waiter) => {
    setEditingWaiter(waiter)
    setWaiterForm({
      name: waiter.name,
      email: waiter.email,
      password: '',
      phone: waiter.phone || '',
      is_available: waiter.is_available
    })
    setShowWaiterModal(true)
  }

  const handleDeleteWaiter = async (waiterId: string) => {
    if (!confirm('Are you sure you want to delete this waiter? This action cannot be undone.')) return

    try {
      const { error } = await supabase.from('users').delete().eq('id', waiterId)
      if (error) throw error
      fetchWaiters()
    } catch (error) {
      console.error('Error deleting waiter:', error)
      alert('Failed to delete waiter')
    }
  }

  const handleSaveWaiter = async () => {
    try {
      if (!waiterForm.name || !waiterForm.email) {
        alert('Please fill in all required fields')
        return
      }

      if (editingWaiter) {
        // Update existing waiter
        const updateData: any = {
          name: waiterForm.name,
          email: waiterForm.email,
          phone: waiterForm.phone,
          is_available: waiterForm.is_available
        }

        // Only update password if provided
        if (waiterForm.password) {
          updateData.password = waiterForm.password
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingWaiter.id)

        if (error) throw error
      } else {
        // Create new waiter
        if (!waiterForm.password) {
          alert('Password is required for new waiters')
          return
        }

        const { error } = await supabase.from('users').insert({
          name: waiterForm.name,
          email: waiterForm.email,
          password: waiterForm.password,
          phone: waiterForm.phone,
          role: 'waiter',
          is_available: waiterForm.is_available
        })

        if (error) throw error
      }

      setShowWaiterModal(false)
      fetchWaiters()
    } catch (error) {
      console.error('Error saving waiter:', error)
      alert('Failed to save waiter. Email might already be in use.')
    }
  }

  const handleResetPassword = async (waiterId: string) => {
    const newPassword = prompt('Enter new password for this waiter:')
    if (!newPassword) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', waiterId)

      if (error) throw error
      alert('Password reset successfully')
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    }
  }

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return `${Math.floor(diffMins / 1440)} days ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-semibold text-gray-600">Loading waiter status...</div>
      </div>
    )
  }

  const availableWaiters = waiters.filter(w => w.is_available).length
  const totalWaiters = waiters.length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Available Waiters</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {availableWaiters}/{totalWaiters}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Active Orders</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {waiters.reduce((sum, w) => sum + w.active_orders, 0)}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Notifications</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {notifications.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Waiter Management
            </h3>
            <button
              onClick={handleAddWaiter}
              className="flex items-center bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Waiter
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {waiters.map((waiter) => (
              <div key={waiter.id} className="p-4 hover:bg-orange-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      waiter.is_available ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}>
                      {waiter.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{waiter.name}</p>
                      <p className="text-sm text-gray-600">{waiter.email}</p>
                      {waiter.phone && <p className="text-xs text-gray-500">{waiter.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{waiter.active_orders} active</p>
                      <p className="text-xs text-gray-500">{formatLastActive(waiter.last_active)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPassword(waiter.id)}
                        className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all duration-300"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditWaiter(waiter)}
                        className="p-2 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-all duration-300"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWaiter(waiter.id)}
                        className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleWaiterAvailability(waiter.id, waiter.is_available)}
                        className={`p-2 rounded-full transition-all duration-300 ${
                          waiter.is_available
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title={waiter.is_available ? 'Mark Unavailable' : 'Mark Available'}
                      >
                        {waiter.is_available ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {waiters.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No waiters found. Click "Add Waiter" to create one.
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Notifications
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 hover:bg-orange-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    notification.type === 'alert' ? 'bg-red-100' :
                    notification.type === 'warning' ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    {notification.type === 'alert' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : notification.type === 'warning' ? (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <Bell className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{notification.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No notifications
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Waiter Modal */}
      {showWaiterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {editingWaiter ? 'Edit Waiter' : 'Add New Waiter'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={waiterForm.name}
                  onChange={(e) => setWaiterForm({ ...waiterForm, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter waiter name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={waiterForm.email}
                  onChange={(e) => setWaiterForm({ ...waiterForm, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password {editingWaiter ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={waiterForm.password}
                  onChange={(e) => setWaiterForm({ ...waiterForm, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder={editingWaiter ? 'Enter new password' : 'Enter password'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={waiterForm.phone}
                  onChange={(e) => setWaiterForm({ ...waiterForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter phone number (optional)"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={waiterForm.is_available}
                  onChange={(e) => setWaiterForm({ ...waiterForm, is_available: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="is_available" className="text-sm font-semibold text-gray-700">Available for duty</label>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowWaiterModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWaiter}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {editingWaiter ? 'Update' : 'Add Waiter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
