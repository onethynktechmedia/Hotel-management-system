'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User, Order, OrderItem } from '@/types'
import { Bell, LogOut, CheckCircle, Clock, ChefHat, AlertCircle } from 'lucide-react'
import NotificationSystem from '@/components/NotificationSystem'

// Utility function to format order ID as GGR-XXX
const formatOrderId = (orderId: string) => {
  // Extract a number from the UUID and format it
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1 // Ensure it's between 1-999
  return `GGR-${String(orderNumber).padStart(3, '0')}`
}

export default function KitchenPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'kitchen') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    fetchOrders()
    
    // Set up real-time subscription for order updates
    const subscription = supabase
      .channel('kitchen_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        fetchOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders via API...')
      const response = await fetch('/api/orders?status=pending,confirmed,preparing,ready,served')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Fetched orders:', data)
      console.log('Number of orders:', data?.length || 0)
      
      // Log order items to check if dish data is present
      data?.forEach((order: Order) => {
        console.log(`Order ${order.id} items:`, order.order_items)
        order.order_items?.forEach((item: OrderItem) => {
          console.log(`Item ${item.id}: dish_id=${item.dish_id}, dish=`, item.dish)
        })
      })
      
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      console.error('Error string:', String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      console.log('Updating order:', orderId, 'to status:', newStatus)
      
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('Order updated successfully')
      fetchOrders()
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Failed to update order status. Check console for details.')
    }
  }

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', itemId)

      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Failed to update item status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'preparing':
        return 'bg-teal-100 text-teal-800 border-teal-300'
      case 'ready':
        return 'bg-lime-100 text-lime-800 border-lime-300'
      case 'served':
        return 'bg-green-200 text-green-900 border-green-400'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const completedOrders = orders.filter(o => o.status === 'served')
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed')
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                🍽️ Kitchen Display
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && <NotificationSystem userId={user.id} userRole={user.role} />}
              <span className="text-gray-700 font-semibold hidden sm:block">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-green-600 mr-2" />
              <span className="text-3xl font-bold text-gray-800">{completedOrders.length}</span>
            </div>
            <p className="text-sm font-bold text-gray-600">Completed</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-center mb-3">
              <Clock className="w-7 h-7 text-orange-500 mr-2" />
              <span className="text-3xl font-bold text-gray-800">{pendingOrders.length}</span>
            </div>
            <p className="text-sm font-bold text-gray-600">Pending</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-center mb-3">
              <ChefHat className="w-7 h-7 text-blue-500 mr-2" />
              <span className="text-3xl font-bold text-gray-800">{preparingOrders.length}</span>
            </div>
            <p className="text-sm font-bold text-gray-600">Preparing</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-purple-500 mr-2" />
              <span className="text-3xl font-bold text-gray-800">{readyOrders.length}</span>
            </div>
            <p className="text-sm font-bold text-gray-600">Ready</p>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-8">
          <button
            onClick={fetchOrders}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            Refresh Orders
          </button>
        </div>

        {/* Orders Grid */}
        <div className="space-y-8">
          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                Completed Orders ({completedOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={(status) => updateOrderStatus(order.id, status)}
                    onItemStatusChange={updateItemStatus}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                <AlertCircle className="w-6 h-6 text-emerald-600 mr-3" />
                Pending Orders ({pendingOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={(status) => updateOrderStatus(order.id, status)}
                    onItemStatusChange={updateItemStatus}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preparing Orders */}
          {preparingOrders.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                <ChefHat className="w-6 h-6 text-teal-600 mr-3" />
                Preparing Orders ({preparingOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {preparingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={(status) => updateOrderStatus(order.id, status)}
                    onItemStatusChange={updateItemStatus}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ready Orders */}
          {readyOrders.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                <CheckCircle className="w-6 h-6 text-lime-600 mr-3" />
                Ready to Serve ({readyOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {readyOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={(status) => updateOrderStatus(order.id, status)}
                    onItemStatusChange={updateItemStatus}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}

          {orders.length === 0 && (
            <div className="text-center py-16">
              <ChefHat className="w-20 h-20 text-green-300 mx-auto mb-6" />
              <p className="text-gray-500 text-xl font-semibold">No orders to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order, onStatusChange, onItemStatusChange, getStatusColor }: {
  order: Order
  onStatusChange: (status: string) => void
  onItemStatusChange: (itemId: string, status: string) => void
  getStatusColor: (status: string) => string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300">
      <div className={`p-5 border-b-2 ${getStatusColor(order.status)}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-xl text-gray-900 mb-1">Table {order.tables?.table_number}</h3>
            <p className="text-sm opacity-75 mb-1">{new Date(order.created_at).toLocaleTimeString()}</p>
            <p className="text-xs opacity-60">Order #{formatOrderId(order.id)}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <div className="space-y-3">
          {order.order_items?.map((item: OrderItem) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-green-300 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <span className="font-bold text-gray-900 text-xl">{item.quantity}x</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">
                      {item.dishes?.name || item.dish?.name || `Dish ID: ${item.dish_id}`}
                    </span>
                    {item.dish_type && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        {item.dish_type}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.status === 'ready' ? 'bg-lime-100 text-lime-800' :
                  item.status === 'preparing' ? 'bg-teal-100 text-teal-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.status}
                </span>
                <button
                  onClick={() => {
                    const nextStatus = item.status === 'pending' ? 'preparing' : 
                                     item.status === 'preparing' ? 'ready' : 'ready'
                    onItemStatusChange(item.id, nextStatus)
                  }}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  {item.status === 'pending' ? 'Start' : item.status === 'preparing' ? 'Complete' : 'Done'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="font-bold text-gray-900 text-xl">Total: ₹{order.total_amount.toFixed(2)}</span>
              <p className="text-sm text-gray-500">{order.order_items?.length} items</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-500">Waiter: {order.users?.name}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {order.status === 'pending' || order.status === 'confirmed' ? (
              <button
                onClick={() => onStatusChange('preparing')}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
              >
                Start Preparing
              </button>
            ) : order.status === 'preparing' ? (
              <button
                onClick={() => onStatusChange('ready')}
                className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors"
              >
                Mark Ready
              </button>
            ) : (
              <button
                onClick={() => onStatusChange('served')}
                className="flex-1 bg-lime-600 text-white py-3 rounded-xl font-bold hover:bg-lime-700 transition-colors"
              >
                Mark Served
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
