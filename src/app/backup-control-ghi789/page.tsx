'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, DollarSign, Users, Utensils, User as UserIcon, Search, Download, Printer, ShoppingCart, X, Edit, Save, WifiOff, Bell, TrendingUp, Clock, CheckCircle, AlertCircle, Settings, Database, FileText, Calendar, LogOut, Wifi } from 'lucide-react'
import { localStorageDB, LocalOrder, LocalDish, LocalTable, LocalUser, LocalOrderItem } from '@/lib/local-storage-db'
import { printWithFallback, WebUSBPrinter } from '@/lib/webusb-printer'
import { playClickSound, playSuccessSound, playErrorSound, playPrintSound, playNotificationSound } from '@/lib/sound-effects'
import Sidebar from '@/components/Sidebar'

const formatOrderId = (orderId: string) => {
  const hash = orderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const orderNumber = (hash % 999) + 1
  return `DPK-${String(orderNumber).padStart(3, '0')}`
}

export default function OfflineAdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<LocalUser | null>(null)
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [dishes, setDishes] = useState<LocalDish[]>([])
  const [tables, setTables] = useState<LocalTable[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<LocalOrder | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [printerConnected, setPrinterConnected] = useState(false)
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountPercentage, setDiscountPercentage] = useState('')
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [newDish, setNewDish] = useState({ name: '', price: '', category: '', is_available: true })
  const [newTable, setNewTable] = useState({ table_number: '', capacity: '', is_available: true })
  
  // Cart state for offline billing UI
  const [offlineCart, setOfflineCart] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [menuSearchTerm, setMenuSearchTerm] = useState('')
  const [addedDishIds, setAddedDishIds] = useState<Set<string>>(new Set())
  const [billDiscountAmount, setBillDiscountAmount] = useState('')
  const [billDiscountPercentage, setBillDiscountPercentage] = useState('')
  const [billDiscountType, setBillDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [showBillPreview, setShowBillPreview] = useState(false)
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'dishes' | 'tables' | 'reports' | 'offline-billing'>('overview')
  
  // Notification state
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Internet connectivity state
  const [isOnline, setIsOnline] = useState(true)
  
  // Animation states
  const [cartAnimation, setCartAnimation] = useState(false)

  useEffect(() => {
    localStorageDB.initializeSampleData()
    loadOfflineData()
    const userData = localStorage.getItem('offline_user')
    if (!userData) {
      router.push('/offline-login')
      return
    }
    setUser(JSON.parse(userData))
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
    setLoading(false)
    
    // Internet connectivity detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)
    
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const loadOfflineData = () => {
    setOrders(localStorageDB.getOrders())
    setDishes(localStorageDB.getDishes())
    setTables(localStorageDB.getTables())
  }

  const handleLogout = () => {
    playClickSound()
    // Clear all cookies
    document.cookie = 'hotel_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Clear localStorage
    localStorage.removeItem('offline_user')
    localStorage.clear()
    
    // Redirect to main page
    router.push('/')
  }

  // Function to switch to online mode
  const handleSwitchToOnline = () => {
    playClickSound()
    if (isOnline) {
      router.push('/admin')
    } else {
      playErrorSound()
      alert('No internet connection. Please connect to the internet to switch to online mode.')
    }
  }

  // Cart functions with sound effects
  const addToCart = (dish: LocalDish) => {
    const existingItem = offlineCart.find(item => item.dish_id === dish.id)
    if (existingItem) {
      setOfflineCart(offlineCart.map(item => 
        item.dish_id === dish.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setOfflineCart([...offlineCart, {
        id: `${dish.id}-${Date.now()}`,
        dish_id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        category: dish.category
      }])
    }
    setAddedDishIds(prev => new Set(prev).add(dish.id))
    setCartAnimation(true)
    setTimeout(() => setCartAnimation(false), 300)
    playSuccessSound()
  }

  const removeFromCart = (cartItemId: string) => {
    playClickSound()
    setOfflineCart(offlineCart.filter(item => item.id !== cartItemId))
  }

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    playClickSound()
    if (quantity <= 0) {
      removeFromCart(cartItemId)
    } else {
      setOfflineCart(offlineCart.map(item => 
        item.id === cartItemId 
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return offlineCart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
  }

  const calculateBillTotal = () => {
    const subtotal = getCartTotal()
    let discount = 0
    if (billDiscountType === 'amount' && billDiscountAmount) {
      discount = parseFloat(billDiscountAmount)
    } else if (billDiscountType === 'percentage' && billDiscountPercentage) {
      discount = (parseFloat(billDiscountPercentage) / 100) * subtotal
    }
    return Math.max(0, subtotal - discount)
  }

  const createOfflineOrder = () => {
    playClickSound()
    if (offlineCart.length === 0) {
      playErrorSound()
      alert('Please add items to cart first')
      return
    }
    if (!selectedTable) {
      playErrorSound()
      alert('Please select a table')
      return
    }

    const offlineOrder: LocalOrder = {
      id: Date.now().toString(),
      table_id: selectedTable,
      customer_name: customerName || 'Guest',
      total_amount: getCartTotal(),
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_items: offlineCart.map(item => ({
        id: item.id,
        order_id: '',
        dish_id: item.dish_id,
        quantity: item.quantity,
        dish_type: item.category
      })),
      tables: tables.find(t => t.id === selectedTable),
      users: user || undefined
    }

    localStorageDB.addOrder(offlineOrder)
    loadOfflineData()
    setOfflineCart([])
    setSelectedTable('')
    setCustomerName('')
    setCustomerMobile('')
    setAddedDishIds(new Set())
    playSuccessSound()
    alert('Offline order created successfully!')
  }

  const handleCreateBill = () => {
    playClickSound()
    if (offlineCart.length === 0) {
      playErrorSound()
      alert('Please add items to cart first')
      return
    }
    if (!selectedTable) {
      playErrorSound()
      alert('Please select a table')
      return
    }
    // Directly print without showing preview modal
    handlePrintBill()
  }

  const handlePrintBill = async () => {
    playClickSound()
    playPrintSound()
    if (offlineCart.length === 0) {
      playErrorSound()
      alert('Cart is empty')
      return
    }

    const tableNumber = tables.find(t => t.id === selectedTable)?.table_number || 'N/A'
    
    try {
      let escposContent = ''
      escposContent += '\x1B\x40'
      escposContent += '\x1B\x61\x01'
      escposContent += '\x1B\x21\x30'
      escposContent += 'DHOLE PATIL KHANAWAL\n'
      escposContent += '\x1B\x21\x00'
      escposContent += 'RESTAURANT & BAR\n'
      escposContent += '================================\n'
      escposContent += '123, MAIN STREET\n'
      escposContent += 'CITY, STATE - 123456\n'
      escposContent += 'PHONE: +91 98765 43210\n'
      escposContent += 'GSTIN: 29ABCDE1234F1Z5\n'
      escposContent += '================================\n'
      escposContent += '\x1B\x21\x08'
      escposContent += 'BILL / INVOICE\n'
      escposContent += '\x1B\x21\x00'
      escposContent += '================================\n\n'
      escposContent += '\x1B\x61\x00'
      escposContent += `Bill No: DPK-${String((Date.now() % 999) + 1).padStart(3, '0')}\n`
      escposContent += `Date: ${new Date().toLocaleDateString()}\n`
      escposContent += `Time: ${new Date().toLocaleTimeString()}\n`
      escposContent += `Table: ${tableNumber}\n`
      escposContent += `Customer: ${customerName || 'GUEST'}\n`
      escposContent += '--------------------------\n'
      escposContent += '\x1B\x21\x08'
      escposContent += '  ITEM                  QTY  AMT\n'
      escposContent += '--------------------------\n'
      escposContent += '\x1B\x21\x00'
      
      offlineCart.forEach((item) => {
        const name = item.name
        const qty = item.quantity
        const price = item.price
        const total = (price * qty).toFixed(2)
        const itemName = name.length > 14 ? name.substring(0, 13) + '.' : name
        escposContent += `${itemName.padEnd(14)} ${qty.toString().padStart(2)} ${total.padStart(7)}\n`
      })
      
      escposContent += '--------------------------\n'
      escposContent += `Subtotal: RS${getCartTotal().toFixed(2)}\n`
      
      const subtotal = getCartTotal()
      let discount = 0
      if (billDiscountType === 'amount' && billDiscountAmount) {
        discount = parseFloat(billDiscountAmount)
      } else if (billDiscountType === 'percentage' && billDiscountPercentage) {
        discount = (parseFloat(billDiscountPercentage) / 100) * subtotal
      }
      if (discount > 0) {
        escposContent += `Discount: RS${discount.toFixed(2)}\n`
      }
      
      escposContent += '\x1B\x61\x01'
      escposContent += '================================\n'
      escposContent += '\x1B\x21\x08'
      escposContent += 'GRAND TOTAL\n'
      escposContent += `RS${calculateBillTotal().toFixed(2)}\n`
      escposContent += '\x1B\x21\x00'
      escposContent += '================================\n'
      escposContent += 'THANK YOU FOR DINING!\n'
      escposContent += 'VISIT US AGAIN\n'
      escposContent += '================================\n'
      escposContent += 'DEVELOPED BY ONETHYNK TECHMEDIA\n'
      escposContent += '================================\n\n'
      escposContent += '================================\n\n'
      escposContent += '\x1D\x56\x00'
      
      const printer = new WebUSBPrinter()
      await printer.connect()
      await printer.print(escposContent)
      await printer.disconnect()
      
      playSuccessSound()
      alert('Bill printed successfully!')
    } catch (error: any) {
      console.error('Printing failed:', error)
      playErrorSound()
      alert('Printing failed. Please try again.')
    }
  }

  const handleConnectPrinter = async () => {
    playClickSound()
    try {
      const printer = new WebUSBPrinter()
      await printer.connect()
      setPrinterConnected(true)
      playSuccessSound()
      alert('Printer connected successfully!')
    } catch (error: any) {
      playErrorSound()
      alert('Failed to connect printer: ' + error.message)
    }
  }

  const calculateDiscountValue = (total: number) => {
    return discountType === 'amount' ? parseFloat(discountAmount) || 0 : (parseFloat(discountPercentage) || 0) / 100 * total
  }

  const calculateFinalAmount = (total: number) => total - calculateDiscountValue(total)

  const handleThermalPrint = async () => {
    if (!selectedOrderForBilling) return
    
    playClickSound()
    playPrintSound()
    
    try {
      console.log('Starting thermal print...')
      
      // Generate properly formatted plain text bill content for thermal printer
      // 58mm paper width = approximately 32-35 characters per line
      const plainText = `
<strong class="header">DHOLE PATIL Khanawal</strong><br>
Restaurant & Bar<br>
================================<br>
123, Main Street<br>
City, State - 123456<br>
Phone: +91 98765 43210<br>
================================<br>
BILL / INVOICE<br>
================================<br>
<br>
Bill No: ${formatOrderId(selectedOrderForBilling.id)}<br>
Date: ${new Date(selectedOrderForBilling.created_at).toLocaleDateString()}<br>
Time: ${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}<br>
Table: ${selectedOrderForBilling.tables?.table_number}<br>
Waiter: ${selectedOrderForBilling.users?.name}<br>
Customer: ${selectedOrderForBilling.customer_name || 'Guest'}<br>
--------------------------------<br>
ITEM             QTY  AMOUNT<br>
--------------------------------<br>
${selectedOrderForBilling.order_items?.map((item: any) => {
  const name = item.dishes?.name || 'Unknown'
  const qty = item.quantity
  const price = (item.dishes?.price || item.price || 0)
  const total = (price * qty).toFixed(2)
  const itemName = name.length > 16 ? name.substring(0, 15) + '.' : name
  return `${itemName.padEnd(16)} ${qty.toString().padStart(2)}  ${total.padStart(8)}<br>`
}).join('')}
--------------------------------<br>
Subtotal:      Rs${selectedOrderForBilling.total_amount.toFixed(2).padStart(8)}<br>
${(() => {
  const discount = calculateDiscountValue(selectedOrderForBilling.total_amount)
  return discount > 0 ? `Discount:      Rs${discount.toFixed(2).padStart(8)}<br>` : ''
})()}================================<br>
<strong class="grand-total">*** GRAND TOTAL: Rs${calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)} ***</strong><br>
================================<br>
Thank You for Dining!<br>
Visit Us Again<br>
================================<br>
<span class="developer">Dhole Patil Khanawal</span><br>
================================
`
      
      console.log('Bill content generated')
      
      await printWithFallback(plainText, plainText)
      playSuccessSound()
      // Close modal after printing
      setSelectedOrderForBilling(null)
    } catch (error) {
      playErrorSound()
      alert('Printing failed: ' + (error as Error).message)
    }
  }

  const handleMarkAsPaid = (order: LocalOrder) => {
    playClickSound()
    localStorageDB.updateOrder(order.id, { status: 'paid' })
    loadOfflineData()
    setSelectedOrderForBilling(null)
    playSuccessSound()
    alert('Order marked as paid!')
  }

  const handleAddDish = () => {
    playClickSound()
    if (!newDish.name || !newDish.price || !newDish.category) { playErrorSound(); alert('Please fill all fields'); return }
    localStorageDB.addDish({ id: Date.now().toString(), name: newDish.name, price: parseFloat(newDish.price), category: newDish.category, is_available: true })
    loadOfflineData()
    setNewDish({ name: '', price: '', category: '', is_available: true })
    playSuccessSound()
  }

  const handleAddTable = () => {
    playClickSound()
    if (!newTable.table_number || !newTable.capacity) { playErrorSound(); alert('Please fill all fields'); return }
    localStorageDB.addTable({ id: Date.now().toString(), table_number: parseInt(newTable.table_number), capacity: parseInt(newTable.capacity), is_available: true })
    loadOfflineData()
    setNewTable({ table_number: '', capacity: '', is_available: true })
    playSuccessSound()
  }

  const handleDeleteDish = (id: string) => {
    playClickSound()
    if (confirm('Delete this dish?')) { localStorageDB.deleteDish(id); loadOfflineData(); playSuccessSound() }
  }

  const handleDeleteTable = (id: string) => {
    playClickSound()
    if (confirm('Delete this table?')) { localStorageDB.deleteTable(id); loadOfflineData(); playSuccessSound() }
  }

  const handleExportData = () => {
    playClickSound()
    const data = localStorageDB.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotel_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    playSuccessSound()
  }

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    playClickSound()
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      localStorageDB.importData(content)
      loadOfflineData()
      playSuccessSound()
      alert('Data imported successfully!')
    }
    reader.readAsText(file)
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || formatOrderId(order.id).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#5D3A1A]"></div></div>

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab as any} user={user} />
      
      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Header */}
        <header className="bg-white shadow-lg sticky top-0 z-30 border-b-2 border-[#5D3A1A]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-[#5D3A1A] text-white text-sm font-semibold flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                OFFLINE MODE
              </div>
              <h2 className="text-xl font-bold text-[#5D3A1A] capitalize">
                {activeTab.replace('-', ' ')}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Switch to Online Mode Button */}
              <button
                onClick={handleSwitchToOnline}
                className={`p-2 rounded-full transition-colors ${isOnline ? 'bg-[#F5F5DC] hover:bg-[#DEB887]' : 'bg-gray-100 hover:bg-gray-200'}`}
                title="Switch to Online Mode"
              >
                <Wifi className={`w-5 h-5 ${isOnline ? 'text-[#5D3A1A]' : 'text-gray-500'}`} />
              </button>
              
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-600">{currentDateTime.toLocaleDateString()}</p>
                <p className="text-sm font-semibold text-gray-800">{currentDateTime.toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={() => {
                  playClickSound()
                  setShowNotifications(!showNotifications)
                }}
                className="relative p-2 rounded-full bg-[#F5F5DC] hover:bg-[#8B4513] hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5 text-[#5D3A1A]" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#5D3A1A] text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="fixed top-16 right-4 lg:right-72 w-80 bg-white rounded-xl shadow-2xl z-50 p-4">
            <h3 className="font-bold text-gray-900 mb-3">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm">No notifications</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((notif, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-900">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Orders</p>
                      <p className="text-3xl font-bold text-[#5D3A1A]">{orders.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#F5F5DC] rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-[#5D3A1A]" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Dishes</p>
                      <p className="text-3xl font-bold text-blue-600">{dishes.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Utensils className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Tables</p>
                      <p className="text-3xl font-bold text-purple-600">{tables.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Revenue</p>
                      <p className="text-3xl font-bold text-yellow-600">₹{orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_amount, 0).toFixed(0)}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => {
                      playClickSound()
                      setActiveTab('orders')
                    }}
                    className="flex items-center gap-3 p-4 bg-[#5D3A1A] text-white rounded-xl hover:bg-[#8B4513] transition-all"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="font-semibold">New Order</span>
                  </button>
                  <button 
                    onClick={() => {
                      playClickSound()
                      setActiveTab('dishes')
                    }}
                    className="flex items-center gap-3 p-4 bg-[#8B4513] text-white rounded-xl hover:bg-[#A0522D] transition-all"
                  >
                    <Utensils className="w-5 h-5" />
                    <span className="font-semibold">Add Dish</span>
                  </button>
                  <button 
                    onClick={() => {
                      playClickSound()
                      setActiveTab('tables')
                    }}
                    className="flex items-center gap-3 p-4 bg-[#A0522D] text-white rounded-xl hover:bg-[#D2691E] transition-all"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span className="font-semibold">Add Table</span>
                  </button>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h3>
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F5F5DC] rounded-full flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-[#5D3A1A]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{formatOrderId(order.id)}</p>
                          <p className="text-sm text-gray-600">{order.customer_name || 'Guest'} - Table {order.tables?.table_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#5D3A1A]">₹{order.total_amount.toFixed(2)}</p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'paid' ? 'bg-[#F5F5DC] text-[#5D3A1A]' : 'bg-yellow-100 text-yellow-800'}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab - Billing Interface */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-[#5D3A1A]">
                  Offline Orders
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Menu Section */}
                <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Menu Items</h2>
                  
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                      value={menuSearchTerm}
                      onChange={(e) => setMenuSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {dishes.length === 0 ? (
                    <div className="text-center py-12">
                      <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No menu items available</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {dishes
                        .filter(d => d.is_available)
                        .filter(d => d.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) || d.category.toLowerCase().includes(menuSearchTerm.toLowerCase()))
                        .map((dish) => (
                        <div
                          key={dish.id}
                          onClick={() => {
                            playClickSound()
                            addToCart(dish)
                          }}
                          className={`flex items-center gap-4 border-2 rounded-xl p-3 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 ${
                            addedDishIds.has(dish.id) 
                              ? 'bg-[#F5F5DC] border-[#5D3A1A]' 
                              : 'bg-[#FAEBD7] border-[#8B4513]'
                          }`}
                        >
                          <div className="w-16 h-16 bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
                            <Utensils className="w-8 h-8 text-[#5D3A1A]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{dish.name}</h3>
                            <p className="text-xs text-gray-600 mb-1 truncate">{dish.category}</p>
                            <p className="text-lg font-bold text-[#5D3A1A]">₹{dish.price.toFixed(2)}</p>
                          </div>
                          <button className="bg-[#5D3A1A] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#8B4513] transition-colors">
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Section */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 h-fit">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Cart ({offlineCart.length} items)</h2>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Table</label>
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                      disabled={tables.length === 0}
                    >
                      <option value="">
                        {tables.length === 0 ? 'No tables available' : 'Choose a table...'}
                      </option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.table_number} (Capacity: {table.capacity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name (Optional)</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number (Optional)</label>
                    <input
                      type="tel"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      placeholder="Enter mobile number"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  {offlineCart.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold mb-3">Cart Items</h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {offlineCart.map((item) => (
                          <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-600">Qty: {item.quantity} × ₹{item.price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[#5D3A1A] text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                              <button onClick={() => {
                                playClickSound()
                                removeFromCart(item.id)
                              }} className="text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xl font-bold text-right text-[#5D3A1A]">Total: ₹{getCartTotal().toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => {
                        playClickSound()
                        createOfflineOrder()
                      }}
                      disabled={offlineCart.length === 0 || !selectedTable}
                      className="w-full bg-[#5D3A1A] text-white px-4 py-3 rounded-xl font-semibold hover:bg-[#8B4513] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Order
                    </button>
                    <button
                      onClick={() => {
                        playClickSound()
                        handleCreateBill()
                      }}
                      disabled={offlineCart.length === 0 || !selectedTable}
                      className="w-full bg-[#8B4513] text-white px-4 py-3 rounded-xl font-semibold hover:bg-[#A0522D] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Print Bill
                    </button>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="bg-white rounded-xl shadow-lg mt-6">
                <div className="border-b border-gray-200">
                  <nav className="flex gap-4 px-6">
                    <button className="px-4 py-4 text-[#5D3A1A] border-b-2 border-[#5D3A1A] font-semibold">All Orders</button>
                  </nav>
                </div>
                <div className="p-6">
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#D2691E]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Order ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Table</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-[#F5F5DC]">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatOrderId(order.id)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{order.customer_name || 'Guest'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{order.tables?.table_number || '-'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{order.total_amount.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'paid' ? 'bg-[#5D3A1A] text-white' : 'bg-[#F5F5DC] text-[#5D3A1A]'}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => {
                                playClickSound()
                                setSelectedOrderForBilling(order)
                                setTimeout(() => handleThermalPrint(), 100)
                              }} className="bg-[#5D3A1A] text-white px-3 py-1 rounded-lg text-xs hover:bg-[#8B4513]">Print Bill</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dishes Tab */}
          {activeTab === 'dishes' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Menu Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <input type="text" placeholder="Dish Name" value={newDish.name} onChange={(e) => setNewDish({ ...newDish, name: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="number" placeholder="Price" value={newDish.price} onChange={(e) => setNewDish({ ...newDish, price: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="text" placeholder="Category" value={newDish.category} onChange={(e) => setNewDish({ ...newDish, category: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" />
                <button onClick={() => {
                        playClickSound()
                        handleAddDish()
                      }} className="bg-[#5D3A1A] text-white px-4 py-2 rounded-lg hover:bg-[#8B4513]"><Plus className="w-4 h-4 inline" /> Add Dish</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dishes.map((dish) => (
                  <div key={dish.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-semibold">{dish.name}</h4>
                        <p className="text-sm text-gray-600">{dish.category}</p>
                        <p className="text-lg font-bold text-[#5D3A1A]">₹{dish.price}</p>
                      </div>
                      <button onClick={() => {
                        playClickSound()
                        handleDeleteDish(dish.id)
                      }} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tables Tab */}
          {activeTab === 'tables' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Table Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input type="number" placeholder="Table Number" value={newTable.table_number} onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="number" placeholder="Capacity" value={newTable.capacity} onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" />
                <button onClick={() => {
                  playClickSound()
                  handleAddTable()
                }} className="bg-[#5D3A1A] text-white px-4 py-2 rounded-lg hover:bg-[#8B4513]"><Plus className="w-4 h-4 inline" /> Add Table</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <div key={table.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-semibold">Table {table.table_number}</h4>
                        <p className="text-sm text-gray-600">Capacity: {table.capacity}</p>
                      </div>
                      <button onClick={() => {
                        playClickSound()
                        handleDeleteTable(table.id)
                      }} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#5D3A1A] text-white rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-2">Total Revenue</h3>
                  <p className="text-3xl font-bold">₹{orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_amount, 0).toFixed(2)}</p>
                </div>
                <div className="bg-[#8B4513] text-white rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-2">Total Orders</h3>
                  <p className="text-3xl font-bold">{orders.length}</p>
                </div>
                <div className="bg-[#A0522D] text-white rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-2">Pending Orders</h3>
                  <p className="text-3xl font-bold">{orders.filter(o => o.status === 'pending').length}</p>
                </div>
                <div className="bg-[#D2691E] text-white rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-2">Average Order Value</h3>
                  <p className="text-3xl font-bold">₹{orders.length > 0 ? (orders.reduce((sum, o) => sum + o.total_amount, 0) / orders.length).toFixed(2) : '0.00'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab - moved to offline-billing */}
          {activeTab === 'offline-billing' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>
              <div className="space-y-6">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold mb-4">Data Management</h3>
                  <div className="flex gap-4">
                    <button onClick={() => {
                      playClickSound()
                      handleExportData()
                    }} className="bg-[#5D3A1A] text-white px-4 py-2 rounded-lg hover:bg-[#8B4513]"><Download className="w-4 h-4 inline" /> Export Data (Backup)</button>
                    <label className="bg-[#8B4513] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#A0522D]">
                      <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                      <Download className="w-4 h-4 inline" /> Import Data (Restore)
                    </label>
                  </div>
                </div>
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold mb-4">Printer Settings</h3>
                  <button onClick={() => {
                    playClickSound()
                    handleConnectPrinter()
                  }} className="bg-[#A0522D] text-white px-4 py-2 rounded-lg hover:bg-[#D2691E]">
                    {printerConnected ? 'Printer Connected' : 'Connect Printer'}
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">System Info</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Mode:</strong> Offline</p>
                    <p><strong>User:</strong> {user?.name}</p>
                    <p><strong>Role:</strong> {user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bill Preview Modal */}
      {showBillPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-700">Bill Preview</h2>
              <button onClick={() => setShowBillPreview(false)} className="text-gray-500"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Order Details</h3>
                <p>Table: {tables.find(t => t.id === selectedTable)?.table_number}</p>
                <p>Customer: {customerName || 'Guest'}</p>
                <p>Subtotal: ₹{getCartTotal().toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Discount</h3>
                <div className="flex gap-4">
                  <select value={billDiscountType} onChange={(e) => setBillDiscountType(e.target.value as 'amount' | 'percentage')} className="px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="amount">Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                  <input type="number" placeholder={billDiscountType === 'amount' ? 'Discount Amount' : 'Discount %'} value={billDiscountType === 'amount' ? billDiscountAmount : billDiscountPercentage} onChange={(e) => billDiscountType === 'amount' ? setBillDiscountAmount(e.target.value) : setBillDiscountPercentage(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <p className="mt-2 text-lg font-bold text-[#5D3A1A]">Final Amount: ₹{calculateBillTotal().toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBillPreview(false)} className="flex-1 px-6 py-3 border-2 border-[#8B4513] text-[#5D3A1A] rounded-xl">Close</button>
              <button onClick={handlePrintBill} className="flex-1 px-6 py-3 bg-[#5D3A1A] text-white rounded-xl">Print Bill</button>
              <button onClick={createOfflineOrder} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl">Create Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Billing Modal */}
      {selectedOrderForBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-700">Print Bill</h2>
              <button onClick={() => setSelectedOrderForBilling(null)} className="text-gray-500"><Trash2 className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Order Details</h3>
                <p>Order ID: {formatOrderId(selectedOrderForBilling.id)}</p>
                <p>Customer: {selectedOrderForBilling.customer_name || 'Guest'}</p>
                <p>Table: {selectedOrderForBilling.tables?.table_number}</p>
                <p>Total: ₹{selectedOrderForBilling.total_amount.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Discount</h3>
                <div className="flex gap-4">
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')} className="px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="amount">Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                  <input type="number" placeholder={discountType === 'amount' ? 'Discount Amount' : 'Discount %'} value={discountType === 'amount' ? discountAmount : discountPercentage} onChange={(e) => discountType === 'amount' ? setDiscountAmount(e.target.value) : setDiscountPercentage(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <p className="mt-2 text-lg font-bold text-green-600">Final Amount: ₹{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedOrderForBilling(null)} className="flex-1 px-6 py-3 border-2 border-[#8B4513] text-[#5D3A1A] rounded-xl">Close</button>
              <button onClick={handleConnectPrinter} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl"><Printer className="w-4 h-4 inline" /> {printerConnected ? 'Connected' : 'Connect'}</button>
              <button onClick={handleThermalPrint} className="flex-1 px-6 py-3 bg-[#5D3A1A] text-white rounded-xl">Print Bill</button>
              <button onClick={() => handleMarkAsPaid(selectedOrderForBilling)} className="flex-1 px-6 py-3 bg-[#5D3A1A] text-white rounded-xl">Mark Paid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
