'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/db'
import { User, Order, OrderItem } from '@/types'
import { Bell, LogOut, CheckCircle, ChefHat, Clock } from 'lucide-react'
import NotificationSystem from '@/components/NotificationSystem'
import { WebUSBPrinter } from '@/lib/webusb-printer'

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
  const [selectedFilter, setSelectedFilter] = useState<string>('ready')
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null)
  const [servedOrderId, setServedOrderId] = useState<string | null>(null)

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
      
      // Filter orders: show recent orders (last 1 hour) OR active orders (not served)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const filteredOrders = (data || []).filter((order: Order) => {
        const isRecent = new Date(order.created_at) > oneHourAgo
        const isActive = order.status !== 'served'
        return isRecent || isActive
      })
      
      // Remove duplicate orders by ID
      const uniqueOrders = filteredOrders.filter((order: Order, index: number, self: Order[]) => 
        index === self.findIndex((o: Order) => o.id === order.id)
      )
      
      // Sort orders by created_at (newest first)
      const sortedOrders = uniqueOrders.sort((a: Order, b: Order) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setOrders(sortedOrders)
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


  // Thermal Print Function for Kitchen Bill using WebUSB direct printing
  const handleThermalPrint = async () => {
    if (!selectedOrderForBill) return
    
    try {
      console.log('Starting thermal print for kitchen order...')
      
      // Generate ESC/POS commands for direct printing
      let escposContent = ''
      
      // Initialize printer
      escposContent += '\x1B\x40' // Initialize
      
      // Center alignment
      escposContent += '\x1B\x61\x01'
      
      // Table Number - Large and Bold
      escposContent += '\x1B\x21\x30' // Double width and height
      escposContent += `TABLE ${selectedOrderForBill.tables?.table_number}\n`
      escposContent += '\x1B\x21\x00' // Normal
      escposContent += '=============================\n\n'
      
      // Kitchen Order - Bold and Centered
      escposContent += '\x1B\x21\x08' // Bold
      escposContent += 'KITCHEN ORDER\n'
      escposContent += '\x1B\x21\x00' // Normal
      escposContent += '--------------------------\n\n'
      
      // Order Info - Left aligned
      escposContent += '\x1B\x61\x00' // Left align
      escposContent += `Order: ${formatOrderId(selectedOrderForBill.id)}\n`
      escposContent += `Date: ${new Date(selectedOrderForBill.created_at).toLocaleDateString()}\n`
      escposContent += `Time: ${new Date(selectedOrderForBill.created_at).toLocaleTimeString()}\n`
      escposContent += `Waiter: ${selectedOrderForBill.users?.name}\n`
      escposContent += '--------------------------\n\n'
      
      // Items Header
      escposContent += '\x1B\x21\x08' // Bold
      escposContent += '  ITEM                  QTY  TYPE\n'
      escposContent += '--------------------------\n'
      escposContent += '\x1B\x21\x00' // Normal font for items
      
      // Items
      selectedOrderForBill.order_items?.forEach((item: any) => {
        const name = item.dishes?.name || 'Unknown'
        const qty = item.quantity
        const dishType = item.dish_type || '-'
        const itemName = name.length > 14 ? name.substring(0, 13) + '.' : name
        escposContent += `${itemName.padEnd(14)} ${qty.toString().padStart(2)} ${dishType.padEnd(4)}\n`
      })
      escposContent += '\x1B\x21\x00' // Ensure normal text
      
      escposContent += '--------------------------\n'
      
      // Status
      escposContent += `Status: ${selectedOrderForBill.status.toUpperCase()}\n`
      
      escposContent += '\n\n'
      
      // Footer - Centered
      escposContent += '\x1b\x61\x01' // Center align
      escposContent += '=============================\n'
      escposContent += 'Developed by onethynk\n'
      escposContent += '=============================\n'
      escposContent += '\n \n'
      
      // Cut paper
      escposContent += '\x1D\x56\x00' // Partial cut
      
      console.log('ESC/POS content generated')
      
      // Use WebUSB for direct printing (no Chrome dialog)
      const printer = new WebUSBPrinter()
      await printer.connect()
      await printer.print(escposContent)
      await printer.disconnect()
      
      console.log('Kitchen order printed successfully via WebUSB')
      alert('Kitchen order printed successfully!')
      
    } catch (error: any) {
      console.error('Error printing kitchen order:', error)
      
      // Provide specific error messages
      if (error.name === 'NotFoundError') {
        alert('Printer not found. Please ensure the printer is connected via USB and powered on.')
      } else if (error.name === 'SecurityError') {
        alert('Permission denied. Please allow USB device access when prompted.')
      } else if (error.name === 'NotAllowedError') {
        alert('User cancelled the device selection. Please try again and select the printer.')
      } else {
        alert(`Failed to print kitchen order: ${error.message || 'Unknown error'}. Please ensure printer is connected via USB and you are using Chrome/Edge browser.`)
      }
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      console.log('Updating order:', orderId, 'to status:', newStatus)
      
      // Play notification sound
      playNotificationSound(newStatus)
      
      // Set served order for animation
      if (newStatus === 'served') {
        setServedOrderId(orderId)
      }
      
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
      
      // Clear served order after animation
      if (newStatus === 'served') {
        setTimeout(() => setServedOrderId(null), 2000)
      }
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
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'preparing':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'served':
        return 'bg-green-800 text-white border-green-900'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Notification sound function
  const playNotificationSound = (status: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (status === 'served') {
        // Success sound - higher pitch
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } else {
        // Default notification sound
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.2)
      }
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed')
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')
  const servedOrders = orders.filter(o => o.status === 'served')
  
  // Sort orders: pending first, then preparing, then ready, then served
  const filteredOrders = [...orders].sort((a, b) => {
    const statusOrder = { 'pending': 0, 'confirmed': 0, 'preparing': 1, 'ready': 2, 'served': 3 }
    const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 4
    const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 4
    if (statusA !== statusB) return statusA - statusB
    // If same status, sort by time (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-green-50">
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-green-700">
                 Kitchen Display
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
        {/* Stats Bar - All Order Statuses */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-3">
              <Clock className="w-10 h-10" />
              <div>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
                <p className="text-xs font-semibold opacity-90">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-green-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-3">
              <ChefHat className="w-10 h-10" />
              <div>
                <p className="text-2xl font-bold">{preparingOrders.length}</p>
                <p className="text-xs font-semibold opacity-90">Preparing</p>
              </div>
            </div>
          </div>
          <div className="bg-green-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-10 h-10" />
              <div>
                <p className="text-2xl font-bold">{readyOrders.length}</p>
                <p className="text-xs font-semibold opacity-90">Ready</p>
              </div>
            </div>
          </div>
          <div className="bg-green-800 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-10 h-10" />
              <div>
                <p className="text-2xl font-bold">{servedOrders.length}</p>
                <p className="text-xs font-semibold opacity-90">Served</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Grid - All Orders */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            All Orders ({filteredOrders.length})
          </h2>
          {filteredOrders.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  servedOrderId={servedOrderId}
                  onStatusChange={(status) => updateOrderStatus(order.id, status)}
                  onItemStatusChange={updateItemStatus}
                  getStatusColor={getStatusColor}
                  onViewBill={setSelectedOrderForBill}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <CheckCircle className="w-20 h-20 text-green-300 mx-auto mb-6" />
              <p className="text-gray-500 text-xl font-semibold">No orders</p>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="fixed bottom-8 right-8">
          <button
            onClick={fetchOrders}
            className="bg-green-600 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Kitchen Bill Modal */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-700">
                Kitchen Order Bill
              </h2>
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-green-300 rounded-xl p-6 bg-white shadow-lg">
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-green-300">
                <p className="text-sm font-bold text-green-700 mt-3 border-t border-dashed border-green-300 pt-2">KITCHEN ORDER</p>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-200">
                <div>
                  <p className="text-sm font-semibold text-green-800">Order No</p>
                  <p className="text-lg font-bold text-green-900">{formatOrderId(selectedOrderForBill.id)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Date</p>
                  <p className="text-lg font-bold text-green-900">{new Date(selectedOrderForBill.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Table</p>
                  <p className="text-lg font-bold text-green-900">Table {selectedOrderForBill.tables?.table_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Waiter</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBill.users?.name}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-500 to-emerald-500">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase w-1/2">Item</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white uppercase w-16">Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white uppercase w-24">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-100">
                    {selectedOrderForBill.order_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-900 truncate">{item.dishes?.name}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">{item.dish_type || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-200">
                <div>
                  <p className="text-sm font-semibold text-green-800">Customer</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBill.customer_name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Status</p>
                  <p className="text-lg font-bold text-green-900 capitalize">{selectedOrderForBill.status}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className="flex-1 px-6 py-3 border-2 border-green-300 text-green-700 rounded-xl font-semibold hover:bg-green-50 transition-all duration-300"
              >
                Close
              </button>
              <button
                onClick={handleThermalPrint}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-800 transition-all duration-300"
              >
                Print Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, servedOrderId, onStatusChange, onItemStatusChange, getStatusColor, onViewBill }: {
  order: Order
  servedOrderId: string | null
  onStatusChange: (status: string) => void
  onItemStatusChange: (itemId: string, status: string) => void
  getStatusColor: (status: string) => string
  onViewBill: (order: Order) => void
}) {
  const isServed = servedOrderId === order.id
  
  // Calculate time elapsed
  const timeElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000) // minutes
  const timeDisplay = timeElapsed < 1 ? 'Just now' : timeElapsed < 60 ? `${timeElapsed}m ago` : `${Math.floor(timeElapsed / 60)}h ago`
  
  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 hover:shadow-xl transition-all duration-300 ${isServed ? 'animate-pulse bg-green-100 border-green-500' : 'border-gray-200'}`}>
      <div className={`p-5 border-b-2 ${getStatusColor(order.status)}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-gray-900 mb-1 truncate">Table {order.tables?.table_number}</h3>
            <p className="text-sm opacity-75 mb-1 truncate">{timeDisplay}</p>
            <p className="text-xs opacity-60 truncate">Order #{formatOrderId(order.id)}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
            <button
              onClick={() => onViewBill(order)}
              className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              View Bill
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <div className="space-y-3">
          {order.order_items?.map((item: OrderItem) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-green-300 transition-colors">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="font-bold text-gray-900 text-xl shrink-0">{item.quantity}x</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-800 truncate">
                      {item.dishes?.name || item.dish?.name || `Dish ID: ${item.dish_id}`}
                    </span>
                    {item.dish_type && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full shrink-0">
                        {item.dish_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap bg-green-100 text-green-800`}>
                  {item.status}
                </span>
                <button
                  onClick={() => {
                    const nextStatus = item.status === 'pending' ? 'preparing' : 
                                     item.status === 'preparing' ? 'ready' : 'ready'
                    onItemStatusChange(item.id, nextStatus)
                  }}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-800 transition-colors whitespace-nowrap"
                >
                  {item.status === 'pending' ? 'Start' : item.status === 'preparing' ? 'Complete' : 'Done'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{order.order_items?.length} items</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-gray-500 truncate">Waiter: {order.users?.name}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {order.status === 'ready' && (
              <button
                onClick={() => onStatusChange('served')}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition-colors"
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
