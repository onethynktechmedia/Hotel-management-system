'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/db'
import { Order, OrderItem, Dish, Table, User } from '@/types'
import { LogOut, Printer, CheckCircle, Clock, ChefHat, Utensils, AlertCircle } from 'lucide-react'
import { playClickSound, playSuccessSound, playPrintSound, playNotificationSound } from '@/lib/sound-effects'

// Utility function to format order ID as DPK-XXX
const formatOrderId = (orderId: string) => {
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1
  return `DPK-${String(orderNumber).padStart(3, '0')}`
}

// Format time
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// Get food type icon
const getFoodTypeIcon = (foodType?: string) => {
  if (foodType === 'veg') {
    return (
      <div className="w-5 h-5 flex items-center justify-center border-2 border-green-600 bg-green-50 rounded-sm">
        <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>
      </div>
    )
  } else if (foodType === 'nonveg') {
    return (
      <div className="w-5 h-5 flex items-center justify-center border-2 border-red-600 bg-red-50 rounded-sm">
        <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
      </div>
    )
  } else if (foodType === 'custom' || foodType === 'parcel') {
    return (
      <div className="w-5 h-5 flex items-center justify-center border-2 border-blue-600 bg-blue-50 rounded-sm">
        <span className="text-xs font-bold text-blue-600">C</span>
      </div>
    )
  }
  return null
}

export default function ChefStation() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<{[key: string]: OrderItem[]}>({})
  const [dishes, setDishes] = useState<Dish[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'served'>('all')
  const [previousOrderCount, setPreviousOrderCount] = useState(0)

  useEffect(() => {
    // Check for session cookie
    const sessionCookie = document.cookie.includes('hotel_session=')
    const userRoleCookie = document.cookie.includes('hotel_role=')

    if (!sessionCookie || !userRoleCookie) {
      router.push('/dpk')
      return
    }

    // Get user role from cookie
    const roleMatch = document.cookie.match(/hotel_role=([^;]+)/)
    const userRole = roleMatch ? decodeURIComponent(roleMatch[1]) : null

    // Allow kitchen, admin, or waiter to access chef station for testing
    if (!['kitchen', 'admin', 'waiter'].includes(userRole || '')) {
      router.push('/dpk')
      return
    }

    // Get user ID and name from cookie
    const userIdMatch = document.cookie.match(/hotel_user_id=([^;]+)/)
    const userId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : null
    const userName = localStorage.getItem('user_name') || 'Chef'

    setUser({
      id: userId || '',
      email: '',
      role: (userRole as 'kitchen' | 'admin' | 'waiter') || 'kitchen',
      name: userName,
      created_at: new Date().toISOString()
    })

    fetchData()

    // Set up real-time subscription for orders
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (_payload: any) => {
        fetchData()
      })
      .subscribe()

    // Set up real-time subscription for order items
    const itemsSubscription = supabase
      .channel('order_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (_payload: any) => {
        fetchData()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      itemsSubscription.unsubscribe()
    }
  }, [router])

  const fetchData = async () => {
    try {
      const [ordersRes, dishesRes, tablesRes] = await Promise.all([
        fetch('/api/orders').then(res => res.json()),
        fetch('/api/dishes').then(res => res.json()),
        fetch('/api/tables').then(res => res.json())
      ])

      // Filter orders to only include those with status not completed/paid
      const activeOrders = ordersRes.filter((order: Order) => 
        !['completed', 'paid'].includes(order.status)
      )

      // Play notification sound if new orders detected
      if (activeOrders.length > previousOrderCount && previousOrderCount > 0) {
        playNotificationSound('order')
      }
      setPreviousOrderCount(activeOrders.length)

      setOrders(activeOrders)
      setDishes(dishesRes)
      setTables(tablesRes)

      // Fetch order items for each order
      const itemsMap: {[key: string]: OrderItem[]} = {}
      for (const order of activeOrders) {
        try {
          const itemsRes = await fetch(`/api/orders/${order.id}/items`)
          if (itemsRes.ok) {
            const items = await itemsRes.json()
            itemsMap[order.id] = items
          }
        } catch (error) {
          console.error(`Error fetching items for order ${order.id}:`, error)
        }
      }
      setOrderItems(itemsMap)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    playClickSound()
    document.cookie = 'hotel_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    localStorage.clear()
    router.push('/dpk')
  }

  const handleUpdateItemStatus = async (itemId: string, newStatus: string) => {
    setUpdating(itemId)
    try {
      const response = await fetch(`/api/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update item status')

      playSuccessSound()
      fetchData()
    } catch (error) {
      console.error('Error updating item status:', error)
      alert('Failed to update item status')
    } finally {
      setUpdating(null)
    }
  }

  const handleCompleteOrder = async (orderId: string) => {
    try {
      // Update all items in the order to 'served'
      const items = orderItems[orderId] || []
      for (const item of items) {
        await fetch(`/api/order-items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'served' })
        })
      }

      // Update order status to 'served'
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'served' })
      })

      playSuccessSound()
      fetchData()
    } catch (error) {
      console.error('Error completing order:', error)
      alert('Failed to complete order')
    }
  }

  const handlePrintKOT = async (order: Order) => {
    playClickSound()
    playPrintSound()

    const items = orderItems[order.id] || []
    const table = tables.find(t => t.id === order.table_id)

    // Separate items by food type
    const vegItems = items.filter(item => {
      const dish = dishes.find(d => d.id === item.dish_id)
      return dish?.food_type === 'veg'
    })
    const nonVegItems = items.filter(item => {
      const dish = dishes.find(d => d.id === item.dish_id)
      return dish?.food_type === 'nonveg'
    })
    const otherItems = items.filter(item => {
      const dish = dishes.find(d => d.id === item.dish_id)
      return dish?.food_type !== 'veg' && dish?.food_type !== 'nonveg'
    })

    let itemsText = ''
    if (vegItems.length > 0) {
      itemsText += '--------------------------------\n'
      itemsText += 'VEG ITEMS:\n'
      itemsText += '--------------------------------\n'
      vegItems.forEach(item => {
        const dish = dishes.find(d => d.id === item.dish_id)
        const name = dish?.name || 'Unknown'
        const qty = item.quantity
        const paddedName = name.length > 18 ? name.substring(0, 17) + '.' : name
        itemsText += `${paddedName.padEnd(18)} x${qty.toString().padStart(2)}\n`
      })
    }
    if (nonVegItems.length > 0) {
      itemsText += '--------------------------------\n'
      itemsText += 'NON-VEG ITEMS:\n'
      itemsText += '--------------------------------\n'
      nonVegItems.forEach(item => {
        const dish = dishes.find(d => d.id === item.dish_id)
        const name = dish?.name || 'Unknown'
        const qty = item.quantity
        const paddedName = name.length > 18 ? name.substring(0, 17) + '.' : name
        itemsText += `${paddedName.padEnd(18)} x${qty.toString().padStart(2)}\n`
      })
    }
    if (otherItems.length > 0) {
      itemsText += '--------------------------------\n'
      itemsText += 'OTHER ITEMS:\n'
      itemsText += '--------------------------------\n'
      otherItems.forEach(item => {
        const dish = dishes.find(d => d.id === item.dish_id)
        const name = dish?.name || 'Unknown'
        const qty = item.quantity
        const paddedName = name.length > 18 ? name.substring(0, 17) + '.' : name
        itemsText += `${paddedName.padEnd(18)} x${qty.toString().padStart(2)}\n`
      })
    }

    const billContent = `
================================
      DHOLE PATIL KHANAWAL
        RESTAURANT & BAR
================================
           KOT
================================
Order ID: ${formatOrderId(order.id)}
Date: ${new Date(order.created_at).toLocaleDateString()}
Time: ${formatTime(order.created_at)}
Table: ${table?.table_number || 'N/A'}
Waiter: ${order.users?.name || 'N/A'}
--------------------------------
${itemsText}
================================
Developed by onethynk techmedia
================================
      `

    // Create a new window to print
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>KOT - Table ${table?.table_number}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                padding: 10px;
                margin: 0;
                text-align: center;
                background: white;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                text-align: center;
                display: inline-block;
                font-weight: bold;
              }
              @media print {
                body {
                  padding: 0;
                }
                pre {
                  font-size: 10px;
                }
              }
            </style>
          </head>
          <body>
            <pre>${billContent}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[#F5F5DC] border-[#8B4513] text-[#8B4513]'
      case 'served':
        return 'bg-white border-2 border-[#8B4513] text-[#8B4513]'
      default:
        return 'bg-[#F5F5DC] border-[#8B4513] text-[#8B4513]'
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') return order.status === 'pending' || order.status === 'confirmed'
    if (filterStatus === 'served') return order.status === 'served'
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-900">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-[#8B4513] p-2 rounded-xl">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Chef Station</h1>
                <p className="text-sm text-gray-600">Kitchen Order Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { playClickSound(); fetchData() }}
                className="flex items-center gap-2 bg-[#8B4513] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#8B4513] transition-all"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-[#8B4513] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#8B4513] transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div
            onClick={() => { playClickSound(); setFilterStatus('all') }}
            className={`bg-white border-2 rounded-xl p-4 shadow-lg cursor-pointer transition-all ${
              filterStatus === 'all' ? 'border-[#8B4513] bg-[#F5F5DC]' : 'border-[#8B4513] hover:bg-[#F5F5DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-[#8B4513]">{orders.length}</p>
              </div>
              <div className="bg-[#F5F5DC] p-3 rounded-xl">
                <Utensils className="w-6 h-6 text-[#8B4513]" />
              </div>
            </div>
          </div>
          <div
            onClick={() => { playClickSound(); setFilterStatus('pending') }}
            className={`bg-white border-2 rounded-xl p-4 shadow-lg cursor-pointer transition-all ${
              filterStatus === 'pending' ? 'border-[#8B4513] bg-[#F5F5DC]' : 'border-[#8B4513] hover:bg-[#F5F5DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-[#8B4513]">{orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length}</p>
              </div>
              <div className="bg-[#F5F5DC] p-3 rounded-xl">
                <Clock className="w-6 h-6 text-[#8B4513]" />
              </div>
            </div>
          </div>
          <div
            onClick={() => { playClickSound(); setFilterStatus('served') }}
            className={`bg-white border-2 rounded-xl p-4 shadow-lg cursor-pointer transition-all ${
              filterStatus === 'served' ? 'border-[#8B4513] bg-[#F5F5DC]' : 'border-[#8B4513] hover:bg-[#F5F5DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-[#8B4513]">{orders.filter(o => o.status === 'served').length}</p>
              </div>
              <div className="bg-[#F5F5DC] p-3 rounded-xl">
                <CheckCircle className="w-6 h-6 text-[#8B4513]" />
              </div>
            </div>
          </div>
          <div
            onClick={() => { playClickSound(); setFilterStatus('served') }}
            className={`bg-white border-2 rounded-xl p-4 shadow-lg cursor-pointer transition-all ${
              filterStatus === 'served' ? 'border-[#8B4513] bg-[#F5F5DC]' : 'border-[#8B4513] hover:bg-[#F5F5DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Served</p>
                <p className="text-2xl font-bold text-[#8B4513]">{orders.filter(o => o.status === 'served').length}</p>
              </div>
              <div className="bg-[#F5F5DC] p-3 rounded-xl">
                <AlertCircle className="w-6 h-6 text-[#8B4513]" />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No orders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const items = orderItems[order.id] || []
              const table = tables.find(t => t.id === order.table_id)

              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-[#8B4513] text-white p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-bold">Order #{formatOrderId(order.id)}</h3>
                        <p className="text-xl font-bold">Table {table?.table_number || 'N/A'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'served' ? 'bg-white border-2 border-[#8B4513] text-[#8B4513]' :
                        'bg-[#F5F5DC] text-[#8B4513]'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm opacity-90">
                      <span>{formatTime(order.created_at)}</span>
                      <span>Waiter: {order.users?.name || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Order Items - Separated by Veg/Non-Veg */}
                  <div className="p-4 space-y-4">
                    {/* Veg Items */}
                    {items.filter(item => {
                      const dish = dishes.find(d => d.id === item.dish_id)
                      return dish?.food_type === 'veg'
                    }).length > 0 && (
                      <div className="border-2 border-green-600 rounded-lg overflow-hidden">
                        <div className="bg-green-600 text-white px-3 py-2 font-bold text-sm">
                          VEG ITEMS
                        </div>
                        <div className="p-3 space-y-2">
                          {items.filter(item => {
                            const dish = dishes.find(d => d.id === item.dish_id)
                            return dish?.food_type === 'veg'
                          }).map((item) => {
                            const dish = dishes.find(d => d.id === item.dish_id)
                            return (
                              <div
                                key={item.id}
                                className={`p-2 rounded border ${getItemStatusColor(item.status)} transition-all`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {getFoodTypeIcon(dish?.food_type)}
                                      <span className="font-semibold text-[#5D3A1A]">
                                        {dish?.name || 'Unknown Dish'}
                                      </span>
                                      <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                        x{item.quantity}
                                      </span>
                                    </div>
                                    {item.dish_type && item.dish_type !== 'Normal' && (
                                      <span className="text-xs text-gray-600 mt-1 block">
                                        {item.dish_type}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                      item.status === 'served'
                                        ? 'bg-white border-2 border-green-600 text-green-600'
                                        : 'bg-green-50 border-green-600 text-green-600'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Non-Veg Items */}
                    {items.filter(item => {
                      const dish = dishes.find(d => d.id === item.dish_id)
                      return dish?.food_type === 'nonveg'
                    }).length > 0 && (
                      <div className="border-2 border-red-600 rounded-lg overflow-hidden">
                        <div className="bg-red-600 text-white px-3 py-2 font-bold text-sm">
                          NON-VEG ITEMS
                        </div>
                        <div className="p-3 space-y-2">
                          {items.filter(item => {
                            const dish = dishes.find(d => d.id === item.dish_id)
                            return dish?.food_type === 'nonveg'
                          }).map((item) => {
                            const dish = dishes.find(d => d.id === item.dish_id)
                            return (
                              <div
                                key={item.id}
                                className={`p-2 rounded border ${getItemStatusColor(item.status)} transition-all`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {getFoodTypeIcon(dish?.food_type)}
                                      <span className="font-semibold text-[#5D3A1A]">
                                        {dish?.name || 'Unknown Dish'}
                                      </span>
                                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                                        x{item.quantity}
                                      </span>
                                    </div>
                                    {item.dish_type && item.dish_type !== 'Normal' && (
                                      <span className="text-xs text-gray-600 mt-1 block">
                                        {item.dish_type}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                      item.status === 'served'
                                        ? 'bg-white border-2 border-red-600 text-red-600'
                                        : 'bg-red-50 border-red-600 text-red-600'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Other Items (custom/parcel) */}
                    {items.filter(item => {
                      const dish = dishes.find(d => d.id === item.dish_id)
                      return dish?.food_type !== 'veg' && dish?.food_type !== 'nonveg'
                    }).length > 0 && (
                      <div className="border-2 border-blue-600 rounded-lg overflow-hidden">
                        <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm">
                          OTHER ITEMS
                        </div>
                        <div className="p-3 space-y-2">
                          {items.filter(item => {
                            const dish = dishes.find(d => d.id === item.dish_id)
                            return dish?.food_type !== 'veg' && dish?.food_type !== 'nonveg'
                          }).map((item) => {
                            const dish = dishes.find(d => d.id === item.dish_id)
                            return (
                              <div
                                key={item.id}
                                className={`p-2 rounded border ${getItemStatusColor(item.status)} transition-all`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {getFoodTypeIcon(dish?.food_type)}
                                      <span className="font-semibold text-[#5D3A1A]">
                                        {dish?.name || 'Unknown Dish'}
                                      </span>
                                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                        x{item.quantity}
                                      </span>
                                    </div>
                                    {item.dish_type && item.dish_type !== 'Normal' && (
                                      <span className="text-xs text-gray-600 mt-1 block">
                                        {item.dish_type}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                      item.status === 'served'
                                        ? 'bg-white border-2 border-blue-600 text-blue-600'
                                        : 'bg-blue-50 border-blue-600 text-blue-600'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Footer */}
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-700">Total Amount</span>
                      <span className="text-xl font-bold text-[#5D3A1A]">₹{order.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePrintKOT(order)}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#8B4513] text-white py-2 rounded-xl font-semibold hover:bg-[#5D3A13] transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        Print KOT
                      </button>
                      {order.status !== 'served' && (
                        <button
                          onClick={() => handleCompleteOrder(order.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-[#8B4513] text-white py-2 rounded-xl font-semibold hover:bg-[#5D3A13] transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
