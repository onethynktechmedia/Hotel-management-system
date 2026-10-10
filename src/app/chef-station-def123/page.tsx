'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/db'
import { Order, OrderItem, Dish, Table, User } from '@/types'
import { LogOut, Printer, CheckCircle, Clock, ChefHat, UtensilsCrossed, AlertCircle, History } from 'lucide-react'
import { playClickSound, playSuccessSound, playPrintSound, playNotificationSound } from '@/lib/sound-effects'
import GoogleTranslate from '@/components/GoogleTranslate'

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
      <div className="w-5 h-5 flex items-center justify-center border-2 border-emerald-600 bg-emerald-50 rounded-sm">
        <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>
      </div>
    )
  } else if (foodType === 'nonveg') {
    return (
      <div className="w-5 h-5 flex items-center justify-center border-2 border-rose-600 bg-rose-50 rounded-sm">
        <div className="w-2.5 h-2.5 bg-rose-600 rounded-full"></div>
      </div>
    )
  } else if (foodType === 'custom' || foodType === 'parcel') {
    return (
      <div className="w-5 h-5 flex items-center justify-center border-2 border-violet-600 bg-violet-50 rounded-sm">
        <span className="text-xs font-bold text-violet-600">C</span>
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'served' | 'preparing'>('all')
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

  const handleCompleteKOT = async (orderId: string, foodType: string) => {
    try {
      // Update only items of the specified food type to 'served'
      const items = orderItems[orderId] || []
      for (const item of items) {
        const dish = dishes.find(d => d.id === item.dish_id)
        const itemFoodType = dish?.food_type

        if (
          (foodType === 'veg' && itemFoodType === 'veg') ||
          (foodType === 'nonveg' && itemFoodType === 'nonveg') ||
          (foodType === 'other' && itemFoodType !== 'veg' && itemFoodType !== 'nonveg')
        ) {
          await fetch(`/api/order-items/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'served' })
          })
        }
      }

      // Check if all items in the order are now served
      const allItemsServed = items.every(item => item.status === 'served')

      // If all items are served, update order status
      if (allItemsServed) {
        await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'served' })
        })
      }

      playSuccessSound()
      fetchData()
    } catch (error) {
      console.error('Error completing KOT:', error)
      alert('Failed to complete KOT')
    }
  }

  const handlePrintKOT = async (order: Order, foodType: string) => {
    playClickSound()
    playPrintSound()

    const items = orderItems[order.id] || []
    const table = tables.find(t => t.id === order.table_id)

    // Group items by dish_id to combine quantities
    const groupedItems = items.reduce((acc: any[], item) => {
      const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        acc.push({
          ...item,
          quantity: item.quantity
        })
      }
      return acc
    }, [])

    // Filter grouped items by food type
    const filteredItems = groupedItems.filter(item => {
      const dish = dishes.find(d => d.id === item.dish_id)
      if (foodType === 'veg') return dish?.food_type === 'veg'
      if (foodType === 'nonveg') return dish?.food_type === 'nonveg'
      return dish?.food_type !== 'veg' && dish?.food_type !== 'nonveg'
    })

    // Build items text - table format with ITEM, QTY, TYPE columns for 58mm
    let itemsText = ''
    // Header row
    itemsText += `<div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 2px; margin-bottom: 4px;">
      <span style="flex: 1;">ITEM</span>
      <span style="width: 25px; text-align: center;">QTY</span>
      <span style="width: 50px; text-align: right;">TYPE</span>
    </div>`

    filteredItems.forEach(item => {
      const dish = dishes.find(d => d.id === item.dish_id)
      const name = dish?.marathi_name || dish?.name || 'Unknown'
      const qty = item.quantity
      const type = item.dish_type || 'Normal'
      const dishName = name.length > 18 ? name.substring(0, 17) + '.' : name
      itemsText += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="flex: 1;">${dishName}</span>
        <span style="width: 25px; text-align: center;">${qty}</span>
        <span style="width: 50px; text-align: right;">${type}</span>
      </div>`
    })

    // Get table display - for master tables, show only master table number
    const tableNumber = table?.table_number || 'N/A'

    const billContent = `
<div style="font-size: 24px; font-weight: 900; text-align: center; margin-bottom: 8px;">TABLE ${tableNumber}</div>
<div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 4px;">---------------------</div>
<div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 4px;">${foodType === 'veg' ? 'VEG' : foodType === 'nonveg' ? 'NON-VEG' : 'OTHER'} KOT</div>
<div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 8px;">---------------------</div>
<div style="font-size: 12px; margin-bottom: 2px;">Time: ${formatTime(order.created_at)}</div>
<div style="font-size: 12px; margin-bottom: 2px;">Waiter: ${order.users?.name || 'N/A'}</div>
<div style="text-align: center; font-size: 16px; font-weight: bold; margin: 8px 0;">---------------------</div>
${itemsText}
<div style="text-align: center; font-size: 16px; font-weight: bold; margin-top: 8px;">---------------------</div>
${order.order_description ? `<div style="font-size: 12px; font-weight: bold; margin-top: 4px; border: 1px solid #000; padding: 4px; background: #f0f0f0;">NOTE: ${order.order_description}</div>` : ''}
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
                padding: 5px;
                margin: 0;
                text-align: left;
                background: white;
                line-height: 1.3;
              }
              .kot-content {
                text-align: left;
                display: inline-block;
                font-weight: bold;
                margin: 0 auto;
                line-height: 1.4;
              }
              @media print {
                body {
                  padding: 3px;
                  margin: 0;
                }
                .kot-content {
                  font-size: 11px;
                }
                div[style*="font-size: 20px"] {
                  font-size: 18px !important;
                }
                @page {
                  margin: 3mm;
                  size: 58mm auto;
                }
              }
            </style>
          </head>
          <body>
            <div class="kot-content">${billContent}</div>
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
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'served':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') return order.status === 'pending' || order.status === 'confirmed'
    if (filterStatus === 'served') return order.status === 'served'
    if (filterStatus === 'preparing') return order.status === 'preparing'
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
    <div className="min-h-screen bg-[#F5F0E8] pb-24 overflow-x-hidden">
      {/* Header */}
      <nav className="bg-[#8B4513] shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-[#F5F0E8] p-2 rounded-xl shadow-md">
                <ChefHat className="w-6 h-6 text-[#8B4513]" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-white leading-tight">Dhole Patil</h1>
                <p className="text-xs text-[#F5F0E8] leading-tight font-medium">Khanawal - Chef Station</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GoogleTranslate variant="brown" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-[#F5F0E8] text-[#8B4513] px-3 py-2 rounded-xl font-semibold hover:bg-[#E8DFD0] transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Orders Grid - Split by Food Type */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-xl border border-[#E8DFD0]">
            <div className="bg-[#F5F0E8] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-10 h-10 text-[#8B4513]" />
            </div>
            <p className="text-[#8B4513] font-semibold text-lg">No orders found</p>
            <p className="text-slate-400 text-sm mt-1">Select a different filter to view orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredOrders.map((order) => {
              const items = orderItems[order.id] || []
              const table = tables.find(t => t.id === order.table_id)

              // Group items by dish_id to combine quantities
              const groupedItems = items.reduce((acc: any[], item) => {
                const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
                if (existing) {
                  existing.quantity += item.quantity
                  existing.itemIds.push(item.id)
                } else {
                  acc.push({
                    ...item,
                    quantity: item.quantity,
                    itemIds: [item.id]
                  })
                }
                return acc
              }, [])

              // Separate grouped items by food type
              const vegItems = groupedItems.filter(item => {
                const dish = dishes.find(d => d.id === item.dish_id)
                return dish?.food_type === 'veg'
              })
              const nonVegItems = groupedItems.filter(item => {
                const dish = dishes.find(d => d.id === item.dish_id)
                return dish?.food_type === 'nonveg'
              })
              const otherItems = groupedItems.filter(item => {
                const dish = dishes.find(d => d.id === item.dish_id)
                return dish?.food_type !== 'veg' && dish?.food_type !== 'nonveg'
              })

              // Create separate KOT cards for each food type
              const kotCards = []

              if (vegItems.length > 0) {
                kotCards.push({
                  type: 'veg',
                  bgColor: 'bg-white',
                  borderColor: 'border-[#8B4513]',
                  items: vegItems,
                  label: 'VEG'
                })
              }

              if (nonVegItems.length > 0) {
                kotCards.push({
                  type: 'nonveg',
                  bgColor: 'bg-white',
                  borderColor: 'border-[#8B4513]',
                  items: nonVegItems,
                  label: 'NON-VEG'
                })
              }

              if (otherItems.length > 0) {
                kotCards.push({
                  type: 'other',
                  bgColor: 'bg-white',
                  borderColor: 'border-[#8B4513]',
                  items: otherItems,
                  label: 'OTHER'
                })
              }

              return kotCards.map((kot, kotIndex) => {
                const allItemsServed = kot.items.every(item =>
                  item.itemIds.every((itemId: string) => {
                    const originalItem = items.find(i => i.id === itemId)
                    return originalItem?.status === 'served'
                  })
                )
                const endTime = allItemsServed ? formatTime(order.updated_at || order.created_at) : null

                return (
                  <div key={`${order.id}-${kot.type}`} className={`${kot.bgColor} rounded-2xl shadow-lg overflow-hidden border ${kot.borderColor} transition-all hover:shadow-xl`}>
                    {/* Order Header */}
                    <div className="p-4">
                      {/* Table Number - Centered */}
                      <div className="text-center mb-2">
                        <p className="text-4xl font-black text-[#8B4513] tracking-tight">
                          Table {table?.table_number || 'N/A'}
                        </p>
                      </div>

                      {/* Order Number - Centered */}
                      <div className="text-center mb-1.5">
                        <p className="text-sm font-bold text-[#8B4513] bg-white/60 inline-block px-3 py-0.5 rounded-full">
                          #{formatOrderId(order.id)}
                        </p>
                      </div>

                      {/* KOT Type - Centered */}
                      <div className="text-center mb-3">
                        <span className={`inline-block px-3 py-0.5 rounded-full text-sm font-bold ${
                          kot.type === 'veg' ? 'bg-[#4CAF50] text-white' :
                          kot.type === 'nonveg' ? 'bg-[#F44336] text-white' :
                          'bg-[#9C27B0] text-white'
                        }`}>
                          {kot.label} KOT
                        </span>
                      </div>

                      {/* Start Time and Waiter - Same Line */}
                      <div className="flex justify-between items-center text-sm text-[#8B4513] bg-white/60 rounded-lg px-3 py-1.5 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#8B4513]" />
                          <span className="font-medium">{formatTime(order.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ChefHat className="w-4 h-4 text-[#8B4513]" />
                          <span className="font-medium truncate max-w-24">{order.users?.name || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Order Type */}
                      {order.order_type && (
                        <div className="flex justify-center items-center text-xs text-[#8B4513] bg-white/60 rounded-lg px-3 py-1 mb-2">
                          <span className="font-semibold px-2 py-0.5 bg-[#8B4513] text-white rounded text-xs">
                            {order.order_type}
                          </span>
                        </div>
                      )}

                      {/* Special Instructions */}
                      {order.order_description && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                          <p className="text-xs font-semibold text-amber-800">
                            Note: {order.order_description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Order Items - List Style */}
                    <div className="px-4 pb-4">
                      <div className="bg-[#F5F0E8] rounded-xl p-3 shadow-sm border border-[#E8DFD0]">
                        {kot.items.map((item) => {
                          const dish = dishes.find(d => d.id === item.dish_id)
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-2 border-b border-[#E8DFD0] last:border-0 last:pb-0"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-[#8B4513] text-sm">
                                    {dish?.marathi_name || dish?.name || 'Unknown Dish'}
                                  </p>
                                  <span className="text-xs px-2 py-0.5 bg-[#E8DFD0] text-[#8B4513] rounded-full font-medium whitespace-nowrap">
                                    {item.dish_type || 'Normal'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                                  item.status === 'served'
                                    ? 'bg-[#E8F5E9] text-[#4CAF50] border-[#81C784]'
                                    : item.status === 'pending'
                                    ? 'bg-[#FFF3E0] text-[#FF9800] border-[#FFB74D]'
                                    : 'bg-[#E3F2FD] text-[#2196F3] border-[#90CAF9]'
                                }`}>
                                  {item.status === 'served' ? 'Served' : item.status}
                                </span>
                                <span className="bg-[#8B4513] text-white text-xs px-2 py-0.5 rounded font-bold">
                                  x{item.quantity}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 pb-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintKOT(order, kot.type)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-[#E8DFD0] text-[#8B4513] px-3 py-2 rounded-lg font-semibold hover:bg-[#F5F0E8] transition-all shadow-sm text-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                        {allItemsServed ? (
                          <button
                            className="flex-1 px-3 py-2 bg-[#E8DFD0] text-[#8B4513] rounded-lg font-semibold cursor-not-allowed text-sm"
                            disabled
                          >
                            Served
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCompleteKOT(order.id, kot.type)}
                            className="flex-1 px-3 py-2 bg-[#8B4513] text-white rounded-lg font-semibold hover:bg-[#6B3410] transition-all shadow-md text-sm"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8DFD0] shadow-2xl z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-start items-center py-2 overflow-x-auto gap-2 whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => { playClickSound(); setFilterStatus('pending') }}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all min-w-[70px] ${
                filterStatus === 'pending'
                  ? 'bg-[#8B4513] text-white'
                  : 'text-[#8B4513] hover:bg-[#F5F0E8]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">Pending</span>
              <span className="text-xs font-bold">
                {orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length}
              </span>
            </button>
            <button
              onClick={() => { playClickSound(); setFilterStatus('all') }}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all min-w-[70px] ${
                filterStatus === 'all'
                  ? 'bg-[#8B4513] text-white'
                  : 'text-[#8B4513] hover:bg-[#F5F0E8]'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-xs font-semibold">All Orders</span>
              <span className="text-xs font-bold">{orders.length}</span>
            </button>
            <button
              onClick={() => { playClickSound(); setFilterStatus('served') }}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all min-w-[70px] ${
                filterStatus === 'served'
                  ? 'bg-[#8B4513] text-white'
                  : 'text-[#8B4513] hover:bg-[#F5F0E8]'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">Served</span>
              <span className="text-xs font-bold">
                {orders.filter(o => o.status === 'served').length}
              </span>
            </button>
            <button
              onClick={() => { playClickSound(); setFilterStatus('preparing') }}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all min-w-[70px] ${
                filterStatus === 'preparing'
                  ? 'bg-[#8B4513] text-white'
                  : 'text-[#8B4513] hover:bg-[#F5F0E8]'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span className="text-xs font-semibold">Preparing</span>
              <span className="text-xs font-bold">
                {orders.filter(o => o.status === 'preparing').length}
              </span>
            </button>
            <button
              onClick={() => { playClickSound(); fetchData() }}
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all text-[#8B4513] hover:bg-[#F5F0E8] min-w-[70px]"
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
