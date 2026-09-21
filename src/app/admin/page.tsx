'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Order, Dish, Table, Payment, Notification } from '@/types'
import { Plus, Edit, Trash2, DollarSign, Users, Utensils, User as UserIcon, Search, Filter, HelpCircle, Bell, LogOut, Download, Printer } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import WaiterStatus from '@/components/WaiterStatus'
import Reports from '@/components/Reports'

// Utility function to format order ID as GGR-XXX
const formatOrderId = (orderId: string) => {
  // Extract a number from the UUID and format it
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1 // Ensure it's between 1-999
  return `GGR-${String(orderNumber).padStart(3, '0')}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports' | 'offline-orders'>('overview')
  const [loading, setLoading] = useState(true)
  const [showDishModal, setShowDishModal] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [tableForm, setTableForm] = useState({
    table_number: '',
    capacity: ''
  } as {
    table_number: string
    capacity: string
  })
  const [selectedTableOrders, setSelectedTableOrders] = useState<any[]>([])
  const [showTableOrders, setShowTableOrders] = useState(false)
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountPercentage, setDiscountPercentage] = useState('')
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    is_available: true
  } as {
    name: string
    description: string
    price: string
    category: string
    image_url: string
    is_available: boolean
  })
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<Order | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null)
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  
  // Offline Orders State
  const [offlineCart, setOfflineCart] = useState<any[]>([])
  const [offlineOrders, setOfflineOrders] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [menuSearchTerm, setMenuSearchTerm] = useState('')
  const [showBillPreview, setShowBillPreview] = useState(false)
  const [billDiscountAmount, setBillDiscountAmount] = useState('')
  const [billDiscountPercentage, setBillDiscountPercentage] = useState('')
  const [billDiscountType, setBillDiscountType] = useState<'amount' | 'percentage'>('amount')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'admin') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    fetchData()

    // Set up polling for order updates (replacing real-time subscription)
    const interval = setInterval(() => {
      fetchData()
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineOrders()
      fetchData()
    }
    const handleOffline = () => {
      setIsOnline(false)
      loadCachedData()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    // Load offline orders from localStorage
    const savedOfflineOrders = localStorage.getItem('offline_orders')
    if (savedOfflineOrders) {
      setOfflineOrders(JSON.parse(savedOfflineOrders))
    }

    // Load cached data on initial load
    loadCachedData()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load cached data from localStorage
  const loadCachedData = () => {
    try {
      const cachedDishes = localStorage.getItem('cached_dishes')
      const cachedTables = localStorage.getItem('cached_tables')
      const cachedOrders = localStorage.getItem('cached_orders')
      const cachedPayments = localStorage.getItem('cached_payments')
      const cachedNotifications = localStorage.getItem('cached_notifications')
      
      if (cachedDishes) {
        setDishes(JSON.parse(cachedDishes))
      }
      if (cachedTables) {
        setTables(JSON.parse(cachedTables))
      }
      if (cachedOrders) {
        setOrders(JSON.parse(cachedOrders))
      }
      if (cachedPayments) {
        setPayments(JSON.parse(cachedPayments))
      }
      if (cachedNotifications) {
        setNotifications(JSON.parse(cachedNotifications))
      }
    } catch (error) {
      console.error('Error loading cached data:', error)
    }
  }

  // Sync offline orders when coming online
  const syncOfflineOrders = async () => {
    const savedOfflineOrders = localStorage.getItem('offline_orders')
    if (!savedOfflineOrders) return

    const orders = JSON.parse(savedOfflineOrders)
    if (orders.length === 0) return

    try {
      for (const order of orders) {
        // Create order in database
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_id: order.table_id,
            waiter_id: order.waiter_id,
            customer_name: order.customer_name,
            total_amount: order.total_amount,
            status: 'pending'
          })
        })

        if (orderResponse.ok) {
          const createdOrder = await orderResponse.json()

          // Create order items
          for (const item of order.order_items) {
            await fetch('/api/order-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: createdOrder.id,
                dish_id: item.dish_id,
                quantity: item.quantity,
                price: item.price,
                special_instructions: item.special_instructions
              })
            })
          }
        }
      }

      // Clear synced orders from localStorage
      localStorage.removeItem('offline_orders')
      setOfflineOrders([])
      fetchData()
      alert(`Successfully synced ${orders.length} offline orders to database!`)
    } catch (error) {
      console.error('Error syncing offline orders:', error)
      alert('Failed to sync some offline orders. Please try again.')
    }
  }

  const fetchData = async () => {
    try {
      const [ordersRes, dishesRes, tablesRes, paymentsRes, notificationsRes] = await Promise.all([
        fetch('/api/orders').then(async res => {
          if (!res.ok) throw new Error(`Orders API error: ${res.status}`)
          return res.json()
        }).catch(() => []),
        fetch('/api/dishes').then(async res => {
          if (!res.ok) throw new Error(`Dishes API error: ${res.status}`)
          return res.json()
        }).catch(() => []),
        fetch('/api/tables').then(async res => {
          if (!res.ok) throw new Error(`Tables API error: ${res.status}`)
          return res.json()
        }).catch(() => []),
        fetch('/api/payments').then(async res => {
          if (!res.ok) throw new Error(`Payments API error: ${res.status}`)
          return res.json()
        }).catch(() => []),
        fetch('/api/notifications').then(async res => {
          if (!res.ok) throw new Error(`Notifications API error: ${res.status}`)
          return res.json()
        }).catch(() => [])
      ])

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (ordersRes || []).map(async (order: any) => {
          try {
            const itemsRes = await fetch(`/api/orders/${order.id}/items`)
            if (!itemsRes.ok) throw new Error(`Order items API error: ${itemsRes.status}`)
            const items = await itemsRes.json()
            return { ...order, order_items: items }
          } catch (error) {
            console.error('Error fetching order items:', error)
            return { ...order, order_items: [] }
          }
        })
      )

      setOrders(ordersWithItems)
      setDishes(dishesRes || [])
      setTables(tablesRes || [])
      setPayments(paymentsRes.data || paymentsRes || [])
      setNotifications(notificationsRes.data || notificationsRes || [])

      // Cache all data for offline use
      if (dishesRes && dishesRes.length > 0) {
        localStorage.setItem('cached_dishes', JSON.stringify(dishesRes))
      }
      if (tablesRes && tablesRes.length > 0) {
        localStorage.setItem('cached_tables', JSON.stringify(tablesRes))
      }
      if (ordersWithItems && ordersWithItems.length > 0) {
        localStorage.setItem('cached_orders', JSON.stringify(ordersWithItems))
      }
      if (paymentsRes && (paymentsRes.data || paymentsRes).length > 0) {
        localStorage.setItem('cached_payments', JSON.stringify(paymentsRes.data || paymentsRes))
      }
      if (notificationsRes && (notificationsRes.data || notificationsRes).length > 0) {
        localStorage.setItem('cached_notifications', JSON.stringify(notificationsRes.data || notificationsRes))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDish = () => {
    setEditingDish(null)
    setDishForm({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      is_available: true
    })
    setShowDishModal(true)
  }

  const handleEditDish = (dish: Dish) => {
    setEditingDish(dish)
    setDishForm({
      name: dish.name,
      description: dish.description ?? '',
      price: dish.price.toString(),
      category: dish.category,
      image_url: dish.image_url ?? '',
      is_available: dish.is_available
    })
    setShowDishModal(true)
  }

  const handleDeleteDish = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dish?')) return

    try {
      const response = await fetch(`/api/dishes?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete dish')

      fetchData()
    } catch (error) {
      console.error('Error deleting dish:', error)
      alert('Failed to delete dish')
    }
  }

  const handleSaveDish = async () => {
    try {
      const payload = {
        ...dishForm,
        price: parseFloat(dishForm.price)
      }

      const response = await fetch('/api/dishes', {
        method: editingDish ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingDish ? { ...payload, id: editingDish.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save dish')

      setShowDishModal(false)
      fetchData()
    } catch (error) {
      console.error('Error saving dish:', error)
      alert('Failed to save dish')
    }
  }

  const calculateFinalAmount = (totalAmount: number) => {
    let discount = 0
    if (discountType === 'amount' && discountAmount) {
      discount = parseFloat(discountAmount)
    } else if (discountType === 'percentage' && discountPercentage) {
      discount = (parseFloat(discountPercentage) / 100) * totalAmount
    }
    return Math.max(0, totalAmount - discount)
  }

  const calculateDiscountValue = (totalAmount: number) => {
    if (discountType === 'amount' && discountAmount) {
      return parseFloat(discountAmount)
    } else if (discountType === 'percentage' && discountPercentage) {
      return (parseFloat(discountPercentage) / 100) * totalAmount
    }
    return 0
  }

  const handleGenerateBill = async (order: Order) => {
    try {
      const itemsRes = await fetch(`/api/orders/${order.id}/items`)
      const orderItems = await itemsRes.json()

      setSelectedOrderForBilling({
        ...order,
        order_items: orderItems || []
      })
      // Reset discount fields when opening new bill
      setDiscountAmount('')
      setDiscountPercentage('')
      setDiscountType('amount')
    } catch (error) {
      console.error('Error fetching order items:', error)
      alert('Failed to generate bill')
    }
  }

  // Direct Print Function using server-side CUPS printing
  const handleThermalPrint = async () => {
    if (!selectedOrderForBilling) return
    
    try {
      console.log('Starting thermal print...')
      
      // Generate properly formatted plain text bill content for thermal printer
      // 58mm paper width = approximately 32-35 characters per line
      const plainText = `
              GALAXY GARDEN
         Restaurant & Bar
================================
123, Main Street
City, State - 123456
Phone: +91 98765 43210
GSTIN: 29ABCDE1234F1Z5
================================
          BILL / INVOICE
================================

Bill No: ${formatOrderId(selectedOrderForBilling.id)}
Date: ${new Date(selectedOrderForBilling.created_at).toLocaleDateString()}
Time: ${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}
Table: ${selectedOrderForBilling.tables?.table_number}
Waiter: ${selectedOrderForBilling.users?.name}
Customer: ${selectedOrderForBilling.customer_name || 'Guest'}
--------------------------------
ITEM             QTY  AMOUNT
--------------------------------
${selectedOrderForBilling.order_items?.map((item: any) => {
  const name = item.dishes?.name || 'Unknown'
  const qty = item.quantity
  const price = (item.dishes?.price || item.price || 0)
  const total = (price * qty).toFixed(2)
  // Truncate name to fit within 16 characters
  const itemName = name.length > 16 ? name.substring(0, 15) + '.' : name
  // Format: Item name (16 chars) | Qty (2 chars) | Amount (8 chars)
  return `${itemName.padEnd(16)} ${qty.toString().padStart(2)}  ${total.padStart(8)}`
}).join('\n')}
--------------------------------
Subtotal:      Rs${selectedOrderForBilling.total_amount.toFixed(2).padStart(8)}
${(() => {
  const discount = calculateDiscountValue(selectedOrderForBilling.total_amount)
  return discount > 0 ? `Discount:      Rs${discount.toFixed(2).padStart(8)}\n` : ''
})()}GRAND TOTAL:   Rs${calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2).padStart(8)}

================================
      Thank You for Dining!
        Visit Us Again
================================
`
      
      console.log('Bill content generated')
      
      // Use server-side CUPS printing (works offline)
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: plainText })
      })

      const result = await response.json()

      if (response.ok) {
        alert('Bill sent to printer successfully!')
      } else {
        // Fallback to browser print if server printing fails
        console.log('Server printing failed, using browser print fallback')
        
        // Create a new window for printing with better cross-platform support
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Bill Print</title>
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
                    @page :left {
                      margin: 0;
                    }
                    @page :right {
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
                    line-height: 1.3;
                    white-space: pre;
                    margin: 0;
                    padding: 2mm;
                    text-align: center;
                    width: 54mm;
                    max-width: 54mm;
                    overflow: hidden;
                    background: white;
                    color: black;
                    font-weight: normal;
                  }
                  /* Windows-specific fixes */
                  @media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
                    body {
                      font-size: 11px;
                      line-height: 1.2;
                    }
                  }
                </style>
              </head>
              <body>${plainText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
            </html>
          `)
          printWindow.document.close()
          printWindow.focus()
          
          // Wait for content to load before printing
          setTimeout(() => {
            printWindow.print()
            // Close window after print dialog closes
            setTimeout(() => {
              printWindow.close()
            }, 1000)
          }, 750)
        } else {
          alert('Please allow popups for printing')
        }
      }
      
    } catch (error) {
      console.error('Printing failed:', error)
      alert('Printing failed: ' + (error as Error).message + '\n\nPlease check printer connection.')
    }
  }

  // Download Printer Driver Function
  const downloadPrinterDriver = () => {
    // Create a text file with printer setup instructions
    const instructions = `
Everycom EC58 Thermal Printer Setup Instructions
================================

Your printer is already configured with CUPS!

Current Status:
- Printer Name: EC58
- Status: Accepting requests
- Connection: USB

To set EC58 as default printer:
  sudo lpoptions -d EC58

To test printing:
  echo "Test Print" | lp -d EC58

To check printer status:
  lpstat -p EC58 -l

To view print queue:
  lpstat -o

To cancel all print jobs:
  cancel -a

Troubleshooting:
1. If printer is not responding:
   sudo systemctl restart cups

2. If printer is not accepting requests:
   sudo cupsaccept EC58

3. If print jobs are stuck:
   cancel -a
   sudo systemctl restart cups

4. To add printer if not configured:
   sudo lpadmin -p EC58 -v usb://Everycom/EC58 -m everywhere

Printer Specifications:
- Model: Everycom EC58
- Print Width: 58mm
- Resolution: 203 DPI
- Interface: USB
- Paper Type: Thermal Paper Roll

For technical support, contact: support@everycom.com
    `
    
    const blob = new Blob([instructions], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'EC58_Printer_Setup_Instructions.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleMarkAsPaid = async (order: Order) => {
    try {
      // Update order status to paid
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: 'paid' })
      })

      // Release the table
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.table_id, is_occupied: false })
      })

      setSelectedOrderForBilling(null)
      fetchData()
      alert('Order marked as paid and table released!')
    } catch (error) {
      console.error('Error marking order as paid:', error)
      alert('Failed to mark order as paid')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Table Management Functions
  const handleAddTable = () => {
    setEditingTable(null)
    setTableForm({
      table_number: '',
      capacity: ''
    })
    setShowTableModal(true)
  }

  const handleEditTable = (table: Table) => {
    setEditingTable(table)
    setTableForm({
      table_number: table.table_number.toString(),
      capacity: table.capacity.toString()
    })
    setShowTableModal(true)
  }

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return

    try {
      await fetch(`/api/tables?id=${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting table:', error)
      alert('Failed to delete table')
    }
  }

  const handleSaveTable = async () => {
    try {
      const payload = {
        table_number: parseInt(tableForm.table_number),
        capacity: parseInt(tableForm.capacity),
        is_master: false
      }

      if (editingTable) {
        await fetch(`/api/tables`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTable.id, ...payload })
        })
      } else {
        await fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      setShowTableModal(false)
      setEditingTable(null)
      setTableForm({ table_number: '', capacity: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving table:', error)
      alert('Failed to save table')
    }
  }

  const handleViewTableOrders = async (tableId: string) => {
    try {
      const ordersRes = await fetch(`/api/orders`)
      const orders = await ordersRes.json()
      const tableOrders = orders.filter((o: any) => o.table_id === tableId && ['pending', 'preparing', 'ready'].includes(o.status))

      setSelectedTableOrders(tableOrders || [])
      setShowTableOrders(true)
    } catch (error) {
      console.error('Error fetching table orders:', error)
      alert('Failed to fetch table orders')
    }
  }

  const handleReleaseTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to release this table?')) return

    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId, is_occupied: false })
      })

      if (!response.ok) throw new Error('Failed to release table')

      fetchData()
      alert('Table released successfully!')
    } catch (error) {
      console.error('Error releasing table:', error)
      alert('Failed to release table')
    }
  }

  // Offline Orders Functions
  const addToCart = (dish: Dish) => {
    const existingItem = offlineCart.find(item => item.dish_id === dish.id)
    if (existingItem) {
      setOfflineCart(offlineCart.map(item => 
        item.dish_id === dish.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setOfflineCart([...offlineCart, {
        dish_id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        image_url: dish.image_url
      }])
    }
  }

  const removeFromCart = (dishId: string) => {
    setOfflineCart(offlineCart.filter(item => item.dish_id !== dishId))
  }

  const updateCartQuantity = (dishId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(dishId)
    } else {
      setOfflineCart(offlineCart.map(item => 
        item.dish_id === dishId 
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return offlineCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const createOfflineOrder = async () => {
    if (offlineCart.length === 0) {
      alert('Please add items to cart first')
      return
    }
    if (!selectedTable) {
      alert('Please select a table')
      return
    }

    const offlineOrder = {
      id: Date.now().toString(),
      table_id: selectedTable,
      waiter_id: user?.id,
      customer_name: customerName || 'Guest',
      total_amount: getCartTotal(),
      status: 'pending',
      created_at: new Date().toISOString(),
      order_items: offlineCart.map(item => ({
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price,
        special_instructions: null
      }))
    }

    // Save to localStorage
    const savedOfflineOrders = localStorage.getItem('offline_orders') || '[]'
    const orders = JSON.parse(savedOfflineOrders)
    orders.push(offlineOrder)
    localStorage.setItem('offline_orders', JSON.stringify(orders))

    setOfflineOrders([...offlineOrders, offlineOrder])
    setOfflineCart([])
    setSelectedTable('')
    setCustomerName('')
    alert('Offline order created successfully!')

    // If online, try to sync immediately
    if (isOnline) {
      syncOfflineOrders()
    }
  }

  const printOfflineBill = async (order: any) => {
    try {
      const plainText = `
              GALAXY GARDEN
         Restaurant & Bar
================================
123, Main Street
City, State - 123456
Phone: +91 98765 43210
GSTIN: 29ABCDE1234F1Z5
================================
          BILL / INVOICE
================================

Bill No: OFF-${order.id}
Date: ${new Date(order.created_at).toLocaleDateString()}
Time: ${new Date(order.created_at).toLocaleTimeString()}
Table: ${tables.find(t => t.id === order.table_id)?.table_number || 'N/A'}
Customer: ${order.customer_name || 'Guest'}
--------------------------------
ITEM             QTY  AMOUNT
--------------------------------
${order.order_items?.map((item: any) => {
  const dish = dishes.find(d => d.id === item.dish_id)
  const name = dish?.name || 'Unknown'
  const qty = item.quantity
  const price = item.price
  const total = (price * qty).toFixed(2)
  const itemName = name.length > 16 ? name.substring(0, 15) + '.' : name
  return `${itemName.padEnd(16)} ${qty.toString().padStart(2)}  ${total.padStart(8)}`
}).join('\n')}
--------------------------------
Subtotal:      Rs${order.total_amount.toFixed(2).padStart(8)}
GRAND TOTAL:   Rs${order.total_amount.toFixed(2).padStart(8)}

================================
      Thank You for Dining!
        Visit Us Again
================================
`

      const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: plainText })
      })

      if (response.ok) {
        alert('Bill sent to printer successfully!')
      } else {
        // Fallback to browser print
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Bill Print</title>
                <style>
                  @page { size: 58mm auto; margin: 0; }
                  body { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre; margin: 0; padding: 2mm; width: 54mm; }
                </style>
              </head>
              <body>${plainText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
            </html>
          `)
          printWindow.document.close()
          printWindow.print()
        }
      }
    } catch (error) {
      alert('Printing failed: ' + (error as Error).message)
    }
  }

  const deleteOfflineOrder = (orderId: string) => {
    if (!confirm('Delete this offline order?')) return
    const updatedOrders = offlineOrders.filter(o => o.id !== orderId)
    setOfflineOrders(updatedOrders)
    localStorage.setItem('offline_orders', JSON.stringify(updatedOrders))
  }

  // Calculate bill total with discount
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

  const handleCreateBill = () => {
    console.log('Creating bill - Cart items:', offlineCart)
    console.log('Selected table:', selectedTable)
    
    if (offlineCart.length === 0) {
      alert('Please add items to cart first')
      return
    }
    if (!selectedTable) {
      alert('Please select a table')
      return
    }
    setShowBillPreview(true)
  }

  const handlePrintBill = async () => {
    console.log('Printing bill - Cart items:', offlineCart)
    
    if (offlineCart.length === 0) {
      alert('Cart is empty. Cannot print bill.')
      return
    }
    
    const tableNumber = tables.find(t => t.id === selectedTable)?.table_number || 'N/A'
    const plainText = `
              GALAXY GARDEN
         Restaurant & Bar
================================
123, Main Street
City, State - 123456
Phone: +91 98765 43210
GSTIN: 29ABCDE1234F1Z5
================================
          BILL / INVOICE
================================

Bill No: OFF-${Date.now()}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Table: ${tableNumber}
Customer: ${customerName || 'Guest'}
--------------------------------
ITEM             QTY  AMOUNT
--------------------------------
${offlineCart.map((item) => {
  const name = item.name
  const qty = item.quantity
  const price = item.price
  const total = (price * qty).toFixed(2)
  const itemName = name.length > 16 ? name.substring(0, 15) + '.' : name
  return `${itemName.padEnd(16)} ${qty.toString().padStart(2)}  ${total.padStart(8)}`
}).join('\n')}
--------------------------------
Subtotal:      Rs${getCartTotal().toFixed(2).padStart(8)}
${(() => {
  const subtotal = getCartTotal()
  let discount = 0
  if (billDiscountType === 'amount' && billDiscountAmount) {
    discount = parseFloat(billDiscountAmount)
  } else if (billDiscountType === 'percentage' && billDiscountPercentage) {
    discount = (parseFloat(billDiscountPercentage) / 100) * subtotal
  }
  return discount > 0 ? `Discount:      Rs${discount.toFixed(2).padStart(8)}\n` : ''
})()}GRAND TOTAL:   Rs${calculateBillTotal().toFixed(2).padStart(8)}

================================
      Thank You for Dining!
        Visit Us Again
================================
`

    try {
      console.log('Sending print request to API...')
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: plainText })
      })

      console.log('Print API response:', response.status)
      
      if (response.ok) {
        alert('Bill sent to printer successfully!')
        // Create offline order after printing
        await createOfflineOrder()
        setShowBillPreview(false)
        setBillDiscountAmount('')
        setBillDiscountPercentage('')
      } else {
        const errorData = await response.json()
        console.error('Print API error:', errorData)
        alert('Server printing failed: ' + (errorData.error || 'Unknown error'))
        // Fallback to browser print
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Bill Print</title>
                <style>
                  @page { size: 58mm auto; margin: 0; }
                  body { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre; margin: 0; padding: 2mm; width: 54mm; }
                </style>
              </head>
              <body>${plainText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
            </html>
          `)
          printWindow.document.close()
          printWindow.print()
          await createOfflineOrder()
          setShowBillPreview(false)
          setBillDiscountAmount('')
          setBillDiscountPercentage('')
        }
      }
    } catch (error) {
      console.error('Printing error:', error)
      alert('Printing failed: ' + (error as Error).message + '\n\nFalling back to browser print...')
      // Fallback to browser print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Bill Print</title>
              <style>
                @page { size: 58mm auto; margin: 0; }
                body { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre; margin: 0; padding: 2mm; width: 54mm; }
              </style>
            </head>
            <body>${plainText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
        await createOfflineOrder()
        setShowBillPreview(false)
        setBillDiscountAmount('')
        setBillDiscountPercentage('')
      }
    }
  }

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => !['completed', 'paid'].includes(o.status)).length,
    totalRevenue: orders.filter(o => ['paid', 'completed'].includes(o.status)).reduce((sum, o) => sum + (o.total_amount || 0), 0),
    totalCustomers: new Set(orders.map(o => o.waiter_id)).size
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <div className="flex-1 lg:ml-72">
        {/* Top Header Bar */}
        <header className="fixed top-0 right-0 left-0 lg:left-72 bg-white/95 backdrop-blur-sm shadow-md z-30 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Hotel Admin</h1>
                <p className="text-xs text-gray-600">Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Support Button */}
              <button
                onClick={() => alert('Support: Contact admin@hotel.com for assistance')}
                className="p-2 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 hover:bg-gradient-to-r hover:from-green-200 hover:to-emerald-200 transition-all duration-300"
                title="Support"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              
              {/* Notification Button */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 hover:bg-gradient-to-r hover:from-green-200 hover:to-emerald-200 transition-all duration-300 relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                      {notifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-slide-in max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                      <p className="font-semibold text-gray-900">Notifications</p>
                      <button
                        onClick={() => {
                          notifications.forEach(n => {
                            fetch(`/api/notifications/${n.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ is_read: true })
                            })
                          })
                          setNotifications(notifications.map(n => ({ ...n, is_read: true })))
                        }}
                        className="text-xs text-green-600 hover:text-green-800 font-semibold"
                      >
                        Mark all read
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-green-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-green-50' : ''}`}
                            onClick={() => {
                              fetch(`/api/notifications/${notification.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ is_read: true })
                              })
                              setNotifications(notifications.map(n => n.id === notification.id ? { ...n, is_read: true } : n))
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${!notification.is_read ? 'bg-green-600' : 'bg-gray-300'}`} />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 hover:bg-gradient-to-r hover:from-green-200 hover:to-emerald-200 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <span className="hidden md:block text-sm font-semibold text-gray-900">{user?.name || 'Admin'}</span>
                </button>
                
                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-slide-in">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-gray-600">{user?.email || 'admin@hotel.com'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 pt-24 lg:pt-20">

        {activeTab === 'overview' && (
          <>
            <div className="mb-6 animate-fade-in">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Welcome, {user?.name || 'Admin'}!
              </h1>
              <p className="text-gray-600 mt-2 text-sm">
                {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • 
                {currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-green-600 mr-2" />
                  <span className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.totalOrders}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-600">Total Orders</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-center mb-3">
                  <Utensils className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500 mr-2" />
                  <span className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.activeOrders}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-600">Active Orders</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-center mb-3">
                  <span className="text-green-600 font-bold text-xl sm:text-2xl mr-2">₹</span>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.totalRevenue.toFixed(0)}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-600">Total Revenue</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-center mb-3">
                  <UserIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500 mr-2" />
                  <span className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.totalCustomers}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-600">Total Customers</p>
              </div>
            </div>

            {/* Revenue Insights - Recent Orders */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Recent Orders</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={fetchData}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                      <Search className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by order ID, table, customer, waiter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-100 to-emerald-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Table No</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order ID</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Waiter</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders
                      .filter(order => {
                        const matchesSearch = 
                          searchQuery === '' || 
                          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          order.tables?.table_number.toString().includes(searchQuery) ||
                          order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          order.users?.name.toLowerCase().includes(searchQuery.toLowerCase())
                        
                        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
                        
                        return matchesSearch && matchesStatus
                      })
                      .slice(0, 10)
                      .map((order) => (
                        <React.Fragment key={order.id}>
                          <tr 
                            className="hover:bg-green-50 transition-colors cursor-pointer md:cursor-default"
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                              }
                            }}
                          >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            Table {order.tables?.table_number || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatOrderId(order.id)}</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer_name || 'Guest'}</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.users?.name || 'Unknown'}</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              order.status === 'paid' ? 'bg-green-100 text-green-800' :
                              order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.order_items?.length || 0} items
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGenerateBill(order)
                              }}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:shadow-lg transition-all duration-300"
                            >
                              Print Bill
                            </button>
                          </td>
                        </tr>
                        {/* Mobile expanded details */}
                        {expandedOrderId === order.id && (
                          <tr key={`expanded-${order.id}`} className="md:hidden bg-green-50">
                            <td colSpan={3} className="px-6 py-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Date:</span>
                                  <span className="font-semibold text-gray-900">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Customer:</span>
                                  <span className="font-semibold text-gray-900">{order.customer_name || 'Guest'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Waiter:</span>
                                  <span className="font-semibold text-gray-900">{order.users?.name || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Status:</span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                                    order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Items:</span>
                                  <span className="font-semibold text-gray-900">{order.order_items?.length || 0} items</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total:</span>
                                  <span className="font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders Management</h2>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">All Orders</h3>
              <button
                onClick={fetchData}
                className="flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-green-100 to-emerald-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Table No</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order ID</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Waiter</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <>
                      <tr 
                        key={order.id} 
                        className="hover:bg-green-50 transition-colors cursor-pointer md:cursor-default"
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          Table {order.tables?.table_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatOrderId(order.id)}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer_name || 'Guest'}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.users?.name || 'Unknown'}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'paid' ? 'bg-green-100 text-green-800' :
                            order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.order_items?.length || 0} items
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateBill(order)
                            }}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:shadow-lg transition-all duration-300"
                          >
                            Print Bill
                          </button>
                        </td>
                      </tr>
                      {/* Mobile expanded details */}
                      {expandedOrderId === order.id && (
                        <tr className="md:hidden bg-green-50">
                          <td colSpan={3} className="px-6 py-4">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-semibold text-gray-900">{new Date(order.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Customer:</span>
                                <span className="font-semibold text-gray-900">{order.customer_name || 'Guest'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Waiter:</span>
                                <span className="font-semibold text-gray-900">{order.users?.name || 'Unknown'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  order.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Items:</span>
                                <span className="font-semibold text-gray-900">{order.order_items?.length || 0} items</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total:</span>
                                <span className="font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {activeTab === 'dishes' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu Management</h2>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Dishes</h3>
              <button
                onClick={handleAddDish}
                className="flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Dish
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-green-100 to-emerald-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dishes.map((dish) => (
                    <>
                      <tr 
                        key={dish.id} 
                        className="hover:bg-green-50 transition-colors cursor-pointer md:cursor-default"
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setExpandedDishId(expandedDishId === dish.id ? null : dish.id)
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{dish.name}</td>
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-600 max-w-xs">{dish.description || '-'}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dish.category}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{dish.price.toFixed(2)}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            dish.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {dish.is_available ? '✓ Available' : '✗ Unavailable'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditDish(dish)
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDish(dish.id)
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {/* Mobile expanded details */}
                      {expandedDishId === dish.id && (
                        <tr className="md:hidden bg-green-50">
                          <td colSpan={2} className="px-6 py-4">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Description:</span>
                                <span className="font-semibold text-gray-900">{dish.description || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Category:</span>
                                <span className="font-semibold text-gray-900">{dish.category}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Price:</span>
                                <span className="font-bold text-gray-900">₹{dish.price.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Status:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  dish.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {dish.is_available ? '✓ Available' : '✗ Unavailable'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {activeTab === 'tables' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Table Management</h2>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Tables</h3>
                <button
                  onClick={handleAddTable}
                  className="flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Table
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-100 to-emerald-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Table Number</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Capacity</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Master Table</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tables.map((table) => (
                      <>
                        <tr 
                          key={table.id} 
                          className="hover:bg-green-50 transition-colors cursor-pointer md:cursor-default"
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setExpandedTableId(expandedTableId === table.id ? null : table.id)
                            }
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Table {table.table_number}</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{table.capacity} seats</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              table.is_occupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              table.is_master ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {table.is_master ? '✓ Master' : 'Standard'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewTableOrders(table.id)
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors font-semibold"
                              title="View Orders"
                            >
                              View Orders
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTable(table)
                              }}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            {table.is_occupied && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReleaseTable(table.id)
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors font-semibold"
                                title="Release Table"
                              >
                                Release
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTable(table.id)
                              }}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                        {/* Mobile expanded details */}
                        {expandedTableId === table.id && (
                          <tr className="md:hidden bg-green-50">
                            <td colSpan={2} className="px-6 py-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Capacity:</span>
                                  <span className="font-semibold text-gray-900">{table.capacity} seats</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Status:</span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    table.is_occupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Master Table:</span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    table.is_master ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {table.is_master ? '✓ Master' : 'Standard'}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'waiters' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Waiter Status</h2>
            <WaiterStatus />
          </>
        )}

        {activeTab === 'reports' && (
          <Reports orders={orders} payments={payments} dishes={dishes} />
        )}

        {activeTab === 'offline-orders' && (
          <>
            <div className="mb-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Offline Orders
                </h1>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isOnline ? '🟢 Online' : '🔴 Offline'}
                  </span>
                  {!isOnline && offlineOrders.length > 0 && (
                    <button
                      onClick={syncOfflineOrders}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all"
                    >
                      Sync Orders ({offlineOrders.length})
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Create and manage orders offline. Orders will automatically sync to the database when internet is available.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu Section */}
              <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Menu Items</h2>
                
                {/* Search Bar */}
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
                    <p className="text-gray-500">
                      {isOnline ? 'Loading menu items...' : 'No menu items available offline. Please go online to load menu items.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {dishes
                      .filter(d => d.is_available)
                      .filter(d => d.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) || d.category.toLowerCase().includes(menuSearchTerm.toLowerCase()))
                      .map((dish) => (
                      <div
                        key={dish.id}
                        onClick={() => addToCart(dish)}
                        className="flex items-center gap-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-3 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                      >
                        {/* Show image only when online */}
                        {isOnline && dish.image_url && (
                          <div className="w-16 h-16 bg-white rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        {!isOnline && (
                          <div className="w-16 h-16 bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
                            <Utensils className="w-8 h-8 text-green-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{dish.name}</h3>
                          <p className="text-xs text-gray-600 mb-1 truncate">{dish.category}</p>
                          <p className="text-lg font-bold text-green-600">₹{dish.price.toFixed(2)}</p>
                        </div>
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Section */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 animate-fade-in h-fit">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Cart ({offlineCart.length} items)</h2>
                
                {/* Table Selection */}
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
                  {tables.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {isOnline ? 'Loading tables...' : 'No tables available offline. Please go online to load tables.'}
                    </p>
                  )}
                </div>

                {/* Customer Name */}
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

                {/* Cart Items */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
                  {offlineCart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Cart is empty</p>
                  ) : (
                    offlineCart.map((item) => (
                      <div key={item.dish_id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                          <p className="text-sm text-green-600">₹{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(item.dish_id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.dish_id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total and Create Bill */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-green-600">₹{getCartTotal().toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCreateBill}
                    disabled={offlineCart.length === 0 || !selectedTable}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Bill
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Orders List */}
            <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Offline Orders ({offlineOrders.length})</h2>
              {offlineOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No offline orders pending</p>
              ) : (
                <div className="space-y-4">
                  {offlineOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">Order OFF-{order.id}</p>
                          <p className="text-sm text-gray-600">
                            Table: {tables.find(t => t.id === order.table_id)?.table_number || 'N/A'} • 
                            Customer: {order.customer_name || 'Guest'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">₹{order.total_amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{order.order_items?.length} items</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => printOfflineBill(order)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                        >
                          Print Bill
                        </button>
                        <button
                          onClick={() => deleteOfflineOrder(order.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      </div>

      {/* Bill Preview Modal */}
      {showBillPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Bill Preview
            </h2>
            
            {/* Bill Details */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Table:</span>
                  <span className="font-semibold">Table {tables.find(t => t.id === selectedTable)?.table_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold">{customerName || 'Guest'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              {offlineCart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items in cart</p>
              ) : (
                offlineCart.map((item) => (
                  <div key={item.dish_id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                    </div>
                    <span className="font-bold text-green-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Discount Section */}
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Discount</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setBillDiscountType('amount')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    billDiscountType === 'amount' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-white text-gray-700 border-2 border-green-200'
                  }`}
                >
                  Amount
                </button>
                <button
                  onClick={() => setBillDiscountType('percentage')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    billDiscountType === 'percentage' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-white text-gray-700 border-2 border-green-200'
                  }`}
                >
                  Percentage
                </button>
              </div>
              {billDiscountType === 'amount' ? (
                <input
                  type="number"
                  placeholder="Enter discount amount (₹)"
                  value={billDiscountAmount}
                  onChange={(e) => setBillDiscountAmount(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none"
                />
              ) : (
                <input
                  type="number"
                  placeholder="Enter discount percentage (%)"
                  value={billDiscountPercentage}
                  onChange={(e) => setBillDiscountPercentage(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none"
                />
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">₹{getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount:</span>
                <span className="font-semibold text-red-600">
                  -₹{(getCartTotal() - calculateBillTotal()).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold border-t border-gray-200 pt-2">
                <span>Grand Total:</span>
                <span className="text-green-600">₹{calculateBillTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBillPreview(false)
                  setBillDiscountAmount('')
                  setBillDiscountPercentage('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintBill}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dish Modal */}
      {showDishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {editingDish ? 'Edit Dish' : 'Add New Dish'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dish Name</label>
                <input
                  type="text"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter dish name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter dish description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                <input
                  type="number"
                  value={dishForm.price}
                  onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter price"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={dishForm.category}
                  onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select category</option>
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL (optional)</label>
                <input
                  type="text"
                  value={dishForm.image_url}
                  onChange={(e) => setDishForm({ ...dishForm, image_url: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter image URL"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={dishForm.is_available}
                  onChange={(e) => setDishForm({ ...dishForm, is_available: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="isAvailable" className="text-sm font-semibold text-gray-700">Available</label>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowDishModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDish}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {editingDish ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {editingTable ? 'Edit Table' : 'Add New Table'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Table Number</label>
                <input
                  type="number"
                  value={tableForm.table_number}
                  onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter table number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
                <input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter capacity"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTable}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {editingTable ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Orders Modal */}
      {showTableOrders && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Table Orders
              </h2>
              <button
                onClick={() => setShowTableOrders(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {selectedTableOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active orders for this table
              </div>
            ) : (
              <div className="space-y-4">
                {selectedTableOrders.map((order) => (
                  <div key={order.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">Order #{formatOrderId(order.id)}</p>
                        <p className="text-sm text-gray-600">Waiter: {order.users?.name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'paid' ? 'bg-green-100 text-green-800' :
                        order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="p-4">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Item</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Qty</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase">Price</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {order.order_items?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-green-50">
                              <td className="px-4 py-2 text-sm font-semibold text-gray-900">{item.dishes?.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {item.quantity}
                                {item.dish_type && (
                                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                    {item.dish_type}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700">Total Amount:</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          ₹{order.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing Modal */}
      {selectedOrderForBilling && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div id="bill-modal" className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto text-center">
            <div className="flex justify-between items-center mb-6 no-print">
              <h2 className="text-2xl font-bold text-green-700">
                Print Bill
              </h2>
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-green-300 rounded-xl p-6 bg-white shadow-lg">
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-green-300">
                <h1 className="text-3xl font-bold text-green-700 mb-1">
                  Galaxy Garden
                </h1>
                <p className="text-sm font-semibold text-gray-700 mb-1">Restaurant & Bar</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>123, Main Street, City, State - 123456</p>
                  <p>Phone: +91 98765 43210</p>
                  <p>GSTIN: 29ABCDE1234F1Z5</p>
                </div>
                <p className="text-sm font-bold text-green-700 mt-3 border-t border-dashed border-green-300 pt-2">BILL / INVOICE</p>
              </div>

              {/* Print-only header with hotel details */}
              <div className="print-only text-center mb-2 pb-2 border-b border-dashed border-black">
                <h1 className="text-sm font-bold text-black mb-1 uppercase tracking-wide">GALAXY GARDEN</h1>
                <p className="text-xs font-semibold text-black mb-1">Restaurant & Bar</p>
                <p className="text-xs text-black mb-1">123, Main Street, City, State - 123456</p>
                <p className="text-xs text-black mb-1">Phone: +91 98765 43210</p>
                <p className="text-xs text-black mb-1">GSTIN: 29ABCDE1234F1Z5</p>
                <p className="text-xs font-bold text-black mt-2 border-t border-dashed border-black pt-2 uppercase">BILL / INVOICE</p>
              </div>

              {/* Print-only order details */}
              <div className="print-only mb-2 pb-2 border-b border-dashed border-black">
                <div className="flex justify-between text-xs text-black">
                  <span>Bill No: {formatOrderId(selectedOrderForBilling.id)}</span>
                  <span>Date: {new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs text-black mt-1">
                  <span>Time: {new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}</span>
                  <span>Table: {selectedOrderForBilling.tables?.table_number}</span>
                </div>
                <div className="flex justify-between text-xs text-black mt-1">
                  <span>Waiter: {selectedOrderForBilling.users?.name}</span>
                  <span>Customer: {selectedOrderForBilling.customer_name || 'Guest'}</span>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl no-print border border-green-200">
                <div>
                  <p className="text-sm font-semibold text-green-800">Bill No</p>
                  <p className="text-lg font-bold text-green-900">{formatOrderId(selectedOrderForBilling.id)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Date</p>
                  <p className="text-lg font-bold text-green-900">{new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Table</p>
                  <p className="text-lg font-bold text-green-900">Table {selectedOrderForBilling.tables?.table_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Waiter</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBilling.users?.name}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-500 to-emerald-500">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase w-1/2">Item</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white uppercase w-16">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-white uppercase w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-100">
                    {selectedOrderForBilling.order_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-900 truncate">{item.dishes?.name}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-right font-bold text-green-700">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Print-only items table */}
              <div className="print-only mb-2">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-bold text-black uppercase">Item</th>
                      <th className="text-center text-xs font-bold text-black uppercase">Qty</th>
                      <th className="text-right text-xs font-bold text-black uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderForBilling.order_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="text-xs text-black">{item.dishes?.name}</td>
                        <td className="text-xs text-center text-black">{item.quantity}</td>
                        <td className="text-xs text-right text-black">{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Discount Section (no-print) */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl no-print border border-green-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                  <label className="text-sm font-semibold text-green-800">Discount Type:</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setDiscountType('amount')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        discountType === 'amount'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                          : 'bg-white text-green-700 border-2 border-green-300 hover:border-green-500'
                      }`}
                    >
                      Amount (₹)
                    </button>
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        discountType === 'percentage'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                          : 'bg-white text-green-700 border-2 border-green-300 hover:border-green-500'
                      }`}
                    >
                      Percentage (%)
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {discountType === 'amount' ? (
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => {
                        setDiscountAmount(e.target.value)
                        setDiscountPercentage('')
                      }}
                      className="flex-1 px-3 py-2 border-2 border-green-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-green-400 text-sm"
                      placeholder="Enter discount amount in ₹"
                    />
                  ) : (
                    <input
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => {
                        setDiscountPercentage(e.target.value)
                        setDiscountAmount('')
                      }}
                      className="flex-1 px-3 py-2 border-2 border-green-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-green-400 text-sm"
                      placeholder="Enter discount percentage"
                    />
                  )}
                </div>
              </div>

              {/* Order Details (for screen view) */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl no-print border border-green-200">
                <div>
                  <p className="text-sm font-semibold text-green-800">Table</p>
                  <p className="text-lg font-bold text-green-900">Table {selectedOrderForBilling.tables?.table_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Waiter</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBilling.users?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Customer</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBilling.customer_name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Date</p>
                  <p className="text-lg font-bold text-green-900">{new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t-2 border-green-300 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-700">Subtotal</span>
                  <span className="text-xl font-bold text-green-900">₹{selectedOrderForBilling.total_amount.toFixed(2)}</span>
                </div>
                {calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-700">
                      Discount ({discountType === 'amount' ? '₹' : '%'}{discountType === 'amount' ? discountAmount : discountPercentage})
                    </span>
                    <span className="text-xl font-bold text-red-600">
                      -₹{calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t-2 border-green-300 pt-3">
                  <span className="text-xl font-bold text-green-900">GRAND TOTAL</span>
                  <span className="text-3xl font-bold text-green-700">
                    ₹{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Print-only totals */}
              <div className="print-only mb-2 pb-2 border-t border-dashed border-black">
                <div className="flex justify-between text-xs text-black mt-2">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrderForBilling.total_amount.toFixed(2)}</span>
                </div>
                {calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 && (
                  <div className="flex justify-between text-xs text-black mt-1">
                    <span>Discount ({discountType === 'amount' ? '₹' : '%'}{discountType === 'amount' ? discountAmount : discountPercentage}):</span>
                    <span>-₹{calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-black mt-2 pt-2 border-t border-dashed border-black">
                  <span>GRAND TOTAL:</span>
                  <span>₹{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Thank You Message (print only) */}
              <div className="text-center print-only mt-4">
                <div className="border-t-2 border-dashed border-black mt-6 pt-4">
                  <p className="text-sm font-bold text-black uppercase">Thank You for Dining With Us!</p>
                  <p className="text-xs text-black mt-1 uppercase">Visit Us Again</p>
                  <div className="border-t border-dashed border-black mt-3 pt-3">
                    <p className="text-xs text-black uppercase">Developed by onethynk techmedia</p>
                  </div>
                </div>
                <div className="mt-6">
                  &nbsp;
                </div>
              </div>
            </div>

            <div className="flex gap-3 no-print mt-6">
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="flex-1 px-6 py-3 border-2 border-green-300 text-green-700 rounded-xl font-semibold hover:bg-green-50 transition-all duration-300"
              >
                Close
              </button>
              <button
                onClick={handleThermalPrint}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                Print Bill
              </button>
              <button
                onClick={() => handleMarkAsPaid(selectedOrderForBilling)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
