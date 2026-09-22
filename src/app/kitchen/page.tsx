'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/db'
import { User, Order, OrderItem } from '@/types'
import { Bell, LogOut, CheckCircle, Clock, ChefHat, AlertCircle, Printer } from 'lucide-react'
import NotificationSystem from '@/components/NotificationSystem'
import { printWithFallback, WebUSBPrinter } from '@/lib/webusb-printer'

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
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null)
  const [printerConnected, setPrinterConnected] = useState(false)

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

  // Connect USB Printer
  const handleConnectPrinter = async () => {
    try {
      const printer = new WebUSBPrinter()
      await printer.connect()
      setPrinterConnected(true)
      alert('Printer connected successfully! You can now print kitchen orders directly.')
    } catch (error: any) {
      console.error('Failed to connect printer:', error)
      alert('Failed to connect printer: ' + error.message + '\n\nPlease:\n1. Connect printer via USB\n2. Use Chrome or Edge browser\n3. Allow USB access when prompted')
    }
  }

  // Thermal Print Function for Kitchen Bill using WebUSB with fallback
  const handleThermalPrint = async () => {
    if (!selectedOrderForBill) return
    
    try {
      console.log('Starting thermal print for kitchen order...')
      
      // Generate HTML table-based content for proper alignment
      const plainText = `
<div class="header">TABLE ${selectedOrderForBill.tables?.table_number}</div>
<div class="divider">================================</div>
<div class="section-title">KITCHEN ORDER</div>
<div class="divider">--------------------------------</div>
<div class="bill-info"><span class="label">Order:</span> <span class="value">${formatOrderId(selectedOrderForBill.id)}</span></div>
<div class="bill-info"><span class="label">Date:</span> <span class="value">${new Date(selectedOrderForBill.created_at).toLocaleDateString()}</span></div>
<div class="bill-info"><span class="label">Time:</span> <span class="value">${new Date(selectedOrderForBill.created_at).toLocaleTimeString()}</span></div>
<div class="bill-info"><span class="label">Waiter:</span> <span class="value">${selectedOrderForBill.users?.name}</span></div>
<div class="divider">--------------------------------</div>
<table class="items-table">
  <thead>
    <tr>
      <th class="col-item">ITEM</th>
      <th class="col-qty">QTY</th>
      <th class="col-type">TYPE</th>
    </tr>
  </thead>
  <tbody>
${selectedOrderForBill.order_items?.map((item: any) => {
  const name = item.dishes?.name || 'Unknown'
  const qty = item.quantity
  const dishType = item.dish_type || '-'
  const displayName = name.length > 18 ? name.substring(0, 17) + '.' : name
  return `    <tr>
      <td class="col-item">${displayName}</td>
      <td class="col-qty">${qty}</td>
      <td class="col-type">${dishType}</td>
    </tr>`
}).join('')}
  </tbody>
</table>
<div class="divider">--------------------------------</div>
<div class="bill-info"><span class="label">Status:</span> <span class="value">${selectedOrderForBill.status.toUpperCase()}</span></div>
<div class="divider">================================</div>
<div class="developer">Developed by onethynk</div>
<div class="divider">================================</div>
`
      
      console.log('Bill content generated')
      
      // Use browser print directly
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Kitchen Order Print</title>
              <meta charset="UTF-8">
              <style>
                @page {
                  size: 58mm auto;
                  margin: 0;
                }
                @media print {
                  @page {
                    size: 58mm auto;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 2mm;
                    width: 58mm;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
                * {
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Courier New', 'Consolas', 'Lucida Console', monospace;
                  font-size: 12px;
                  font-weight: bold;
                  line-height: 1.3;
                  margin: 0;
                  padding: 2mm;
                  text-align: center;
                  width: 54mm;
                  max-width: 54mm;
                  overflow: hidden;
                  background: white;
                  color: black;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
                  image-rendering: crisp-edges;
                }
                .header {
                  font-size: 18px;
                  font-weight: 900;
                  margin-bottom: 1mm;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                .divider {
                  font-size: 10px;
                  font-weight: bold;
                  margin: 1mm 0;
                  letter-spacing: 1px;
                }
                .section-title {
                  font-size: 13px;
                  font-weight: 900;
                  margin: 1mm 0;
                }
                .bill-info {
                  display: flex;
                  justify-content: space-between;
                  font-size: 11px;
                  font-weight: bold;
                  margin: 0.5mm 0;
                }
                .label {
                  font-weight: bold;
                }
                .value {
                  font-weight: bold;
                }
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1mm 0;
                  font-size: 11px;
                }
                .items-table th {
                  border-bottom: 1px solid black;
                  padding: 1mm 0;
                  font-weight: 900;
                  font-size: 11px;
                }
                .items-table td {
                  padding: 0.5mm 0;
                  font-weight: bold;
                }
                .col-item {
                  text-align: left;
                  width: 50%;
                  padding-right: 2mm;
                }
                .col-qty {
                  text-align: center;
                  width: 20%;
                }
                .col-type {
                  text-align: center;
                  width: 30%;
                }
                .developer {
                  font-size: 9px;
                  font-weight: bold;
                  margin-top: 2mm;
                  opacity: 0.8;
                }
              </style>
            </head>
            <body>${plainText}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        
        setTimeout(() => {
          printWindow.print()
          setTimeout(() => {
            printWindow.close()
          }, 1000)
        }, 750)
      } else {
        alert('Please allow popups for printing')
      }
      
      alert('Kitchen order sent to printer successfully!')
      
    } catch (error) {
      console.error('Error printing kitchen order:', error)
      alert('Failed to print kitchen order. Check console for details.')
    }
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

  // Filter orders based on selected filter
  const filteredOrders = selectedFilter === 'all' 
    ? orders 
    : selectedFilter === 'completed'    
      ? completedOrders
      : selectedFilter === 'pending'
        ? pendingOrders
        : selectedFilter === 'preparing'
          ? preparingOrders
          : readyOrders

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
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div 
            onClick={() => setSelectedFilter(selectedFilter === 'pending' ? 'all' : 'pending')}
            className={`bg-white border-2 rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer ${selectedFilter === 'pending' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-6 h-6 text-orange-500 mr-2 shrink-0" />
              <span className="text-2xl font-bold text-gray-800">{pendingOrders.length}</span>
            </div>
            <p className="text-xs font-bold text-gray-600">Pending</p>
          </div>
          <div 
            onClick={() => setSelectedFilter(selectedFilter === 'preparing' ? 'all' : 'preparing')}
            className={`bg-white border-2 rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer ${selectedFilter === 'preparing' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-center mb-2">
              <ChefHat className="w-6 h-6 text-blue-500 mr-2 shrink-0" />
              <span className="text-2xl font-bold text-gray-800">{preparingOrders.length}</span>
            </div>
            <p className="text-xs font-bold text-gray-600">Preparing</p>
          </div>
          <div 
            onClick={() => setSelectedFilter(selectedFilter === 'ready' ? 'all' : 'ready')}
            className={`bg-white border-2 rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer ${selectedFilter === 'ready' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-purple-500 mr-2 shrink-0" />
              <span className="text-2xl font-bold text-gray-800">{readyOrders.length}</span>
            </div>
            <p className="text-xs font-bold text-gray-600">Ready</p>
          </div>
          <div 
            onClick={() => setSelectedFilter(selectedFilter === 'completed' ? 'all' : 'completed')}
            className={`bg-white border-2 rounded-2xl p-4 text-center shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer ${selectedFilter === 'completed' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2 shrink-0" />
              <span className="text-2xl font-bold text-gray-800">{completedOrders.length}</span>
            </div>
            <p className="text-xs font-bold text-gray-600">Completed</p>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={fetchOrders}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            Refresh Orders
          </button>
          {selectedFilter !== 'all' && (
            <button
              onClick={() => setSelectedFilter('all')}
              className="bg-white border-2 border-green-500 text-green-700 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-all duration-300"
            >
              Show All Orders
            </button>
          )}
        </div>

        {/* Orders Grid */}
        <div className="space-y-8">
          {/* Show filtered orders or all orders */}
          {selectedFilter !== 'all' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                {selectedFilter === 'completed' && <CheckCircle className="w-6 h-6 text-green-600 mr-3" />}
                {selectedFilter === 'pending' && <AlertCircle className="w-6 h-6 text-emerald-600 mr-3" />}
                {selectedFilter === 'preparing' && <ChefHat className="w-6 h-6 text-teal-600 mr-3" />}
                {selectedFilter === 'ready' && <CheckCircle className="w-6 h-6 text-lime-600 mr-3" />}
                {selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Orders ({filteredOrders.length})
              </h2>
              {filteredOrders.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={(status) => updateOrderStatus(order.id, status)}
                      onItemStatusChange={updateItemStatus}
                      getStatusColor={getStatusColor}
                      onViewBill={setSelectedOrderForBill}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <ChefHat className="w-20 h-20 text-green-300 mx-auto mb-6" />
                  <p className="text-gray-500 text-xl font-semibold">No {selectedFilter} orders to display</p>
                </div>
              )}
            </div>
          )}

          {/* Show all orders when no filter is selected */}
          {selectedFilter === 'all' && (
            <>
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
                        onViewBill={setSelectedOrderForBill}
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
                        onViewBill={setSelectedOrderForBill}
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
                        onViewBill={setSelectedOrderForBill}
                      />
                    ))}
                  </div>
                </div>
              )}

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
                        onViewBill={setSelectedOrderForBill}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {orders.length === 0 && (
            <div className="text-center py-16">
              <ChefHat className="w-20 h-20 text-green-300 mx-auto mb-6" />
              <p className="text-gray-500 text-xl font-semibold">No orders to display</p>
            </div>
          )}
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
                onClick={handleConnectPrinter}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {printerConnected ? 'Printer Connected' : 'Connect Printer'}
              </button>
              <button
                onClick={handleThermalPrint}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
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

function OrderCard({ order, onStatusChange, onItemStatusChange, getStatusColor, onViewBill }: {
  order: Order
  onStatusChange: (status: string) => void
  onItemStatusChange: (itemId: string, status: string) => void
  getStatusColor: (status: string) => string
  onViewBill: (order: Order) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300">
      <div className={`p-5 border-b-2 ${getStatusColor(order.status)}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-gray-900 mb-1 truncate">Table {order.tables?.table_number}</h3>
            <p className="text-sm opacity-75 mb-1 truncate">{new Date(order.created_at).toLocaleTimeString()}</p>
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
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
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
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700 transition-colors whitespace-nowrap"
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
