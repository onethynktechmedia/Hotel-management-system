'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User, Order, OrderItem } from '@/types'
import { Bell, LogOut, Check, Clock, ChefHat, AlertCircle } from 'lucide-react'
import NotificationSystem from '@/components/NotificationSystem'

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
      const response = await fetch('/api/orders?status=pending,confirmed,preparing,ready')
      
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'preparing':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed')
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-6 h-6 text-yellow-600 mr-2" />
              <span className="text-2xl font-bold text-yellow-800">{pendingOrders.length}</span>
            </div>
            <p className="text-sm font-bold text-yellow-700">Pending</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center mb-2">
              <ChefHat className="w-6 h-6 text-orange-600 mr-2" />
              <span className="text-2xl font-bold text-orange-800">{preparingOrders.length}</span>
            </div>
            <p className="text-sm font-bold text-orange-700">Preparing</p>
          </div>
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center mb-2">
              <Check className="w-6 h-6 text-green-600 mr-2" />
              <span className="text-2xl font-bold text-green-800">{readyOrders.length}</span>
            </div>
            <p className="text-sm font-bold text-green-700">Ready</p>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-6">
          <button
            onClick={fetchOrders}
            className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            🔄 Refresh Orders
          </button>
        </div>

        {/* Orders Grid */}
        <div className="space-y-6">
          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                Pending Orders ({pendingOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <ChefHat className="w-5 h-5 text-orange-600 mr-2" />
                Preparing Orders ({preparingOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                Ready to Serve ({readyOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="text-center py-12">
              <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No orders to display</p>
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
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className={`p-4 border-b ${getStatusColor(order.status)}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Table {order.tables?.table_number}</h3>
            <p className="text-sm opacity-75">{new Date(order.created_at).toLocaleTimeString()}</p>
            <p className="text-xs opacity-60 mt-1">Order #{order.id.slice(0, 8)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-3">
          {order.order_items?.map((item: OrderItem) => (
            <div key={item.id} className="flex justify-between items-start p-3 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-3 flex-1">
                {item.dish?.image_url && (
                  <img 
                    src={item.dish.image_url} 
                    alt={item.dish.name}
                    className="w-16 h-16 rounded-xl object-cover shadow-md"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="font-bold text-gray-900 text-lg">{item.quantity}x</span>
                    <span className="ml-2 font-semibold text-gray-800">
                      {item.dish?.name || `Dish ID: ${item.dish_id}`}
                    </span>
                  </div>
                  {item.dish?.description && (
                    <p className="text-sm text-gray-600 italic">{item.dish.description}</p>
                  )}
                  {item.dish?.category && (
                    <span className="inline-block mt-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                      {item.dish.category}
                    </span>
                  )}
                  {item.special_instructions && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-bold text-orange-700">📝 Special: {item.special_instructions}</p>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">Price: ₹{item.price.toFixed(2)}</span>
                    <span className="text-sm font-bold text-gray-900">Total: ₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  item.status === 'ready' ? 'bg-green-100 text-green-800' :
                  item.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status}
                </span>
                <button
                  onClick={() => {
                    const nextStatus = item.status === 'pending' ? 'preparing' : 
                                     item.status === 'preparing' ? 'ready' : 'ready'
                    onItemStatusChange(item.id, nextStatus)
                  }}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
                >
                  {item.status === 'pending' ? 'Start' : item.status === 'preparing' ? 'Complete' : 'Done'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t-2 border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="font-bold text-gray-900 text-lg">Total: ₹{order.total_amount.toFixed(2)}</span>
              <p className="text-sm text-gray-500">{order.order_items?.length} items</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-500">Waiter: {order.users?.name}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {order.status === 'pending' || order.status === 'confirmed' ? (
              <button
                onClick={() => onStatusChange('preparing')}
                className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Start Preparing
              </button>
            ) : order.status === 'preparing' ? (
              <button
                onClick={() => onStatusChange('ready')}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Mark Ready
              </button>
            ) : (
              <button
                onClick={() => onStatusChange('served')}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
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
