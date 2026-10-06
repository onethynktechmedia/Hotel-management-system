'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/db'
import { User, Order, Dish, Table, CartItem } from '@/types'
import { LogOut, ShoppingCart, Plus, Minus, ArrowLeft, Users, Clock, CheckCircle, X, Crown, Printer, RotateCcw, History } from 'lucide-react'
import { playClickSound, playSuccessSound, playErrorSound, playPrintSound, playNotificationSound } from '@/lib/sound-effects'

type Step = 'tables' | 'order-options' | 'dishes' | 'cart' | 'success' | 'alter-table' | 'repeat-order' | 'bill-preview' | 'previous-orders'

// Utility function to format order ID as DPK-XXX
const formatOrderId = (orderId: string) => {
  // Extract a number from the UUID and format it
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1 // Ensure it's between 1-999
  return `DPK-${String(orderNumber).padStart(3, '0')}`
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
  const [selectedFoodType, setSelectedFoodType] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)
  const [alteringOrder, setAlteringOrder] = useState<Order | null>(null)
  const [newTableId, setNewTableId] = useState<string | null>(null)
  const [showMasterTableModal, setShowMasterTableModal] = useState(false)
  const [selectedTablesForMaster, setSelectedTablesForMaster] = useState<string[]>([])
  const [confirmingOrder, setConfirmingOrder] = useState(false)
  const [viewingOrderItems, setViewingOrderItems] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [addingItem, setAddingItem] = useState(false)
  const [selectedDishTypes, setSelectedDishTypes] = useState<{[key: string]: string}>({})
  const [repeatingOrder, setRepeatingOrder] = useState<Order | null>(null)
  const [repeatOrderCart, setRepeatOrderCart] = useState<CartItem[]>([])
  const [viewingBill, setViewingBill] = useState<Order | null>(null)
  const [billOrderItems, setBillOrderItems] = useState<any[]>([])
  const [tableOrders, setTableOrders] = useState<Order[]>([])
  const [selectedItemsToRepeat, setSelectedItemsToRepeat] = useState<any[]>([])
  const [previousOrderCount, setPreviousOrderCount] = useState(0)
  const [customerName, setCustomerName] = useState('')

  const dishTypes = ['Normal', 'Medium', 'Spicy', 'Extra Spicy']

  useEffect(() => {
    // Check for session cookie instead of localStorage
    const sessionCookie = document.cookie.includes('hotel_session=')
    const userRoleCookie = document.cookie.includes('hotel_role=')
    
    if (!sessionCookie || !userRoleCookie) {
      router.push('/dpk')
      return
    }
    
    // Get user role from cookie
    const roleMatch = document.cookie.match(/hotel_role=([^;]+)/)
    const userRole = roleMatch ? decodeURIComponent(roleMatch[1]) : null
    
    if (userRole !== 'waiter') {
      router.push('/dpk')
      return
    }
    
    // Get user ID from cookie
    const userIdMatch = document.cookie.match(/hotel_user_id=([^;]+)/)
    const userId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : null
    const userName = localStorage.getItem('user_name') || 'Waiter'
    
    setUser({
      id: userId || '',
      email: '',
      role: userRole || 'waiter',
      name: userName,
      created_at: new Date().toISOString()
    })
    
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
      
      // Play notification sound if new orders detected
      if (uniqueOrders.length > previousOrderCount && previousOrderCount > 0) {
        playNotificationSound('order')
      }
      setPreviousOrderCount(uniqueOrders.length)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableSelect = async (table: Table) => {
    setSelectedTable(table)

    // For master tables, always allow taking orders (regardless of occupied status)
    if (table.is_master) {
      setCurrentStep('dishes')
      return
    }

    // For child tables (part of master table), show error
    if (table.master_table_id) {
      alert('This table is part of a master table. Please use the master table to place orders.')
      return
    }

    // For regular tables, check if occupied
    if (table.is_occupied) {
      const tableOrder = orders.find(o => o.table_id === table.id && !['paid', 'completed'].includes(o.status))
      if (tableOrder) {
        handleViewBill(tableOrder)
      } else {
        alert('No active order found for this table.')
      }
      return
    }

    // For available regular tables, go to dishes
    setCurrentStep('dishes')
  }

  const handleBackToTables = () => {
    setSelectedTable(null)
    setCart([])
    setTableOrders([])
    setSelectedItemsToRepeat([])
    setCurrentStep('tables')
  }

  const handleNewOrder = () => {
    setCart([])
    setCurrentStep('dishes')
  }

  const handleViewPreviousOrders = () => {
    setSelectedItemsToRepeat([])
    setCurrentStep('previous-orders')
  }

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

      // Get user_id from cookie
      const userIdMatch = document.cookie.match(/hotel_user_id=([^;]+)/)
      const userId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : null

      // Create order via API
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable?.id,
          waiter_id: userId,
          status: 'pending',
          total_amount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
        status: 'pending'
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

      // Create notifications for kitchen and admin staff
      const usersResponse = await fetch('/api/users')
      const allUsers = await usersResponse.json()
      const kitchenAndAdminUsers = allUsers.filter((u: any) => u.role === 'kitchen' || u.role === 'admin')

      for (const targetUser of kitchenAndAdminUsers) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: targetUser.id,
            order_id: orderData.id,
            type: 'new_order',
            message: `Repeated order for Table ${selectedTable?.table_number} by ${user?.name}`,
            is_read: false
          })
        })
      }

      console.log(`Notifications sent to ${kitchenAndAdminUsers.length} kitchen/admin users`)

      // Play success sound
      playSuccessSound()

      setCurrentStep('success')
      setCart([])
      setSelectedItemsToRepeat([])
      setSelectedTable(null)
      
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

      // Get user_id from cookie
      const userIdMatch = document.cookie.match(/hotel_user_id=([^;]+)/)
      const userId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : null
      console.log('User ID from cookie:', userId)

      // Check if there's already a pending order for this table
      const existingOrdersResponse = await fetch('/api/orders')
      const allOrders = await existingOrdersResponse.json()
      const existingOrder = allOrders.find((o: any) => 
        o.table_id === selectedTable?.id && 
        o.status === 'pending'
      )

      let orderData: any

      if (existingOrder) {
        // Add items to existing order
        console.log('Found existing order, adding items to it:', existingOrder.id)
        
        // Update order total
        const currentTotal = existingOrder.total_amount || 0
        const newTotal = currentTotal + getCartTotal()
        
        await fetch(`/api/orders/${existingOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_amount: newTotal
          })
        })

        // Create order items for the existing order
        const orderItems = cart.map(item => ({
          order_id: existingOrder.id,
          dish_id: item.dish_id,
          quantity: item.quantity,
          price: item.price,
          status: 'pending'
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

        orderData = existingOrder
      } else {
        // Create new order
        console.log('No existing order, creating new order')
        
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_id: selectedTable?.id,
            waiter_id: userId,
            status: 'pending',
            total_amount: getCartTotal()
          })
        })

        console.log('Order response status:', orderResponse.status)
        if (!orderResponse.ok) {
          const errorData = await orderResponse.json()
          console.error('Order API error:', errorData)
          throw new Error(errorData.error || 'Failed to create order')
        }

        orderData = await orderResponse.json()
        console.log('Order created:', orderData)

        // Create order items via API
        const orderItems = cart.map(item => ({
          order_id: orderData.id,
          dish_id: item.dish_id,
          quantity: item.quantity,
          price: item.price,
          status: 'pending'
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

        // If this is a master table, ensure all child tables remain occupied
        if (selectedTable?.is_master) {
          const childTables = tables.filter(t => t.master_table_id === selectedTable.id)
          for (const childTable of childTables) {
            await fetch('/api/tables', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: childTable.id,
                is_occupied: true
              })
            })
          }
        }

        // Create notifications for kitchen and admin staff
        const usersResponse = await fetch('/api/users')
        const allUsers = await usersResponse.json()
        const kitchenAndAdminUsers = allUsers.filter((u: any) => u.role === 'kitchen' || u.role === 'admin')

        for (const targetUser of kitchenAndAdminUsers) {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: targetUser.id,
              order_id: orderData.id,
              type: 'new_order',
              message: `New order for Table ${selectedTable?.table_number} by ${user?.name}`,
              is_read: false
            })
          })
        }

        console.log(`Notifications sent to ${kitchenAndAdminUsers.length} kitchen/admin users`)
      }

      // Play success sound
      playSuccessSound()

      setCurrentStep('success')
      setCart([])
      setSelectedTable(null)
      
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
    playClickSound()
    // Clear all cookies
    document.cookie = 'hotel_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Clear localStorage
    localStorage.clear()
    
    // Redirect to main page
    router.push('/')
  }

  const handleCreateMasterTable = async () => {
    if (selectedTablesForMaster.length < 2) {
      alert('Please select at least 2 tables to create a master table')
      return
    }

    try {
      // Use the first selected table as the master
      const masterTableId = selectedTablesForMaster[0]
      const masterTable = tables.find(t => t.id === masterTableId)

      if (!masterTable) {
        alert('Error: Master table not found')
        return
      }

      // Calculate total capacity
      const totalCapacity = selectedTablesForMaster.reduce((sum, id) => {
        const table = tables.find(t => t.id === id)
        return sum + (table?.capacity || 0)
      }, 0)

      // Update the first table to become master and mark as occupied
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: masterTableId,
          is_master: true,
          capacity: totalCapacity,
          is_occupied: true
        })
      })

      // Update all other selected tables to reference the master table and mark as occupied
      // (Child tables should be occupied to prevent others from using them)
      for (let i = 1; i < selectedTablesForMaster.length; i++) {
        const tableId = selectedTablesForMaster[i]
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tableId,
            master_table_id: masterTableId,
            is_occupied: true
          })
        })
      }

      setShowMasterTableModal(false)
      setSelectedTablesForMaster([])
      fetchData()
      playSuccessSound()
      alert(`Table ${masterTable.table_number} is now the master table with ${selectedTablesForMaster.length} tables combined. All tables are now occupied and reserved.`)
    } catch (error) {
      console.error('Error creating master table:', error)
      playErrorSound()
      alert('Failed to create master table')
    }
  }

  const handleSelectMasterTableNumber = (number: number) => {
    // This function is no longer needed with the new modal approach
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
      const response = await fetch(`/api/orders/${orderId}`, {
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
      ? `Table ${tableNumber} is currently occupied. This will delete the master table, release all associated tables, and delete all orders. Are you sure you want to proceed?`
      : `This will delete Master Table ${tableNumber}, release all associated tables, and delete all orders. Are you sure you want to proceed?`

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

      // Release all child tables
      const childTables = tables.filter(t => t.master_table_id === tableId)
      for (const childTable of childTables) {
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: childTable.id,
            is_occupied: false,
            master_table_id: null
          })
        })
      }

      // Delete the master table
      const response = await fetch(`/api/tables?id=${tableId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete table')

      await fetchData()
      alert(`Master Table ${tableNumber} deleted successfully! All associated tables have been released.`)
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
      // Fetch all orders for the same table AND customer that are not paid/completed (including extra orders)
      const allTableOrders = orders.filter(o => 
        o.table_id === order.table_id && 
        o.customer_name === order.customer_name &&
        !['paid', 'completed'].includes(o.status)
      )
      
      // Fetch items for all orders
      const allItems = await Promise.all(
        allTableOrders.map(async (o) => {
          const response = await fetch(`/api/orders/${o.id}/items`)
          if (!response.ok) throw new Error('Failed to fetch order items')
          const items = await response.json()
          return items.map((item: any) => ({ ...item, order_id: o.id, order_type: o.order_type }))
        })
      )
      
      // Flatten all items
      const mergedItems = allItems.flat()
      
      // Calculate total amount from all orders
      const totalAmount = allTableOrders.reduce((sum, o) => sum + o.total_amount, 0)
      
      // Set merged items and viewing bill with updated total
      setBillOrderItems(mergedItems)
      setViewingBill({ ...order, total_amount: totalAmount })
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
    escpos += 'DHOLE PATIL KHANAWAL\n'
    escpos += '\x1D\x21\x00' // Normal size
    
    escpos += 'RESTAURANT & BAR\n'
    escpos += '====================\n'
    escpos += '\x1B\x61\x00' // Left align
    
    // Order details
    const isMasterTable = viewingBill.tables?.is_master || false
    escpos += `Order #: ${formatOrderId(viewingBill.id)}\n`
    escpos += `Table: ${viewingBill.tables?.table_number}${isMasterTable ? ' (M)' : ''}\n`
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
    
    playClickSound()
    playPrintSound()
    
    try {
      // Group items by dish name and combine quantities
      const groupedItems: { [key: string]: { name: string, qty: number, total: number, isExtra: boolean } } = {}
      billOrderItems.forEach((item: any) => {
        const name = item.dishes?.name || item.dish?.name || 'Unknown'
        const qty = item.quantity
        const price = (item.dishes?.price || item.dish?.price || item.price || 0)
        const total = price * qty
        const isExtra = item.order_type === 'Extra' || item.item_type === 'Extra'
        
        if (!groupedItems[name]) {
          groupedItems[name] = { name, qty: 0, total: 0, isExtra: false }
        }
        groupedItems[name].qty += qty
        groupedItems[name].total += total
        if (isExtra) {
          groupedItems[name].isExtra = true
        }
      })

      // Generate items list for bill
      const itemsList = Object.values(groupedItems).map((item: any) => {
        const displayName = item.isExtra ? `${item.name} (E)` : item.name
        const itemName = displayName.length > 20 ? displayName.substring(0, 19) + '.' : displayName
        return `<div style="display: flex; font-size: 9px; margin: 2px 0;">
  <span style="flex: 2;">${itemName}</span>
  <span style="flex: 1; text-align: right;">${item.qty}</span>
  <span style="flex: 1; text-align: right;">${item.total.toFixed(2)}</span>
</div>`
      }).join('')

      // Generate properly formatted plain text bill content for thermal printer
      // 58mm paper width = approximately 32-35 characters per line
      const isMasterTable = viewingBill.tables?.is_master || false
      const plainText = `
<div style="text-align: center; margin-bottom: 8px;">
  <div style="font-size: 18px; font-weight: 900; color: #000;">DHOLE PATIL KHANAWAL</div>
  <div style="font-size: 12px; font-weight: bold; color: #000;">RESTAURANT & BAR</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 10px; margin-bottom: 4px; font-weight: bold; color: #000;">
  <div>123, MAIN STREET</div>
  <div>CITY, STATE - 123456</div>
  <div>PHONE: +91 98765 43210</div>
  <div>GSTIN: 29ABCDE1234F1Z5</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 12px; font-weight: 900; margin: 4px 0; color: #000;">BILL / INVOICE</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="margin: 4px 0; font-size: 10px; font-weight: bold; color: #000;">
  <div style="display: flex; justify-content: space-between;">
    <span>BILL NO:</span>
    <span>${formatOrderId(viewingBill.id)}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>DATE:</span>
    <span>${new Date().toLocaleDateString()}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>TIME:</span>
    <span>${new Date().toLocaleTimeString()}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>TABLE:</span>
    <span>${viewingBill.tables?.table_number}${isMasterTable ? ' (M)' : ''}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>WAITER:</span>
    <span>${viewingBill.users?.name}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>CUSTOMER:</span>
    <span>${viewingBill.customer_name || 'GUEST'}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>PAYMENT:</span>
    <span>${(viewingBill as any).payment_type?.toUpperCase() || 'CASH'}</span>
  </div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="font-size: 10px; font-weight: 900; margin: 4px 0; color: #000;">ITEM DETAILS</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="display: flex; font-size: 9px; font-weight: 900; margin-bottom: 2px; color: #000;">
  <span style="flex: 2;">ITEM</span>
  <span style="flex: 1; text-align: right;">QTY</span>
  <span style="flex: 1; text-align: right;">AMT</span>
</div>
<div style="border-top: 1px dashed #000; margin: 2px 0;"></div>
${itemsList}
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="border-top: 2px solid #000; margin: 6px 0;"></div>
<div style="text-align: center; font-size: 14px; font-weight: 900; color: #000; margin: 4px 0;">
  GRAND TOTAL: RS${viewingBill.total_amount.toFixed(2)}
</div>
<div style="border-top: 2px solid #000; margin: 6px 0;"></div>
<div style="text-align: center; font-size: 10px; margin: 4px 0; font-weight: bold; color: #000;">
  <div>THANK YOU FOR DINING!</div>
  <div>VISIT US AGAIN</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 8px; font-weight: 900; color: #000; margin: 4px 0;">
  DEVELOPED BY ONETHYNK TECHMEDIA
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
`
      
      console.log('Bill content generated')
      
      // Create a hidden iframe for printing to avoid popup blockers
      const printFrame = document.createElement('iframe')
      printFrame.style.display = 'none'
      document.body.appendChild(printFrame)
      
      const printDoc = printFrame.contentDocument || printFrame.contentWindow?.document
      if (printDoc) {
        printDoc.open()
        printDoc.write(`
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
                  body {
                    margin: 0;
                    padding: 2mm;
                    width: 58mm;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  font-weight: bold;
                }
                body {
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 10px;
                  line-height: 1.2;
                  color: #000;
                  font-weight: bold;
                }
                strong {
                  font-weight: bold;
                }
              </style>
            </head>
            <body>${plainText}</body>
          </html>
        `)
        printDoc.close()
        
        // Wait for content to load, then print
        setTimeout(() => {
          printFrame.contentWindow?.focus()
          printFrame.contentWindow?.print()
          
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(printFrame)

            // Update order status to completed after printing
            const updateOrderStatus = async () => {
              try {
                await fetch(`/api/orders/${viewingBill.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'completed' })
                })

                // If this is a master table, release all associated tables
                if (viewingBill.tables?.is_master) {
                  // Mark master table as not occupied
                  await fetch('/api/tables', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: viewingBill.table_id,
                      is_occupied: false
                    })
                  })

                  // Release all child tables
                  const childTables = tables.filter(t => t.master_table_id === viewingBill.table_id)
                  for (const childTable of childTables) {
                    await fetch('/api/tables', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: childTable.id,
                        is_occupied: false,
                        master_table_id: null
                      })
                    })
                  }

                  // Remove master status from the table
                  await fetch('/api/tables', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: viewingBill.table_id,
                      is_master: false
                    })
                  })
                } else {
                  // Regular table - just mark as not occupied
                  await fetch('/api/tables', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: viewingBill.table_id,
                      is_occupied: false
                    })
                  })
                }

                // Refresh orders
                fetchData()
                playSuccessSound()

                // Close bill preview and go back to tables
                setCurrentStep('tables')
                setSelectedTable(null)
                setViewingBill(null)
                setBillOrderItems([])
              } catch (error) {
                console.error('Error updating order status:', error)
              }
            }

            updateOrderStatus()
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

  const filteredDishes = dishes.filter(dish => {
    const categoryMatch = selectedCategory === 'all' || dish.category === selectedCategory
    const foodTypeMatch = selectedFoodType === 'all' || dish.food_type === selectedFoodType
    return categoryMatch && foodTypeMatch
  })

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
                  onClick={() => { playClickSound(); handleBackToTables() }}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#5D3A1A] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold text-sm sm:text-base">Back to Tables</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => { playClickSound(); handleInitializeTables() }}
                className="flex items-center gap-2 bg-[#5D3A1A] text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 text-sm sm:text-base"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                Init Tables
              </button>
              <button
                onClick={() => { playClickSound(); handleLogout() }}
                className="flex items-center gap-2 bg-[#5D3A1A] text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 text-sm sm:text-base"
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
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Select a Table</h2>
                <p className="text-gray-600">Choose an available table to start taking orders</p>
              </div>
              <button
                onClick={() => { playClickSound(); setShowMasterTableModal(true) }}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 transition-all duration-300"
              >
                <Crown className="w-5 h-5" />
                Create Master Table
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {tables.filter(t => !t.master_table_id).map((table) => (
                <div
                  key={table.id}
                  className={`p-4 sm:p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left relative ${
                    table.is_occupied 
                      ? 'border-[#5D3A1A] bg-[#F5F5DC] cursor-not-allowed opacity-60' 
                      : 'border-[#8B4513] bg-white hover:border-[#5D3A1A] cursor-pointer'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      playClickSound()
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
                    onClick={() => { playClickSound(); handleTableSelect(table) }}
                    disabled={table.is_occupied}
                    className="w-full text-left"
                  >
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div className="bg-[#F5F5DC] p-2 sm:p-3 rounded-xl">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#5D3A1A]" />
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                        table.is_occupied 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-[#F5F5DC] text-[#5D3A1A]'
                      }`}>
                        {table.is_occupied ? 'Occupied' : 'Available'}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                      {table.is_master ? `Table ${table.table_number} (M)` : `Table ${table.table_number}`}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Capacity: {table.capacity} seats</p>
                    {table.is_master && (
                      <p className="text-xs text-purple-600 font-semibold mt-2">
                        {tables.filter(t => t.master_table_id === table.id).length} tables combined
                      </p>
                    )}
                    {table.is_occupied && !table.is_master && (
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
                      .filter(o => (o.waiter_id === user?.id || o.users?.id === user?.id) && !['paid', 'completed'].includes(o.status))
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
                        className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-[#8B4513] hover:border-[#5D3A1A] hover:shadow-xl transition-all duration-300 text-left cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">Table {group.table?.table_number}</h4>
                            <p className="text-xs sm:text-sm text-gray-600">{group.orders.length} active order{group.orders.length > 1 ? 's' : ''}</p>
                          </div>
                          <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-[#F5F5DC] text-[#5D3A1A]">
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
                              playClickSound()
                              handleViewBill(group.orders[0])
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#5D3A1A] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 text-sm"
                          >
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              playClickSound()
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
                playClickSound()
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
                onClick={() => { playClickSound(); handleNewOrder() }}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#8B4513] hover:border-[#5D3A1A] hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-[#F5F5DC] w-12 h-12 rounded-xl flex items-center justify-center">
                    <Plus className="w-6 h-6 text-[#5D3A1A]" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">New Order</h3>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { playClickSound(); handleViewPreviousOrders() }}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#8B4513] hover:border-[#5D3A1A] hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-[#F5F5DC] w-12 h-12 rounded-xl flex items-center justify-center">
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
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-[#8B4513]">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#5D3A1A]" />
                  Current Orders ({tableOrders.length})
                </h3>
                {(() => {
                  // Group orders by customer
                  const customerGroups = tableOrders.reduce((acc: any, order: any) => {
                    const customerName = order.customer_name || 'Guest'
                    if (!acc[customerName]) {
                      acc[customerName] = {
                        customer: customerName,
                        orders: []
                      }
                    }
                    acc[customerName].orders.push(order)
                    return acc
                  }, {})
                  
                  return Object.values(customerGroups).map((group: any) => {
                    // Combine all items from all orders for this customer
                    const allItems: { [key: string]: { name: string, qty: number } } = {}
                    group.orders.forEach((order: any) => {
                      order.order_items?.forEach((item: any) => {
                        const name = item.dishes?.name || item.dish?.name || 'Unknown'
                        const qty = item.quantity
                        if (!allItems[name]) {
                          allItems[name] = { name, qty: 0 }
                        }
                        allItems[name].qty += qty
                      })
                    })
                    
                    const totalAmount = group.orders.reduce((sum: number, o: any) => sum + o.total_amount, 0)
                    const primaryOrder = group.orders[0]
                    
                    return (
                      <div key={group.customer} className="p-4 bg-purple-50 rounded-xl mb-3 last:mb-0">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-gray-900">Customer: {group.customer}</p>
                            <p className="text-sm text-gray-600">{group.orders.length} order{group.orders.length > 1 ? 's' : ''}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            primaryOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            primaryOrder.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                            primaryOrder.status === 'ready' ? 'bg-[#F5F5DC] text-[#5D3A1A]' :
                            primaryOrder.status === 'served' ? 'bg-white border-2 border-black text-black' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {primaryOrder.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Object.values(allItems).map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-900 font-medium">{item.name}</span>
                              <span className="text-[#8B4513] font-bold">{item.qty}x</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between items-center">
                          <button
                            onClick={() => { playClickSound(); handleViewBill(primaryOrder) }}
                            className="text-sm text-[#8B4513] font-semibold hover:underline"
                          >
                            View Bill
                          </button>
                          <p className="font-bold text-purple-600">₹{totalAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    )
                  })
                })()}
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
                  onClick={() => { playClickSound(); handleNewOrder() }}
                  className="flex items-center gap-2 bg-[#5D3A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Start New Order
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // Group orders by customer
                  const customerGroups = tableOrders.reduce((acc: any, order: any) => {
                    const customerName = order.customer_name || 'Guest'
                    if (!acc[customerName]) {
                      acc[customerName] = {
                        customer: customerName,
                        orders: []
                      }
                    }
                    acc[customerName].orders.push(order)
                    return acc
                  }, {})
                  
                  return Object.values(customerGroups).map((group: any) => {
                    // Combine all items from all orders for this customer
                    const allItems: { [key: string]: { name: string, qty: number, price: number, items: any[] } } = {}
                    group.orders.forEach((order: any) => {
                      order.order_items?.forEach((item: any) => {
                        const name = item.dishes?.name || 'Unknown'
                        const qty = item.quantity
                        const price = item.price
                        if (!allItems[name]) {
                          allItems[name] = { name, qty: 0, price, items: [] }
                        }
                        allItems[name].qty += qty
                        allItems[name].items.push(item)
                      })
                    })
                    
                    const totalAmount = group.orders.reduce((sum: number, o: any) => sum + o.total_amount, 0)
                    const primaryOrder = group.orders[0]
                    
                    return (
                      <div key={group.customer} className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#8B4513] hover:border-[#5D3A1A] transition-all duration-300">
                        <div className="p-6 bg-[#F5F5DC]">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">Customer: {group.customer}</h3>
                              <p className="text-sm text-gray-600">{group.orders.length} order{group.orders.length > 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-[#5D3A1A]">
                                ₹{totalAmount.toFixed(2)}
                              </p>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                primaryOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                primaryOrder.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                                primaryOrder.status === 'ready' ? 'bg-[#F5F5DC] text-[#5D3A1A]' :
                                primaryOrder.status === 'served' ? 'bg-white border-2 border-black text-black' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {primaryOrder.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-900">Order Items:</h4>
                            <button
                              onClick={() => {
                                playClickSound()
                                const allItemIds = Object.values(allItems).flatMap((g: any) => g.items.map((i: any) => i.id))
                                const allSelected = allItemIds.every(id => selectedItemsToRepeat.find(i => i.id === id))
                                if (allSelected) {
                                  setSelectedItemsToRepeat(prev => prev.filter(i => !allItemIds.includes(i.id)))
                                } else {
                                  setSelectedItemsToRepeat(prev => {
                                    const newItems = Object.values(allItems).flatMap((g: any) => g.items).filter((item: any) => !prev.find(i => i.id === item.id))
                                    return [...prev, ...newItems]
                                  })
                                }
                              }}
                              className="text-sm text-[#5D3A1A] font-semibold hover:text-[#8B4513]"
                            >
                              {Object.values(allItems).every((g: any) => g.items.every((item: any) => selectedItemsToRepeat.find(i => i.id === item.id))) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="space-y-2">
                            {Object.values(allItems).map((group: any, index: number) => (
                              <div 
                                key={index} 
                                className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        playClickSound()
                                        // Decrease selection by 1
                                        const currentlySelected = group.items.filter((item: any) => selectedItemsToRepeat.find(i => i.id === item.id))
                                        if (currentlySelected.length > 0) {
                                          setSelectedItemsToRepeat(prev => {
                                            const itemToDeselect = currentlySelected[0]
                                            return prev.filter(i => i.id !== itemToDeselect.id)
                                          })
                                        }
                                      }}
                                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-700 transition-colors"
                                      disabled={!group.items.some((item: any) => selectedItemsToRepeat.find(i => i.id === item.id))}
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-gray-900 min-w-[20px] text-center">
                                      {group.items.filter((item: any) => selectedItemsToRepeat.find(i => i.id === item.id)).length}
                                    </span>
                                    <button
                                      onClick={() => {
                                        playClickSound()
                                        // Increase selection by 1
                                        const currentlySelected = group.items.filter((item: any) => selectedItemsToRepeat.find(i => i.id === item.id))
                                        if (currentlySelected.length < group.qty) {
                                          const itemToSelect = group.items.find((item: any) => !selectedItemsToRepeat.find(i => i.id === item.id))
                                          if (itemToSelect) {
                                            setSelectedItemsToRepeat(prev => [...prev, itemToSelect])
                                          }
                                        }
                                      }}
                                      className="w-8 h-8 rounded-full bg-[#5D3A1A] hover:bg-[#8B4513] flex items-center justify-center font-bold text-white transition-colors"
                                      disabled={group.items.every((item: any) => selectedItemsToRepeat.find(i => i.id === item.id))}
                                    >
                                      +
                                    </button>
                                  </div>
                                  {group.items[0]?.dishes?.image_url && (
                                    <img
                                      src={group.items[0].dishes.image_url}
                                      alt={group.name}
                                      className="w-12 h-12 object-cover rounded-lg"
                                    />
                                  )}
                                  <div>
                                    <p className="font-semibold text-gray-900">{group.name}</p>
                                    <p className="text-sm text-gray-600">₹{group.price.toFixed(2)} each</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-900">{group.qty}x</p>
                                  <p className="text-sm text-orange-600 font-semibold">₹{(group.price * group.qty).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedItemsToRepeat.length > 0 && (
                          <div className="p-4 bg-[#F5F5DC] border-t-2 border-[#8B4513]">
                            <p className="font-semibold text-gray-900">{selectedItemsToRepeat.length} items selected</p>
                          </div>
                        )}

                        <div className="p-6 bg-[#F5F5DC] flex gap-4">
                          <button
                            onClick={() => { playClickSound(); handleRepeatOrder(primaryOrder) }}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#5D3A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300"
                          >
                            Repeat Order
                          </button>
                          <button
                            onClick={() => { playClickSound(); setCurrentStep('order-options') }}
                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Dishes Selection */}
        {currentStep === 'dishes' && selectedTable && (
          <div>
            <div className="mb-3 sm:mb-6 bg-[#F5F5DC] rounded-2xl p-3 sm:p-4 border-2 border-[#8B4513]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    Table {selectedTable.table_number}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">{selectedTable.capacity} seats</p>
                </div>
                <button
                  onClick={() => { playClickSound(); handleBackToTables() }}
                  className="flex items-center gap-1 bg-white text-[#5D3A1A] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-[#FAEBD7] transition-all duration-300 border-2 border-[#8B4513] w-full sm:w-auto justify-center text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  Change
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => { playClickSound(); setSelectedCategory(category) }}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-[#5D3A1A] text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-[#F5F5DC] border-2 border-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All' : category}
                </button>
              ))}
            </div>

            {/* Food Type Filter */}
            <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
              <button
                onClick={() => { playClickSound(); setSelectedFoodType('all') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedFoodType === 'all'
                    ? 'bg-[#5D3A1A] text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-[#F5F5DC] border-2 border-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { playClickSound(); setSelectedFoodType('veg') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedFoodType === 'veg'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-green-700 hover:bg-green-50 border-2 border-green-200'
                }`}
              >
                <div className="w-3 h-3 flex items-center justify-center border-2 border-green-600 bg-green-50 rounded-sm">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                </div>
                Veg
              </button>
              <button
                onClick={() => { playClickSound(); setSelectedFoodType('nonveg') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedFoodType === 'nonveg'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-white text-red-700 hover:bg-red-50 border-2 border-red-200'
                }`}
              >
                <div className="w-3 h-3 flex items-center justify-center border-2 border-red-600 bg-red-50 rounded-sm">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                </div>
                Non-Veg
              </button>
            </div>

            {/* Customer Name Input */}
            {/* Dishes List */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-20 sm:mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#D2691E]">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-bold text-white uppercase">Dish</th>
                      <th className="px-2 sm:px-3 py-1.5 text-right text-xs font-bold text-white uppercase">Price</th>
                      <th className="px-2 sm:px-3 py-1.5 text-center text-xs font-bold text-white uppercase">Status</th>
                      <th className="px-2 sm:px-3 py-1.5 text-center text-xs font-bold text-white uppercase">Add</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDishes.map((dish) => (
                      <tr key={dish.id} className="hover:bg-[#F5F5DC] transition-colors">
                        <td className="px-2 sm:px-3 py-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              {getFoodTypeIcon(dish.food_type)}
                              <h3 className="font-bold text-gray-900 text-sm">{dish.name}</h3>
                            </div>
                            <span className="text-xs text-gray-500">{dish.category}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-right">
                          <p className="font-bold text-gray-900 text-sm">₹{dish.price.toFixed(2)}</p>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto ${
                            dish.is_available 
                              ? 'bg-[#5D3A1A] text-white' 
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
                              onClick={() => { playClickSound(); addToCart(dish, selectedDishTypes[dish.id] || 'Normal') }}
                              disabled={!dish.is_available}
                              className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 text-xs border-2 ${
                                !dish.is_available
                                  ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                                  : cart.some(item => item.dish_id === dish.id && item.dish_type === (selectedDishTypes[dish.id] || 'Normal'))
                                    ? 'bg-white text-black border-black hover:bg-gray-100'
                                    : 'bg-[#5D3A1A] text-white border-[#5D3A1A] hover:bg-[#8B4513]'
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
              <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-[#8B4513] p-2 sm:p-4 z-50">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-600">{cart.length} items</p>
                    <p className="text-base sm:text-xl font-bold text-gray-900">
                      ₹{getCartTotal().toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => { playClickSound(); setCurrentStep('cart') }}
                    className="flex items-center gap-1 sm:gap-2 bg-[#5D3A1A] text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 w-full sm:w-auto justify-center text-xs sm:text-sm"
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
            <div className="mb-6 sm:mb-8 bg-[#F5F5DC] rounded-2xl p-4 sm:p-6 border-2 border-[#8B4513]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                    Review Order - Table {selectedTable.table_number}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">Confirm your order before sending to kitchen</p>
                </div>
                <button
                  onClick={() => { playClickSound(); handleBackToTables() }}
                  className="flex items-center gap-2 bg-white text-[#5D3A1A] px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300 border-2 border-[#8B4513] w-full sm:w-auto justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change Table
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Order Items</h3>
              </div>

              {cart.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-500 font-semibold">Your cart is empty</p>
                  <button
                    onClick={() => { playClickSound(); setCurrentStep('dishes') }}
                    className="mt-4 text-[#5D3A1A] font-semibold hover:underline text-sm sm:text-base"
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
                          <span className="px-2 py-0.5 bg-[#F5F5DC] text-[#5D3A1A] text-xs font-semibold rounded-full">
                            {item.dish_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { playClickSound(); updateQuantity(item.dish_id, -1, item.dish_type || 'Normal') }}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => { playClickSound(); updateQuantity(item.dish_id, 1, item.dish_type || 'Normal') }}
                            className="w-8 h-8 rounded-full bg-[#F5F5DC] hover:bg-[#DEB887] flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="w-20 sm:w-24 text-right font-bold text-gray-900 text-sm sm:text-base">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => { playClickSound(); removeFromCart(item.dish_id, item.dish_type || 'Normal') }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Details (Optional) */}
              <div className="p-4 sm:p-6 bg-white border-t border-gray-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-[#F5F5DC]">
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
                onClick={() => { playClickSound(); setCurrentStep('dishes') }}
                className="flex-1 px-4 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 text-sm sm:text-base"
              >
                Add More Items
              </button>
              <button
                onClick={() => { playClickSound(); submitOrder() }}
                disabled={cart.length === 0 || submitting}
                className="flex-1 px-4 sm:px-6 py-3 bg-[#5D3A1A] text-white rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
              <div className="bg-[#F5F5DC] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-[#5D3A1A]" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Order Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your order has been sent to the kitchen. The table is now locked until payment is completed.
              </p>
              <button
                onClick={() => { playClickSound(); setCurrentStep('tables') }}
                className="w-full px-6 py-3 bg-[#5D3A1A] text-white rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300"
              >
                Take Another Order
              </button>
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
                        : 'border-[#8B4513] bg-white hover:border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-[#F5F5DC] p-2 sm:p-3 rounded-xl">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#5D3A1A]" />
                      </div>
                      <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-[#F5F5DC] text-[#5D3A1A]">
                        Available
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
                  <div className="flex flex-wrap gap-2 mb-2">
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
                        {category === 'all' ? 'All' : category}
                      </button>
                    ))}
                  </div>

                  {/* Food Type Filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setSelectedFoodType('all')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedFoodType === 'all'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedFoodType('veg')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedFoodType === 'veg'
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
                      }`}
                    >
                      <div className="w-3 h-3 flex items-center justify-center border-2 border-green-600 bg-green-50 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      </div>
                      Veg
                    </button>
                    <button
                      onClick={() => setSelectedFoodType('nonveg')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedFoodType === 'nonveg'
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="w-3 h-3 flex items-center justify-center border-2 border-red-600 bg-red-50 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                      </div>
                      Non-Veg
                    </button>
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
                              ? 'bg-[#5D3A1A] text-white' 
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
                          <div className="flex items-center gap-2">
                            {getFoodTypeIcon(dish.food_type)}
                            <h4 className="font-bold text-gray-900 text-sm">{dish.name}</h4>
                          </div>
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#5D3A1A] to-[#8B5A2B] p-6 rounded-t-2xl">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-1">DHOLE PATIL KHANAWAL</h2>
                  <p className="text-[#F5F5DC] text-sm font-semibold">RESTAURANT & BAR</p>
                  <div className="mt-2 text-[#F5F5DC] text-xs space-y-1">
                    <p>123, MAIN STREET, CITY, STATE - 123456</p>
                    <p>PHONE: +91 98765 43210</p>
                    <p>GSTIN: 29ABCDE1234F1Z5</p>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
                {/* Bill Info */}
                <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Bill No</p>
                      <p className="font-bold text-gray-900">{formatOrderId(viewingBill.id)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                      <p className="font-bold text-gray-900">{new Date(viewingBill.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Table</p>
                      <p className="font-bold text-gray-900">{viewingBill.tables?.table_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                      <p className="font-bold text-gray-900">{new Date(viewingBill.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Waiter</p>
                      <p className="font-bold text-gray-900">{viewingBill.users?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        viewingBill.status === 'paid' ? 'bg-[#5D3A1A] text-white' :
                        viewingBill.status === 'ready' ? 'bg-[#F5F5DC] text-[#5D3A1A]' :
                        viewingBill.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                        viewingBill.status === 'served' ? 'bg-white border-2 border-black text-black' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingBill.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pb-2 border-b border-gray-200">
                    <span className="flex-1">Item</span>
                    <span className="w-16 text-center">Qty</span>
                    <span className="w-20 text-right">Amount</span>
                  </div>
                  {billOrderItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No items in this order</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        // Group items by dish name
                        const groupedItems: { [key: string]: { name: string, qty: number, total: number, isExtra: boolean } } = {}
                        billOrderItems.forEach((item: any) => {
                          const name = item.dishes?.name || item.dish?.name || 'Unknown'
                          const qty = item.quantity
                          const price = item.dishes?.price || item.dish?.price || item.price || 0
                          const total = price * qty
                          const isExtra = item.order_type === 'Extra' || item.item_type === 'Extra'
                          
                          if (!groupedItems[name]) {
                            groupedItems[name] = { name, qty: 0, total: 0, isExtra: false }
                          }
                          groupedItems[name].qty += qty
                          groupedItems[name].total += total
                          if (isExtra) {
                            groupedItems[name].isExtra = true
                          }
                        })
                        
                        return Object.values(groupedItems).map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">
                                {item.isExtra ? `${item.name} (E)` : item.name}
                              </p>
                            </div>
                            <span className="w-16 text-center text-sm text-gray-600">{item.qty}</span>
                            <span className="w-20 text-right font-bold text-gray-900 text-sm">₹{item.total.toFixed(2)}</span>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">GRAND TOTAL</span>
                    <span className="text-2xl font-bold text-[#5D3A1A]">
                      ₹{viewingBill.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-2">Thank you for dining with us!</p>
                  <p className="text-xs text-gray-400">Visit us again soon</p>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleThermalPrint}
                    className="w-full flex items-center justify-center gap-2 bg-[#5D3A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300"
                  >
                    <Printer className="w-5 h-5" />
                    Print Bill
                  </button>
                  <button
                    onClick={() => {
                      setViewingBill(null)
                      setCurrentStep('tables')
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                    Close
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
                  <div className="flex flex-wrap gap-2 mb-2">
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

                  {/* Food Type Filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setSelectedFoodType('all')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedFoodType === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedFoodType('veg')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedFoodType === 'veg'
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
                      }`}
                    >
                      <div className="w-3 h-3 flex items-center justify-center border-2 border-green-600 bg-green-50 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      </div>
                      Veg
                    </button>
                    <button
                      onClick={() => setSelectedFoodType('nonveg')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedFoodType === 'nonveg'
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="w-3 h-3 flex items-center justify-center border-2 border-red-600 bg-red-50 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                      </div>
                      Non-Veg
                    </button>
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
                              ? 'bg-[#5D3A1A] text-white' 
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
                          <div className="flex items-center gap-2">
                            {getFoodTypeIcon(dish.food_type)}
                            <h4 className="font-bold text-gray-900 text-sm">{dish.name}</h4>
                          </div>
                          <span className="text-sm font-bold text-[#5D3A1A]">₹{dish.price.toFixed(2)}</span>
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
                <div className="mt-6 p-4 bg-[#F5F5DC] rounded-xl border-2 border-[#8B4513]">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">Order Total</span>
                    <span className="text-2xl font-bold text-[#5D3A1A]">
                      ₹{viewingOrderItems.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Master Table Modal */}
      {showMasterTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-[#5D3A1A]">Create Master Table</h2>
            <p className="text-gray-600 mb-4">Select 2 or more tables to combine into a master table. The first selected table will become the master.</p>
            {selectedTablesForMaster.length > 0 && (
              <div className="mb-4 p-3 bg-[#F5F5DC] rounded-lg">
                <p className="font-semibold text-[#5D3A1A]">
                  Master Table: Table {tables.find(t => t.id === selectedTablesForMaster[0])?.table_number}
                </p>
              </div>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tables.filter(t => !t.master_table_id).map(table => (
                <label key={table.id} className="flex items-center p-3 border-2 border-gray-200 rounded-xl hover:border-[#8B4513] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedTablesForMaster.includes(table.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTablesForMaster([...selectedTablesForMaster, table.id])
                      } else {
                        setSelectedTablesForMaster(selectedTablesForMaster.filter(id => id !== table.id))
                      }
                    }}
                    className="w-5 h-5 text-[#8B4513] rounded focus:ring-[#8B4513]"
                  />
                  <span className="ml-3 font-semibold text-gray-900">Table {table.table_number}</span>
                  <span className="ml-3 text-gray-500">(Capacity: {table.capacity})</span>
                  {selectedTablesForMaster.length > 0 && selectedTablesForMaster[0] === table.id && (
                    <span className="ml-3 px-2 py-1 bg-[#8B4513] text-white text-xs rounded-full">Master</span>
                  )}
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowMasterTableModal(false)
                  setSelectedTablesForMaster([])
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMasterTable}
                className="flex-1 px-6 py-3 bg-[#8B4513] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Create Master Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
