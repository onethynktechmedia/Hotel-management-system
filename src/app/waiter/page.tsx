'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/db'
import { User, Order, Dish, Table, CartItem } from '@/types'
import { LogOut, ShoppingCart, Plus, Minus, ArrowLeft, Users, Clock, CheckCircle, X, Crown, RefreshCw, Printer, RotateCcw, History } from 'lucide-react'

type Step = 'tables' | 'order-options' | 'dishes' | 'cart' | 'success' | 'master' | 'alter-table' | 'master-station-detail' | 'repeat-order' | 'bill-preview' | 'previous-orders'

// Utility function to format order ID as GGR-XXX
const formatOrderId = (orderId: string) => {
  // Extract a number from the UUID and format it
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1 // Ensure it's between 1-999
  return `GGR-${String(orderNumber).padStart(3, '0')}`
}

export default function WaiterPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [currentStep, setCurrentStep] = useState<Step>('tables')
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)
  const [alteringOrder, setAlteringOrder] = useState<Order | null>(null)
  const [newTableId, setNewTableId] = useState<string | null>(null)
  const [selectedMasterTable, setSelectedMasterTable] = useState<Table | null>(null)
  const [masterTableCart, setMasterTableCart] = useState<CartItem[]>([])
  const [confirmingOrder, setConfirmingOrder] = useState(false)
  const [viewingOrderItems, setViewingOrderItems] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [addingItem, setAddingItem] = useState(false)
  const [selectedDishTypes, setSelectedDishTypes] = useState<{[key: string]: string}>({})
  const [repeatingOrder, setRepeatingOrder] = useState<Order | null>(null)
  const [repeatOrderCart, setRepeatOrderCart] = useState<CartItem[]>([])
  const [viewingBill, setViewingBill] = useState<Order | null>(null)
  const [billOrderItems, setBillOrderItems] = useState<any[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [tableOrders, setTableOrders] = useState<Order[]>([])
  const [selectedItemsToRepeat, setSelectedItemsToRepeat] = useState<any[]>([])

  const dishTypes = ['Normal', 'Medium', 'Spicy', 'Extra Spicy']

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'waiter') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    fetchData()
    
    const subscription = supabase
      .channel('tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload) => {
        fetchData()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const fetchData = async () => {
    try {
      const [dishesRes, tablesRes, ordersRes] = await Promise.all([
        fetch('/api/dishes').then(res => res.json()),
        fetch('/api/tables').then(res => res.json()),
        fetch('/api/orders').then(res => res.json())
      ])

      setDishes(dishesRes || [])
      setTables(tablesRes || [])
      
      // Filter orders: show recent orders (last 1 hour) OR active orders for occupied tables
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const filteredOrders = (ordersRes || []).filter((order: Order) => {
        const isRecent = new Date(order.created_at) > oneHourAgo
        const isActive = !['paid', 'completed'].includes(order.status)
        return isRecent || isActive
      })
      
      // Remove duplicate orders by ID
      const uniqueOrders = filteredOrders.filter((order: Order, index: number, self: Order[]) => 
        index === self.findIndex((o: Order) => o.id === order.id)
      )
      
      setOrders(uniqueOrders)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableSelect = async (table: Table) => {
    setSelectedTable(table)
    
    if (table.is_occupied) {
      // Find the active order for this table
      const tableOrder = orders.find(o => o.table_id === table.id && !['paid', 'completed'].includes(o.status))
      if (tableOrder) {
        handleViewBill(tableOrder)
      } else {
        alert('No active order found for this table.')
      }
      return
    }
    setCurrentStep('dishes')
  }

  const handleBackToTables = () => {
    setSelectedTable(null)
    setCart([])
    setTableOrders([])
    setCustomerName('')
    setCustomerMobile('')
    setSelectedItemsToRepeat([])
    setCurrentStep('tables')
  }

  const handleNewOrder = () => {
    setCart([])
    setCustomerName('')
    setCustomerMobile('')
    setCurrentStep('dishes')
  }

  const handleViewPreviousOrders = () => {
    setSelectedItemsToRepeat([])
    setCurrentStep('previous-orders')
  }

  const toggleItemSelection = (item: any) => {
    setSelectedItemsToRepeat(prev => {
      const exists = prev.find(i => i.id === item.id)
      if (exists) {
        return prev.filter(i => i.id !== item.id)
      } else {
        return [...prev, item]
      }
    })
  }

  const handleRepeatOrder = async (order: Order) => {
    // Only use selected items - must select at least one
    const itemsToUse = selectedItemsToRepeat
    
    if (itemsToUse.length === 0) {
      alert('Please select at least one item to repeat')
      return
    }
    
    const cartItems: CartItem[] = itemsToUse.map(item => ({
      dish_id: item.dish_id,
      name: item.dishes?.name || 'Unknown',
      price: item.price,
      quantity: item.quantity,
      image_url: item.dishes?.image_url || null,
      dish_type: item.dish_type || 'Normal'
    }))
    
    // Submit the repeated order immediately
    setSubmitting(true)
    try {
      console.log('Submitting repeated order for table:', selectedTable?.id)
      console.log('Cart items:', cartItems)

      // Create order via API
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable?.id,
          waiter_id: user?.id,
          status: 'pending',
          total_amount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          customer_name: customerName || null,
          customer_mobile: customerMobile || null
        })
      })

      if (!orderResponse.ok) {
        throw new Error('Failed to create order')
      }

      const orderData = await orderResponse.json()
      console.log('Order created:', orderData)

      // Create order items via API
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price,
        status: 'pending',
        dish_type: item.dish_type || 'Normal'
      }))

      const itemsResponse = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderItems)
      })

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json()
        console.error('Order items API error:', errorData)
        throw new Error(errorData.error || 'Failed to create order items')
      }

      console.log('Order items created via API')

      // Update table status to occupied via API
      const tableResponse = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTable?.id, is_occupied: true })
      })

      if (!tableResponse.ok) {
        console.error('Table update failed')
        throw new Error('Failed to update table status')
      }

      console.log('Table updated to occupied')

      // Create notification for kitchen via API
      const notificationResponse = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          order_id: orderData.id,
          type: 'new_order',
          message: `Repeated order for Table ${selectedTable?.table_number}`,
          is_read: false
        })
      })

      if (!notificationResponse.ok) {
        console.error('Notification creation failed, but continuing...')
      } else {
        console.log('Notification created via API')
      }

      setCurrentStep('success')
      setCart([])
      setSelectedItemsToRepeat([])
      setSelectedTable(null)
      setCustomerName('')
      setCustomerMobile('')
      
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error submitting repeated order:', error)
      alert('Failed to submit repeated order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const addToCart = (dish: Dish, dishType: string = 'Normal') => {
    const existingItem = cart.find(item => item.dish_id === dish.id && item.dish_type === dishType)
    if (existingItem) {
      setCart(cart.map(item => 
        item.dish_id === dish.id && item.dish_type === dishType
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        dish_id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        image_url: dish.image_url,
        dish_type: dishType
      }])
    }
  }

  const removeFromCart = (dishId: string, dishType: string = 'Normal') => {
    setCart(cart.filter(item => !(item.dish_id === dishId && item.dish_type === dishType)))
  }

  const updateQuantity = (dishId: string, delta: number, dishType: string = 'Normal') => {
    setCart(cart.map(item => {
      if (item.dish_id === dishId && item.dish_type === dishType) {
        const newQuantity = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to your cart')
      return
    }

    setSubmitting(true)
    try {
      console.log('Submitting order for table:', selectedTable?.id)
      console.log('Cart items:', cart)

      // Create order via API to avoid CORS
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable?.id,
          waiter_id: user?.id,
          status: 'pending',
          total_amount: getCartTotal(),
          customer_name: customerName || null,
          customer_mobile: customerMobile || null
        })
      })

      if (!orderResponse.ok) {
        throw new Error('Failed to create order')
      }

      const orderData = await orderResponse.json()
      console.log('Order created:', orderData)

      // Create order items via API
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price,
        status: 'pending',
        dish_type: item.dish_type || 'Normal'
      }))

      // Use API to create order items instead of direct Supabase
      const itemsResponse = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderItems)
      })

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json()
        console.error('Order items API error:', errorData)
        throw new Error(errorData.error || 'Failed to create order items')
      }

      console.log('Order items created via API')

      // Update table status to occupied via API to avoid CORS
      const tableResponse = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTable?.id, is_occupied: true })
      })

      if (!tableResponse.ok) {
        console.error('Table update failed')
        throw new Error('Failed to update table status')
      }

      console.log('Table updated to occupied')

      // Create notification for kitchen via API
      const notificationResponse = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          order_id: orderData.id,
          type: 'new_order',
          message: `New order for Table ${selectedTable?.table_number}`,
          is_read: false
        })
      })

      if (!notificationResponse.ok) {
        console.error('Notification creation failed, but continuing...')
      } else {
        console.log('Notification created via API')
      }

      setCurrentStep('success')
      setCart([])
      setSelectedTable(null)
      setCustomerName('')
      setCustomerMobile('')
      
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error submitting order:', error)
      alert('Failed to submit order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleCreateMasterTable = async (tableNumber: number, capacity: number) => {
    try {
      // Find the table by table_number
      const table = tables.find(t => t.table_number === tableNumber)
      if (!table) {
        alert('Table not found')
        return
      }

      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: table.id,
          is_master: true
        })
      })

      if (!response.ok) throw new Error('Failed to convert table to master')

      await fetchData()
      alert(`Table ${tableNumber} converted to master table successfully!`)
    } catch (error) {
      console.error('Error converting table to master:', error)
      alert('Failed to convert table to master')
    }
  }

  const handleSelectMasterTableNumber = (number: number) => {
    handleCreateMasterTable(number, 10)
  }

  const handleAlterTable = async () => {
    if (!alteringOrder || !newTableId) {
      alert('Please select a new table')
      return
    }

    try {
      const response = await fetch('/api/orders/alter-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: alteringOrder.id,
          new_table_id: newTableId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to alter table')
      }

      await fetchData()
      setAlteringOrder(null)
      setNewTableId(null)
      setCurrentStep('tables')
      alert('Table changed successfully!')
    } catch (error) {
      console.error('Error altering table:', error)
      alert('Failed to change table. Please try again.')
    }
  }

  const handleStartAlterTable = (order: Order) => {
    setAlteringOrder(order)
    setNewTableId(null)
    setCurrentStep('alter-table')
  }

  const handleViewMasterTableOrders = (table: Table) => {
    setSelectedMasterTable(table)
  }

  const handleConfirmOrder = async (orderId: string) => {
    setConfirmingOrder(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      })

      if (!response.ok) {
        throw new Error('Failed to confirm order')
      }

      await fetchData()
      alert('Order confirmed and sent to kitchen!')
    } catch (error) {
      console.error('Error confirming order:', error)
      alert('Failed to confirm order. Please try again.')
    } finally {
      setConfirmingOrder(false)
    }
  }

  const getTableOrders = (tableId: string) => {
    const tableOrders = orders.filter(o => o.table_id === tableId && !['paid', 'completed'].includes(o.status))
    // Remove duplicate orders by ID
    return tableOrders.filter((order: Order, index: number, self: Order[]) => 
      index === self.findIndex((o: Order) => o.id === order.id)
    )
  }

  const handleViewOrderItems = async (order: Order) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/items`)
      if (!response.ok) throw new Error('Failed to fetch order items')
      const items = await response.json()
      setOrderItems(items)
      
      // Fetch updated order to get current total
      const orderResponse = await fetch(`/api/orders`)
      const allOrders = await orderResponse.json()
      const updatedOrder = allOrders.find((o: Order) => o.id === order.id)
      
      setViewingOrderItems(updatedOrder || order)
    } catch (error) {
      console.error('Error fetching order items:', error)
      alert('Failed to fetch order items')
    }
  }

  const handleAddItemToOrder = async (dishId: string, quantity: number = 1) => {
    if (!viewingOrderItems) return

    setAddingItem(true)
    try {
      const dish = dishes.find(d => d.id === dishId)
      if (!dish) return

      const response = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: viewingOrderItems.id,
          dish_id: dishId,
          quantity: quantity,
          price: dish.price,
          status: 'pending',
          dish_type: selectedDishTypes[dishId] || 'Normal'
        })
      })

      if (!response.ok) throw new Error('Failed to add item')

      // Recalculate total from all items
      const itemsResponse = await fetch(`/api/orders/${viewingOrderItems.id}/items`)
      const allItems = await itemsResponse.json()
      const newTotal = allItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

      // Update order total
      const updateResponse = await fetch(`/api/orders/${viewingOrderItems.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: newTotal
        })
      })

      if (updateResponse.ok) {
        const updatedOrder = await updateResponse.json()
        setViewingOrderItems(updatedOrder)
        setOrderItems(allItems)
      }

      await fetchData()
      alert('Item added successfully!')
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const handleDeleteOrderItem = async (itemId: string) => {
    if (!viewingOrderItems) return

    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await fetch(`/api/order-items/${itemId}`, {
        method: 'DELETE'
      })

      // Recalculate total from remaining items
      const itemsResponse = await fetch(`/api/orders/${viewingOrderItems.id}/items`)
      const allItems = await itemsResponse.json()
      const newTotal = allItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

      // Update order total
      const updateResponse = await fetch(`/api/orders/${viewingOrderItems.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: newTotal
        })
      })

      if (updateResponse.ok) {
        const updatedOrder = await updateResponse.json()
        setViewingOrderItems(updatedOrder)
        setOrderItems(allItems)
      }

      await fetchData()
      alert('Item deleted successfully!')
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete order')
      }

      await fetchData()
      alert('Order deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting order:', error)
      alert(`Failed to delete order: ${error.message}`)
    }
  }

  const handleDeleteMasterTable = async (tableId: string, tableNumber: number) => {
    const table = tables.find(t => t.id === tableId)
    
    const message = table?.is_occupied 
      ? `Table ${tableNumber} is currently occupied. This will delete the master table and all associated orders. Are you sure you want to proceed?`
      : `This will delete Master Table ${tableNumber} and all associated orders. Are you sure you want to proceed?`

    if (!confirm(message)) return

    try {
      // Get all orders for this table
      const ordersResponse = await fetch(`/api/orders`)
      const allOrders = await ordersResponse.json()
      const tableOrders = allOrders.filter((o: any) => o.table_id === tableId)

      // Delete all orders
      for (const order of tableOrders) {
        await fetch(`/api/orders?id=${order.id}`, {
          method: 'DELETE'
        })
      }

      // Delete the table
      const response = await fetch(`/api/tables?id=${tableId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete table')

      await fetchData()
      alert(`Master Table ${tableNumber} deleted successfully!`)
    } catch (error) {
      console.error('Error deleting master table:', error)
      alert('Failed to delete master table')
    }
  }

  const handleDeleteTable = async (tableId: string, tableNumber: number) => {
    const table = tables.find(t => t.id === tableId)
    
    const message = table?.is_occupied 
      ? `Table ${tableNumber} is currently occupied. Deleting it will also delete all associated orders. Are you sure you want to proceed?`
      : `Are you sure you want to delete Table ${tableNumber}? This action cannot be undone.`

    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/tables?id=${tableId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete table')

      await fetchData()
      alert(`Table ${tableNumber} deleted successfully!`)
    } catch (error) {
      console.error('Error deleting table:', error)
      alert('Failed to delete table')
    }
  }

  const handleStartRepeatOrder = async (order: Order) => {
    setSelectedTable(order.tables || null)
    setRepeatingOrder(order)
    
    // Fetch orders for this table
    try {
      const { data: tableOrdersData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            dishes (*)
          )
        `)
        .eq('table_id', order.table_id)
        .in('status', ['pending', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false })
      
      setTableOrders(tableOrdersData || [])
      setCurrentStep('order-options')
    } catch (error) {
      console.error('Error fetching table orders:', error)
      alert('Failed to fetch table orders')
    }
  }

  const handleAddToRepeatOrderCart = (dish: Dish) => {
    setRepeatOrderCart(prev => {
      const existing = prev.find(item => item.dish_id === dish.id)
      if (existing) {
        return prev.map(item => 
          item.dish_id === dish.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { 
        dish_id: dish.id, 
        name: dish.name, 
        price: dish.price, 
        image_url: dish.image_url, 
        quantity: 1,
        dish_type: 'Normal'
      }]
    })
  }

  const handleRemoveFromRepeatOrderCart = (dishId: string) => {
    setRepeatOrderCart(prev => prev.filter(item => item.dish_id !== dishId))
  }

  const handleUpdateRepeatOrderCartQuantity = (dishId: string, delta: number) => {
    setRepeatOrderCart(prev => prev.map(item => {
      if (item.dish_id === dishId) {
        const newQuantity = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const handleSubmitRepeatOrder = async () => {
    if (!repeatingOrder || repeatOrderCart.length === 0) {
      alert('Please add items to cart first')
      return
    }

    setSubmitting(true)
    try {
      // Add items to existing order
      for (const item of repeatOrderCart) {
        await fetch('/api/order-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: repeatingOrder.id,
            dish_id: item.dish_id,
            quantity: item.quantity,
            price: item.price,
            status: 'pending',
            dish_type: item.dish_type || 'Normal'
          })
        })
      }

      // Recalculate total
      const itemsResponse = await fetch(`/api/orders/${repeatingOrder.id}/items`)
      const allItems = await itemsResponse.json()
      const newTotal = allItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

      // Update order total
      await fetch(`/api/orders/${repeatingOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: newTotal
        })
      })

      // Create notification for kitchen with extra order indicator
      await supabase
        .from('notifications')
        .insert({
          user_id: user?.id,
          order_id: repeatingOrder.id,
          type: 'new_order',
          message: `🔔 EXTRA ORDER for Table ${repeatingOrder.tables?.table_number} - Additional items added`,
          is_read: false
        })

      setRepeatOrderCart([])
      setRepeatingOrder(null)
      setCurrentStep('tables')
      await fetchData()
      alert('Repeat order submitted successfully! Kitchen has been notified.')
    } catch (error) {
      console.error('Error submitting repeat order:', error)
      alert('Failed to submit repeat order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewBill = async (order: Order) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/items`)
      if (!response.ok) throw new Error('Failed to fetch order items')
      const items = await response.json()
      setBillOrderItems(items)
      setViewingBill(order)
      setCurrentStep('bill-preview')
    } catch (error) {
      console.error('Error fetching bill:', error)
      alert('Failed to fetch bill')
    }
  }

  const generateESCPOSBill = () => {
    if (!viewingBill) return ''
    
    let escpos = ''
    
    // Initialize printer
    escpos += '\x1B\x40' // Initialize
    escpos += '\x1B\x61\x01' // Center align
    
    // Header - Double height, double width
    escpos += '\x1D\x21\x11' // Double height, double width
    escpos += 'GGR RESTAURANT\n'
    escpos += '\x1D\x21\x00' // Normal size
    
    escpos += '====================\n'
    escpos += '\x1B\x61\x00' // Left align
    
    // Order details
    escpos += `Order #: ${formatOrderId(viewingBill.id)}\n`
    escpos += `Table: ${viewingBill.tables?.table_number}\n`
    escpos += `Date: ${new Date(viewingBill.created_at).toLocaleString()}\n`
    escpos += `Waiter: ${viewingBill.users?.name}\n`
    escpos += '====================\n'
    
    // Items
    escpos += '\x1B\x61\x01' // Center align
    escpos += 'ITEMS\n'
    escpos += '====================\n'
    escpos += '\x1B\x61\x00' // Left align
    
    billOrderItems.forEach((item) => {
      escpos += `${item.dishes?.name || item.dish?.name}\n`
      escpos += `  Qty: ${item.quantity} x ₹${item.price.toFixed(2)}\n`
      if (item.dish_type) {
        escpos += `  Type: ${item.dish_type}\n`
      }
      escpos += `  Total: ₹${(item.price * item.quantity).toFixed(2)}\n`
      escpos += '--------------------\n'
    })
    
    // Total
    escpos += '\x1B\x61\x01' // Center align
    escpos += '====================\n'
    escpos += '\x1B\x61\x00' // Left align
    escpos += '\x1D\x21\x11' // Double height, double width
    escpos += `TOTAL: ₹${viewingBill.total_amount.toFixed(2)}\n`
    escpos += '\x1D\x21\x00' // Normal size
    escpos += '====================\n'
    escpos += '\x1B\x61\x01' // Center align
    escpos += 'Thank you for dining!\n'
    escpos += '====================\n'
    escpos += 'Developed by onethynk techmedia\n'
    escpos += '====================\n'
    escpos += '\n' // Blank line at the end for proper printing
    
    // Cut paper
    escpos += '\x1D\x56\x00' // Cut paper
    
    return escpos
  }

  const handleThermalPrint = async () => {
    if (!viewingBill) return
    
    try {
      // Generate properly formatted plain text bill content for thermal printer
      // 58mm paper width = approximately 32-35 characters per line
      const plainText = `
<strong class="header">GALAXY GARDEN</strong><br>
Restaurant & Bar<br>
================================<br>
123, Main Street<br>
City, State - 123456<br>
Phone: +91 98765 43210<br>
================================<br>
BILL / INVOICE<br>
================================<br>
<br>
Bill No: ${formatOrderId(viewingBill.id)}<br>
Date: ${new Date(viewingBill.created_at).toLocaleDateString()}<br>
Time: ${new Date(viewingBill.created_at).toLocaleTimeString()}<br>
Table: ${viewingBill.tables?.table_number}<br>
Waiter: ${viewingBill.users?.name}<br>
Customer: ${viewingBill.customer_name || 'Guest'}<br>
--------------------------------<br>
ITEM             QTY  AMOUNT<br>
--------------------------------<br>
${viewingBill.order_items?.map((item: any) => {
  const name = item.dishes?.name || 'Unknown'
  const qty = item.quantity
  const price = (item.dishes?.price || item.price || 0)
  const total = (price * qty).toFixed(2)
  const itemName = name.length > 16 ? name.substring(0, 15) + '.' : name
  return `${itemName.padEnd(16)} ${qty.toString().padStart(2)}  ${total.padStart(8)}<br>`
}).join('')}
--------------------------------<br>
================================<br>
<strong class="grand-total">*** GRAND TOTAL: Rs${viewingBill.total_amount.toFixed(2)} ***</strong><br>
================================<br>
Thank You for Dining!<br>
Visit Us Again<br>
================================<br>
<span class="developer">Developed by onethynk techmedia</span><br>
================================
`
      
      console.log('Bill content generated')
      
      // Use browser print directly (works on all platforms including Vercel)
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
                  font-size: 14px;
                  font-weight: bold;
                  line-height: 1.4;
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
                  margin-bottom: 2mm;
                  display: block;
                }
                .grand-total {
                  font-size: 18px;
                  font-weight: 900;
                  margin: 2mm 0;
                  display: block;
                }
                .developer {
                  font-size: 8px;
                  font-weight: normal;
                  margin-top: 2mm;
                  display: block;
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
    } catch (error) {
      console.error('Printing failed:', error)
      alert('Printing failed: ' + (error as Error).message)
    }
  }

  const handleInitializeTables = async () => {
    if (!confirm('This will create 8 tables (Table 1-8) with 4 seats each. Continue?')) return

    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialize: true })
      })

      if (!response.ok) throw new Error('Failed to initialize tables')

      await fetchData()
      alert('Tables initialized successfully!')
    } catch (error) {
      console.error('Error initializing tables:', error)
      alert('Failed to initialize tables')
    }
  }

  const handleSelectMasterTable = (table: Table) => {
    setSelectedMasterTable(table)
    setMasterTableCart([])
    setCurrentStep('master-station-detail')
  }

  const handleAddToMasterTableCart = (dish: Dish) => {
    setMasterTableCart(prev => {
      const existing = prev.find(item => item.dish_id === dish.id)
      if (existing) {
        return prev.map(item => 
          item.dish_id === dish.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { 
        dish_id: dish.id, 
        name: dish.name, 
        price: dish.price, 
        image_url: dish.image_url, 
        quantity: 1 
      }]
    })
  }

  const handleRemoveFromMasterTableCart = (dishId: string) => {
    setMasterTableCart(prev => prev.filter(item => item.dish_id !== dishId))
  }

  const handleUpdateMasterTableCartQuantity = (dishId: string, delta: number) => {
    setMasterTableCart(prev => prev.map(item => {
      if (item.dish_id === dishId) {
        const newQuantity = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const handleSubmitMasterTableOrder = async () => {
    if (!selectedMasterTable || masterTableCart.length === 0) {
      alert('Please add items to cart first')
      return
    }

    setSubmitting(true)
    try {
      const total_amount = masterTableCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      // Use the actual master table ID
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedMasterTable.id,
          waiter_id: user?.id,
          total_amount,
          status: 'pending'
        })
      })

      if (!orderResponse.ok) throw new Error('Failed to create order')

      const order = await orderResponse.json()

      // Add order items
      for (const item of masterTableCart) {
        await fetch('/api/order-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            dish_id: item.dish_id,
            quantity: item.quantity,
            price: item.price,
            status: 'pending',
            dish_type: item.dish_type || 'Normal'
          })
        })
      }

      // Update table as occupied
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMasterTable.id,
          is_occupied: true
        })
      })

      setMasterTableCart([])
      await fetchData()
      alert('Order submitted successfully!')
    } catch (error) {
      console.error('Error submitting order:', error)
      alert('Failed to submit order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMasterStatus = async (tableId: string, tableNumber: number) => {
    if (!confirm(`Are you sure you want to remove master status from Table ${tableNumber}?`)) return

    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tableId,
          is_master: false
        })
      })

      if (!response.ok) throw new Error('Failed to remove master status')

      await fetchData()
      alert(`Table ${tableNumber} is now a regular table!`)
    } catch (error) {
      console.error('Error removing master status:', error)
      alert('Failed to remove master status')
    }
  }

  const filteredDishes = selectedCategory === 'all' 
    ? dishes 
    : dishes.filter(dish => dish.category === selectedCategory)

  const categories = ['all', 'Starters', 'Main Course', 'Bread', 'Sides', 'Desserts', 'Beverages']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-900">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 py-3 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {currentStep !== 'tables' && (
                <button
                  onClick={handleBackToTables}
                  className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold text-sm sm:text-base">Back to Tables</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleInitializeTables}
                className="flex items-center gap-2 bg-green-800 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-900 transition-all duration-300 text-sm sm:text-base"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                Init Tables
              </button>
              <button
                onClick={() => setCurrentStep('master')}
                className="flex items-center gap-2 bg-green-800 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-900 transition-all duration-300 text-sm sm:text-base"
              >
                <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                Master Tables
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-green-800 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-900 transition-all duration-300 text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Tables Selection */}
        {currentStep === 'tables' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Select a Table</h2>
              <p className="text-gray-600">Choose an available table to start taking orders</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={`p-4 sm:p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left relative ${
                    table.is_occupied 
                      ? 'border-red-500 bg-red-50 cursor-not-allowed opacity-60' 
                      : 'border-green-500 bg-white hover:border-green-500 cursor-pointer'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTable(table.id, table.table_number)
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-300 ${
                      table.is_occupied 
                        ? 'bg-red-300 text-red-700 hover:bg-red-400' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => handleTableSelect(table)}
                    disabled={table.is_occupied}
                    className="w-full text-left"
                  >
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div className="bg-green-100 p-2 sm:p-3 rounded-xl">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                        table.is_occupied 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Table {table.table_number}</h3>
                    <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Capacity: {table.capacity} seats</p>
                    {table.is_occupied && (
                      <p className="text-xs text-red-600 font-semibold mt-2">
                        This table is currently occupied
                      </p>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* My Active Orders */}
            {orders.length > 0 && (
              <div className="mt-8 sm:mt-12">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">My Active Orders</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    // Group orders by table
                    const tableGroups = orders
                      .filter(o => o.waiter_id === user?.id && !['paid', 'completed'].includes(o.status))
                      .reduce((acc, order) => {
                        const tableId = order.table_id
                        if (!acc[tableId]) {
                          acc[tableId] = {
                            table: order.tables,
                            orders: []
                          }
                        }
                        acc[tableId].orders.push(order)
                        return acc
                      }, {} as any)
                    
                    return Object.values(tableGroups).map((group: any) => (
                      <div
                        key={group.table?.id}
                        className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-green-200 hover:border-green-400 hover:shadow-xl transition-all duration-300 text-left cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">Table {group.table?.table_number}</h4>
                            <p className="text-xs sm:text-sm text-gray-600">{group.orders.length} active order{group.orders.length > 1 ? 's' : ''}</p>
                          </div>
                          <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                          ₹{group.orders.reduce((sum: number, o: Order) => sum + o.total_amount, 0).toFixed(2)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewBill(group.orders[0])
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transition-all duration-300 text-sm"
                          >
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartRepeatOrder(group.orders[0])
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-600 transition-all duration-300 text-sm"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Repeat
                          </button>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Options Step */}
        {currentStep === 'order-options' && selectedTable && (
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => {
                setRepeatingOrder(null)
                setSelectedTable(null)
                setSelectedItemsToRepeat([])
                setCurrentStep('tables')
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Tables</span>
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Table {selectedTable.table_number} - Order Options
              </h2>
              <p className="text-gray-600">Choose how you want to proceed with this table</p>
            </div>

            {/* Order Options Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={handleNewOrder}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-500 hover:border-green-600 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center">
                    <Plus className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">New Order</h3>
                  </div>
                </div>
              </button>

              <button
                onClick={handleViewPreviousOrders}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-500 hover:border-orange-600 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center">
                    <History className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">Previous Orders</h3>
                  </div>
                </div>
              </button>
            </div>

            {/* Current Active Orders */}
            {tableOrders.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Current Orders ({tableOrders.length})
                </h3>
                <div className="space-y-3">
                  {tableOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer" onClick={() => handleViewBill(order)}>
                      <div>
                        <p className="font-bold text-gray-900">{formatOrderId(order.id)}</p>
                        <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">₹{order.total_amount.toFixed(2)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Previous Orders Step */}
        {currentStep === 'previous-orders' && selectedTable && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Previous Orders - Table {selectedTable.table_number}
              </h2>
              <p className="text-gray-600">Select an order to repeat or view details</p>
            </div>

            {tableOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Previous Orders</h3>
                <p className="text-gray-600 mb-6">This table doesn't have any active orders yet.</p>
                <button
                  onClick={handleNewOrder}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Start New Order
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tableOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-orange-200 hover:border-orange-400 transition-all duration-300">
                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{formatOrderId(order.id)}</h3>
                          <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                            ₹{order.total_amount.toFixed(2)}
                          </p>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'ready' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-gray-900">Order Items:</h4>
                        <button
                          onClick={() => {
                            const orderItemsIds = order.order_items?.map(i => i.id) || []
                            const allSelected = orderItemsIds.every(id => selectedItemsToRepeat.find(i => i.id === id))
                            if (allSelected) {
                              setSelectedItemsToRepeat(prev => prev.filter(i => !orderItemsIds.includes(i.id)))
                            } else {
                              setSelectedItemsToRepeat(prev => {
                                const newItems = order.order_items?.filter(item => !prev.find(i => i.id === item.id)) || []
                                return [...prev, ...newItems]
                              })
                            }
                          }}
                          className="text-sm text-green-600 font-semibold hover:text-green-700"
                        >
                          {order.order_items?.every(item => selectedItemsToRepeat.find(i => i.id === item.id)) ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div 
                            key={item.id} 
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                              selectedItemsToRepeat.find(i => i.id === item.id) 
                                ? 'bg-green-100 border-2 border-green-500' 
                                : 'bg-gray-50'
                            }`}
                            onClick={() => toggleItemSelection(item)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedItemsToRepeat.find(i => i.id === item.id)
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300'
                              }`}>
                                {selectedItemsToRepeat.find(i => i.id === item.id) && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              {item.dishes?.image_url && (
                                <img
                                  src={item.dishes.image_url}
                                  alt={item.dishes.name}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{item.dishes?.name || 'Unknown'}</p>
                                <p className="text-sm text-gray-600">₹{item.price.toFixed(2)} each</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">x{item.quantity}</p>
                              <p className="text-sm text-orange-600 font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedItemsToRepeat.length > 0 && (
                      <div className="p-4 bg-green-50 border-t-2 border-green-200">
                        <p className="font-semibold text-gray-900">{selectedItemsToRepeat.length} items selected</p>
                      </div>
                    )}

                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 flex gap-4">
                      <button
                        onClick={() => handleRepeatOrder(order)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Repeat Order
                      </button>
                      <button
                        onClick={() => setCurrentStep('order-options')}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Dishes Selection */}
        {currentStep === 'dishes' && selectedTable && (
          <div>
            <div className="mb-3 sm:mb-6 bg-green-100 rounded-2xl p-3 sm:p-4 border-2 border-green-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    Table {selectedTable.table_number}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">{selectedTable.capacity} seats</p>
                </div>
                <button
                  onClick={handleBackToTables}
                  className="flex items-center gap-1 bg-white text-green-600 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-green-50 transition-all duration-300 border-2 border-green-300 w-full sm:w-auto justify-center text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  Change
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-green-50 border-2 border-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All' : category}
                </button>
              ))}
            </div>

            {/* Customer Name Input */}
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Dishes List */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-20 sm:mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-bold text-gray-700 uppercase">Dish</th>
                      <th className="px-2 sm:px-3 py-1.5 text-right text-xs font-bold text-gray-700 uppercase">Price</th>
                      <th className="px-2 sm:px-3 py-1.5 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                      <th className="px-2 sm:px-3 py-1.5 text-center text-xs font-bold text-gray-700 uppercase">Add</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDishes.map((dish) => (
                      <tr key={dish.id} className="hover:bg-green-50 transition-colors">
                        <td className="px-2 sm:px-3 py-2">
                          <div className="flex flex-col">
                            <h3 className="font-bold text-gray-900 text-sm">{dish.name}</h3>
                            <span className="text-xs text-gray-500">{dish.category}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-right">
                          <p className="font-bold text-gray-900 text-sm">₹{dish.price.toFixed(2)}</p>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto ${
                            dish.is_available 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {dish.is_available ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <select
                              value={selectedDishTypes[dish.id] || 'Normal'}
                              onChange={(e) => setSelectedDishTypes({...selectedDishTypes, [dish.id]: e.target.value})}
                              className="text-xs border border-gray-300 rounded px-1 py-1 bg-white"
                            >
                              {dishTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => addToCart(dish, selectedDishTypes[dish.id] || 'Normal')}
                              disabled={!dish.is_available}
                              className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 text-xs border-2 ${
                                !dish.is_available
                                  ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                                  : cart.some(item => item.dish_id === dish.id && item.dish_type === (selectedDishTypes[dish.id] || 'Normal'))
                                    ? 'bg-white text-black border-black hover:bg-gray-100'
                                    : 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden sm:inline">Add</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-green-200 p-2 sm:p-4 z-50">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-600">{cart.length} items</p>
                    <p className="text-base sm:text-xl font-bold text-gray-900">
                      ₹{getCartTotal().toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentStep('cart')}
                    className="flex items-center gap-1 sm:gap-2 bg-green-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-green-600 transition-all duration-300 w-full sm:w-auto justify-center text-xs sm:text-sm"
                  >
                    <ShoppingCart className="w-3 h-3 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">View Cart</span>
                    <span className="sm:hidden">Cart</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Cart Review */}
        {currentStep === 'cart' && selectedTable && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 sm:mb-8 bg-green-100 rounded-2xl p-4 sm:p-6 border-2 border-green-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                    Review Order - Table {selectedTable.table_number}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">Confirm your order before sending to kitchen</p>
                </div>
                <button
                  onClick={handleBackToTables}
                  className="flex items-center gap-2 bg-white text-green-600 px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-50 transition-all duration-300 border-2 border-green-300 w-full sm:w-auto justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change Table
                </button>
              </div>
            </div>

            {/* Customer Name Input */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Customer Details</h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mobile Number (Optional - Not shown on bill)
                  </label>
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="Enter mobile number..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Order Items</h3>
              </div>

              {cart.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-500 font-semibold">Your cart is empty</p>
                  <button
                    onClick={() => setCurrentStep('dishes')}
                    className="mt-4 text-green-600 font-semibold hover:underline text-sm sm:text-base"
                  >
                    Add items to your order
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {cart.map((item) => (
                    <div key={`${item.dish_id}-${item.dish_type}`} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1 w-full">
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base">{item.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-gray-600">₹{item.price.toFixed(2)} each</p>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            {item.dish_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.dish_id, -1, item.dish_type || 'Normal')}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.dish_id, 1, item.dish_type || 'Normal')}
                            className="w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="w-20 sm:w-24 text-right font-bold text-gray-900 text-sm sm:text-base">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => removeFromCart(item.dish_id, item.dish_type || 'Normal')}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 sm:p-6 bg-green-50">
                <div className="flex justify-between items-center">
                  <span className="text-lg sm:text-xl font-bold text-gray-700">Total Amount</span>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    ₹{getCartTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setCurrentStep('dishes')}
                className="flex-1 px-4 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 text-sm sm:text-base"
              >
                Add More Items
              </button>
              <button
                onClick={submitOrder}
                disabled={cart.length === 0 || submitting}
                className="flex-1 px-4 sm:px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {submitting ? 'Submitting...' : 'Submit Order to Kitchen'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {currentStep === 'success' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Order Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your order has been sent to the kitchen. The table is now locked until payment is completed.
              </p>
              <button
                onClick={() => setCurrentStep('tables')}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-300"
              >
                Take Another Order
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Master Tables */}
        {currentStep === 'master' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Master Tables</h2>
              <p className="text-gray-600">Convert regular tables to master tables and take orders</p>
            </div>

            {/* Available Tables to Convert */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Available Tables to Convert</h3>
              {tables.filter(t => !t.is_master).length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold">No available tables to convert</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {tables.filter(t => !t.is_master).map((table) => (
                    <button
                      key={table.id}
                      onClick={() => handleCreateMasterTable(table.table_number, table.capacity)}
                      disabled={table.is_occupied}
                      className={`p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center ${
                        table.is_occupied 
                          ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60' 
                          : 'border-green-500 bg-white hover:border-purple-500 hover:bg-purple-50'
                      }`}
                    >
                      <div className="bg-green-100 p-3 rounded-xl mx-auto mb-3 w-fit">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold mb-1">Table {table.table_number}</h3>
                      <p className="text-xs text-gray-600 mb-2">Capacity: {table.capacity} seats</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        table.is_occupied 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                      </span>
                      {!table.is_occupied && (
                        <p className="text-xs text-purple-600 font-semibold mt-2">Click to convert to master</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Master Tables Grid */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Master Tables (Click to take orders)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {tables.filter(t => t.is_master).map((table) => (
                  <div
                    key={table.id}
                    className={`p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center relative ${
                      table.is_occupied 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-purple-500 bg-white hover:bg-purple-50'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteMasterTable(table.id, table.table_number)
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMasterTable(table)
                        setMasterTableCart([])
                        setCurrentStep('master-station-detail')
                      }}
                      className="w-full"
                    >
                      <div className="bg-purple-100 p-3 rounded-xl mx-auto mb-3 w-fit">
                        <Crown className="w-6 h-6 text-purple-700" />
                      </div>
                      <h3 className="text-2xl font-bold mb-1">Table {table.table_number}</h3>
                      <p className="text-xs text-gray-600 mb-2">Master Table</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        table.is_occupied 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                      </span>
                      <p className="text-xs text-purple-600 font-semibold mt-2">Click to take orders</p>
                    </button>
                  </div>
                ))}
                {tables.filter(t => t.is_master).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Crown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-semibold">No master tables yet</p>
                    <p className="text-sm text-gray-400 mt-2">Convert a regular table above</p>
                  </div>
                )}
              </div>
            </div>

            {/* Master Tables Orders Summary */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Master Table Orders Summary</h3>
              {tables.filter(t => t.is_master).length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold">No master tables yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tables.filter(t => t.is_master).map((table) => {
                    const tableOrders = getTableOrders(table.id)
                    return (
                      <div key={table.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-purple-600" />
                            <h4 className="font-bold text-gray-900">Table {table.table_number}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            table.is_occupied 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                          </span>
                        </div>
                        {tableOrders.length === 0 ? (
                          <p className="text-sm text-gray-500">No orders</p>
                        ) : (
                          <div className="space-y-2">
                            {tableOrders.map((order, index) => (
                              <div key={`${order.id}-${index}`} className="flex justify-between items-center bg-white p-2 rounded-lg">
                                <div>
                                  <span className="font-semibold text-sm">Order #{formatOrderId(order.id)}</span>
                                  <span className="text-xs text-gray-600 ml-2">₹{order.total_amount.toFixed(2)}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                                  order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={() => setCurrentStep('tables')}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Tables
              </button>
            </div>
          </div>
        )}


        {/* Step: Master Station Detail */}
        {currentStep === 'master-station-detail' && selectedMasterTable && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8 bg-purple-100 rounded-2xl p-4 sm:p-6 border-2 border-purple-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-200 p-2 sm:p-3 rounded-xl">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                      Master Table {selectedMasterTable.table_number}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600">
                      Take orders for this master table
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedMasterTable.is_occupied && (
                    <>
                      <button
                        onClick={() => handleRemoveMasterStatus(selectedMasterTable.id, selectedMasterTable.table_number)}
                        className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-lg font-semibold hover:bg-green-600 transition-all duration-300 text-xs"
                      >
                        <Crown className="w-3 h-3" />
                        Remove
                      </button>
                      <button
                        onClick={() => handleDeleteMasterTable(selectedMasterTable.id, selectedMasterTable.table_number)}
                        className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-lg font-semibold hover:bg-red-600 transition-all duration-300 text-xs"
                      >
                        <X className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setCurrentStep('master')}
                    className="flex items-center gap-2 bg-white text-purple-600 px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 border-2 border-purple-300"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu Section */}
              <div className="lg:col-span-2">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Menu</h3>
                  
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                          selectedCategory === category
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category === 'all' ? 'All Dishes' : category}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDishes.map((dish) => (
                      <button
                        key={dish.id}
                        onClick={() => dish.is_available && handleAddToMasterTableCart(dish)}
                        disabled={!dish.is_available}
                        className={`p-3 sm:p-4 border-2 rounded-xl transition-all duration-300 text-left relative ${
                          !dish.is_available
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                            : 'bg-white border-gray-200 hover:border-purple-500 hover:bg-purple-50'
                        }`}
                      >
                        <div className="absolute top-2 right-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            dish.is_available 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {dish.is_available ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-1 pr-8">
                          <h4 className="font-bold text-gray-900 text-sm">{dish.name}</h4>
                          <span className="text-sm font-bold text-green-600">₹{dish.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-600">{dish.category}</p>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                            dish.is_available
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs font-semibold hidden sm:inline">Add</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart Section */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-purple-200 sticky top-24">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Order Cart</h3>
                  
                  {masterTableCart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-semibold">Cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {masterTableCart.map((item) => (
                        <div key={item.dish_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                            <p className="text-xs text-gray-600">₹{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateMasterTableCartQuantity(item.dish_id, -1)}
                              className="w-6 h-6 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-gray-900 w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateMasterTableCartQuantity(item.dish_id, 1)}
                              className="w-6 h-6 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveFromMasterTableCart(item.dish_id)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {masterTableCart.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-bold text-gray-700">Total</span>
                        <span className="text-2xl font-bold text-gray-900">
                          ₹{masterTableCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={handleSubmitMasterTableOrder}
                        disabled={submitting}
                        className="w-full px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Submitting...' : 'Submit Order'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Orders for this Master Table */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Active Orders for Table {selectedMasterTable.table_number}</h3>
              {getTableOrders(selectedMasterTable.id).length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold">No active orders</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getTableOrders(selectedMasterTable.id).map((order, index) => (
                    <div key={`${order.id}-${index}`} className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-purple-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">Order #{formatOrderId(order.id)}</h4>
                          <p className="text-xs text-gray-600">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-bold text-gray-900">
                          ₹{order.total_amount.toFixed(2)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrderItems(order)}
                            className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded-lg font-semibold hover:bg-blue-600 transition-all duration-300 text-xs"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Items
                          </button>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleConfirmOrder(order.id)}
                              disabled={confirmingOrder}
                              className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-lg font-semibold hover:bg-green-600 transition-all duration-300 text-xs disabled:opacity-50"
                            >
                              <CheckCircle className="w-3 h-3" />
                              {confirmingOrder ? '...' : 'Confirm'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-lg font-semibold hover:bg-red-600 transition-all duration-300 text-xs"
                          >
                            <X className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 6: Alter Table */}
        {currentStep === 'alter-table' && alteringOrder && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 sm:mb-8 bg-blue-100 rounded-2xl p-4 sm:p-6 border-2 border-blue-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                    Change Table for Order
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Current: Table {alteringOrder.tables?.table_number} → Select new table
                  </p>
                </div>
                <button
                  onClick={() => setCurrentStep('tables')}
                  className="flex items-center gap-2 bg-white text-blue-600 px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 border-2 border-blue-300 w-full sm:w-auto justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Select Available Table</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {tables.filter(t => !t.is_occupied && t.id !== alteringOrder.table_id).map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setNewTableId(table.id)}
                    className={`p-4 sm:p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left ${
                      newTableId === table.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                        : 'border-green-500 bg-white hover:border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-green-100 p-2 sm:p-3 rounded-xl">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                      <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        🟢 Available
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Table {table.table_number}</h3>
                    <p className="text-xs sm:text-sm font-semibold text-gray-600">Capacity: {table.capacity} seats</p>
                  </button>
                ))}
                {tables.filter(t => !t.is_occupied && t.id !== alteringOrder.table_id).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-semibold">No available tables to change to</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleAlterTable}
              disabled={!newTableId}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Table Change
            </button>
          </div>
        )}

        {/* Step 7: Repeat Order */}
        {currentStep === 'repeat-order' && repeatingOrder && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8 bg-orange-100 rounded-2xl p-4 sm:p-6 border-2 border-orange-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                    🔔 Repeat Order for Table {repeatingOrder.tables?.table_number}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Add extra items to this order (will be shown as EXTRA ORDER to kitchen)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRepeatingOrder(null)
                    setRepeatOrderCart([])
                    setCurrentStep('tables')
                  }}
                  className="flex items-center gap-2 bg-white text-orange-600 px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-orange-50 transition-all duration-300 border-2 border-orange-300 w-full sm:w-auto justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu Section */}
              <div className="lg:col-span-2">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Menu</h3>
                  
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                          selectedCategory === category
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category === 'all' ? 'All Dishes' : category}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDishes.map((dish) => (
                      <button
                        key={dish.id}
                        onClick={() => dish.is_available && handleAddToRepeatOrderCart(dish)}
                        disabled={!dish.is_available}
                        className={`p-3 sm:p-4 border-2 rounded-xl transition-all duration-300 text-left relative ${
                          !dish.is_available
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                            : 'bg-white border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                        }`}
                      >
                        <div className="absolute top-2 right-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            dish.is_available 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {dish.is_available ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-1 pr-8">
                          <h4 className="font-bold text-gray-900 text-sm">{dish.name}</h4>
                          <span className="text-sm font-bold text-orange-600">₹{dish.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-600">{dish.category}</p>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                            dish.is_available
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs font-semibold hidden sm:inline">Add</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart Section */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-orange-200 sticky top-24">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Extra Order Cart</h3>
                  
                  {repeatOrderCart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-semibold">Cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {repeatOrderCart.map((item) => (
                        <div key={item.dish_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                            <p className="text-xs text-gray-600">₹{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateRepeatOrderCartQuantity(item.dish_id, -1)}
                              className="w-6 h-6 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-gray-900 w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateRepeatOrderCartQuantity(item.dish_id, 1)}
                              className="w-6 h-6 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveFromRepeatOrderCart(item.dish_id)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {repeatOrderCart.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-bold text-gray-700">Total</span>
                        <span className="text-2xl font-bold text-gray-900">
                          ₹{repeatOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={handleSubmitRepeatOrder}
                        disabled={submitting}
                        className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Submitting...' : 'Submit Extra Order'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Bill Preview */}
        {currentStep === 'bill-preview' && viewingBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 sm:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Bill Preview</h2>
                    <p className="text-green-100 text-sm">Order #{formatOrderId(viewingBill.id)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setViewingBill(null)
                      setCurrentStep('tables')
                    }}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Order Details */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">Table:</span>
                      <span className="ml-2 font-bold text-gray-900">{viewingBill.tables?.table_number}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Date:</span>
                      <span className="ml-2 font-bold text-gray-900">{new Date(viewingBill.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Waiter:</span>
                      <span className="ml-2 font-bold text-gray-900">{viewingBill.users?.name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Status:</span>
                      <span className="ml-2 font-bold text-gray-900 capitalize">{viewingBill.status}</span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Order Items</h3>
                  {billOrderItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No items in this order</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {billOrderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{item.dishes?.name || item.dish?.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                              {item.dish_type && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                  {item.dish_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-700">Total Amount</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹{viewingBill.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Print Button */}
                <div className="mt-6">
                  <button
                    onClick={handleThermalPrint}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    <Printer className="w-5 h-5" />
                    Print Bill (Thermal)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Items Modal */}
        {viewingOrderItems && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-blue-500 p-4 sm:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Order Items</h2>
                    <p className="text-blue-100 text-sm">Order #{viewingOrderItems.id.slice(0, 8)}</p>
                  </div>
                  <button
                    onClick={() => setViewingOrderItems(null)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Current Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Current Items</h3>
                  {orderItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No items in this order</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{item.dishes?.name}</h4>
                            <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                            <button
                              onClick={() => handleDeleteOrderItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Items */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Add Items</h3>
                  
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                          selectedCategory === category
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category === 'all' ? 'All Dishes' : category}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {filteredDishes.map((dish) => (
                      <button
                        key={dish.id}
                        onClick={() => dish.is_available && handleAddItemToOrder(dish.id)}
                        disabled={addingItem || !dish.is_available}
                        className={`p-3 border-2 rounded-xl transition-all duration-300 text-left relative disabled:opacity-50 ${
                          !dish.is_available
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <div className="absolute top-2 right-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            dish.is_available 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {dish.is_available ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-start mb-1 pr-8">
                          <h4 className="font-bold text-gray-900 text-sm">{dish.name}</h4>
                          <span className="text-sm font-bold text-green-600">₹{dish.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-600">{dish.category}</p>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                            dish.is_available
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            <Plus className="w-3 h-3" />
                            <span className="text-xs font-semibold hidden sm:inline">Add</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Total */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">Order Total</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹{viewingOrderItems.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
