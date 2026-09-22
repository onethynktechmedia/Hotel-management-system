'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/db'
import { User, Order, Dish, Table, CartItem } from '@/types'
import { LogOut, ShoppingCart, Plus, Minus, ArrowLeft, Users, Clock, CheckCircle, X } from 'lucide-react'

type Step = 'tables' | 'dishes' | 'cart' | 'success'

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
        supabase.from('dishes').select('*').eq('is_available', true).order('name'),
        supabase.from('tables').select('*').order('table_number'),
        fetch('/api/orders').then(res => res.json())
      ])

      setDishes(dishesRes.data || [])
      setTables(tablesRes.data || [])
      setOrders(ordersRes || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableSelect = (table: Table) => {
    if (table.is_occupied) {
      alert('This table is already occupied. Please select another table.')
      return
    }
    setSelectedTable(table)
    setCurrentStep('dishes')
  }

  const handleBackToTables = () => {
    setSelectedTable(null)
    setCart([])
    setCurrentStep('tables')
  }

  const addToCart = (dish: Dish) => {
    const existingItem = cart.find(item => item.dish_id === dish.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.dish_id === dish.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        dish_id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        image_url: dish.image_url
      }])
    }
  }

  const removeFromCart = (dishId: string) => {
    setCart(cart.filter(item => item.dish_id !== dishId))
  }

  const updateQuantity = (dishId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.dish_id === dishId) {
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

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: selectedTable?.id,
          waiter_id: user?.id,
          status: 'pending',
          total_amount: getCartTotal()
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        throw orderError
      }

      console.log('Order created:', orderData)

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price,
        status: 'pending'
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items error:', itemsError)
        throw itemsError
      }

      console.log('Order items created')

      // Update table status to occupied
      const { error: tableError } = await supabase
        .from('tables')
        .update({ is_occupied: true })
        .eq('id', selectedTable?.id)

      if (tableError) {
        console.error('Table update error:', tableError)
        throw tableError
      }

      console.log('Table updated to occupied')

      // Create notification for kitchen
      await supabase
        .from('notifications')
        .insert({
          user_id: user?.id,
          order_id: orderData.id,
          type: 'new_order',
          message: `New order for Table ${selectedTable?.table_number}`,
          is_read: false
        })

      console.log('Notification created')

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
    localStorage.removeItem('user')
    router.push('/login')
  }

  const filteredDishes = selectedCategory === 'all' 
    ? dishes 
    : dishes.filter(dish => dish.category === selectedCategory)

  const categories = ['all', 'Starters', 'Main Course', 'Bread', 'Sides', 'Desserts', 'Beverages']

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {currentStep !== 'tables' && (
                <button
                  onClick={handleBackToTables}
                  className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-semibold">Back to Tables</span>
                </button>
              )}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Waiter Station
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
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

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTableSelect(table)}
                  disabled={table.is_occupied}
                  className={`p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left ${
                    table.is_occupied 
                      ? 'border-red-500 bg-red-50 cursor-not-allowed opacity-60' 
                      : 'border-green-500 bg-white hover:border-orange-500 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-orange-100 p-3 rounded-xl">
                      <Users className="w-6 h-6 text-orange-600" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      table.is_occupied 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Table {table.table_number}</h3>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Capacity: {table.capacity} seats</p>
                  {table.is_occupied && (
                    <p className="text-xs text-red-600 font-semibold mt-2">
                      This table is currently occupied
                    </p>
                  )}
                </button>
              ))}
            </div>

            {/* My Active Orders */}
            {orders.length > 0 && (
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">My Active Orders</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.filter(o => o.waiter_id === user?.id && !['paid', 'completed'].includes(o.status)).map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">Table {order.tables?.table_number}</h4>
                          <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        ₹{order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Dishes Selection */}
        {currentStep === 'dishes' && selectedTable && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Order for Table {selectedTable.table_number}
              </h2>
              <p className="text-gray-600">Select dishes to add to the order</p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-orange-50 border-2 border-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All Dishes' : category}
                </button>
              ))}
            </div>

            {/* Dishes Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredDishes.map((dish) => (
                <div key={dish.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {dish.image_url && (
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{dish.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dish.description}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        ₹{dish.price.toFixed(2)}
                      </p>
                      <button
                        onClick={() => addToCart(dish)}
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-orange-200 p-4 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">{cart.length} items in cart</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      Total: ₹{getCartTotal().toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentStep('cart')}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Review Order
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Cart Review */}
        {currentStep === 'cart' && selectedTable && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Review Order - Table {selectedTable.table_number}
              </h2>
              <p className="text-gray-600">Confirm your order before sending to kitchen</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
                <h3 className="text-xl font-bold text-gray-900">Order Items</h3>
              </div>
              
              {cart.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold">Your cart is empty</p>
                  <button
                    onClick={() => setCurrentStep('dishes')}
                    className="mt-4 text-orange-600 font-semibold hover:underline"
                  >
                    Add items to your order
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {cart.map((item) => (
                    <div key={item.dish_id} className="p-4 flex items-center gap-4">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-xl"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">₹{item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.dish_id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.dish_id, 1)}
                          className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="w-24 text-right font-bold text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.dish_id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-700">Total Amount</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    ₹{getCartTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep('dishes')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Add More Items
              </button>
              <button
                onClick={submitOrder}
                disabled={cart.length === 0 || submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                Take Another Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
