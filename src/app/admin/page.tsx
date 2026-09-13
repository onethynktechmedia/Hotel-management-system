'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Order, Dish, Table, Payment } from '@/types'
import { Plus, Edit, Trash2, DollarSign, Users, Utensils } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import SalesAnalytics from '@/components/SalesAnalytics'
import WaiterStatus from '@/components/WaiterStatus'
import Reports from '@/components/Reports'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports'>('overview')
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
  }, [router])

  const fetchData = async () => {
    try {
      const [ordersRes, dishesRes, tablesRes, paymentsRes] = await Promise.all([
        fetch('/api/orders').then(res => res.json()),
        fetch('/api/dishes').then(res => res.json()),
        supabase.from('tables').select('*').order('table_number'),
        supabase.from('payments').select('*').order('created_at', { ascending: false })
      ])

      setOrders(ordersRes || [])
      setDishes(dishesRes || [])
      setTables(tablesRes.data || [])
      setPayments(paymentsRes.data || [])
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

  const handleGenerateBill = async (order: Order) => {
    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, dishes(*)')
        .eq('order_id', order.id)

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

  const handleDirectPrint = () => {
    // Try WebUSB first (for USB thermal printers)
    if ('navigator' in window && 'usb' in (window as any)) {
      (window as any).navigator.usb.requestDevice({ filters: [{ vendorId: 0x0456 }] })
        .then((device: any) => {
          return device.open();
        })
        .then((device: any) => {
          return device.selectConfiguration(1);
        })
        .then((device: any) => {
          return device.claimInterface(0);
        })
        .then((device: any) => {
          const billContent = generateESCPOSBill();
          const encoder = new TextEncoder();
          return device.transferOut(1, encoder.encode(billContent));
        })
        .then(() => {
          alert('Bill sent to USB thermal printer successfully!');
        })
        .catch((error: any) => {
          console.error('USB printing failed:', error);
          // Try Bluetooth as fallback
          tryBluetoothPrint();
        });
    } else {
      // Try Bluetooth as fallback
      tryBluetoothPrint();
    }
  }

  const tryBluetoothPrint = () => {
    // Check if Web Bluetooth API is available
    if ('navigator' in window && 'bluetooth' in (window as any)) {
      // Try to connect to Bluetooth thermal printer
      (window as any).navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
      })
      .then((device: any) => {
        return device.gatt.connect();
      })
      .then((server: any) => {
        // Get the service and characteristic for printing
        return server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
          .then((service: any) => service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb'));
      })
      .then((characteristic: any) => {
        // Generate ESC/POS commands for the bill
        const billContent = generateESCPOSBill();
        const encoder = new TextEncoder();
        return characteristic.writeValue(encoder.encode(billContent));
      })
      .then(() => {
        alert('Bill sent to Bluetooth thermal printer successfully!');
      })
      .catch((error: any) => {
        console.error('Bluetooth printing failed:', error);
        // Fallback to regular print
        window.print();
      });
    } else {
      // Fallback to regular print if Bluetooth not available
      alert('Direct printing not available. Using system print dialog instead.\n\nMake sure your thermal printer is connected via USB/Bluetooth and is the default printer.');
      window.print();
    }
  }

  const generateESCPOSBill = () => {
    if (!selectedOrderForBilling) return '';
    
    let bill = '\x1B\x40'; // Initialize printer
    bill += '\x1B\x61\x01'; // Center align
    
    // Hotel name
    bill += 'HOTEL MANAGEMENT\n';
    bill += '================\n\n';
    
    bill += '\x1B\x61\x00'; // Left align
    bill += `Order #${selectedOrderForBilling.id.slice(0, 8)}\n`;
    bill += `Table ${selectedOrderForBilling.tables?.table_number}\n`;
    bill += `${new Date(selectedOrderForBilling.created_at).toLocaleDateString()} ${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}\n`;
    bill += '----------------\n';
    
    // Order items
    selectedOrderForBilling.order_items?.forEach(item => {
      bill += `${item.dish?.name}\n`;
      bill += `  Qty: ${item.quantity} x ₹${item.price.toFixed(2)}\n`;
      bill += `  Total: ₹${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    bill += '----------------\n';
    
    // Amounts
    const subtotal = selectedOrderForBilling.total_amount;
    const discount = calculateDiscountValue(subtotal);
    const finalAmount = calculateFinalAmount(subtotal);
    
    bill += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
    if (discount > 0) {
      bill += `Discount: -₹${discount.toFixed(2)}\n`;
    }
    bill += '\x1B\x61\x01'; // Center align
    bill += '================\n';
    bill += `TOTAL: ₹${finalAmount.toFixed(2)}\n`;
    bill += '================\n';
    bill += '\x1B\x61\x00'; // Left align
    bill += '\nThank You for Dining!\n';
    bill += 'Visit Again\n\n';
    bill += '\x1D\x56\x00'; // Cut paper
    
    return bill;
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
      const { error } = await supabase.from('tables').delete().eq('id', id)
      if (error) throw error
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
        is_occupied: false
      }

      if (editingTable) {
        const { error } = await supabase
          .from('tables')
          .update(payload)
          .eq('id', editingTable.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tables').insert(payload)
        if (error) throw error
      }

      setShowTableModal(false)
      fetchData()
    } catch (error) {
      console.error('Error saving table:', error)
      alert('Failed to save table')
    }
  }

  const handleViewTableOrders = async (tableId: string) => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, users(*), order_items(*, dishes(*))')
        .eq('table_id', tableId)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false })

      setSelectedTableOrders(data || [])
      setShowTableOrders(true)
    } catch (error) {
      console.error('Error fetching table orders:', error)
      alert('Failed to fetch table orders')
    }
  }

  const handleReleaseTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to release this table?')) return

    try {
      await supabase
        .from('tables')
        .update({ is_occupied: false })
        .eq('id', tableId)

      fetchData()
    } catch (error) {
      console.error('Error releasing table:', error)
      alert('Failed to release table')
    }
  }

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => !['completed', 'paid'].includes(o.status)).length,
    totalRevenue: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    totalDishes: dishes.length
  }

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 lg:ml-72 p-4 lg:p-8 pt-20 lg:pt-8">

        {activeTab === 'overview' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{stats.totalOrders}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <Users className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Active Orders</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{stats.activeOrders}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <Utensils className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Total Revenue</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">₹{stats.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <DollarSign className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'sales' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sales Analytics</h2>
            <SalesAnalytics payments={payments} orders={orders} />
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders Management</h2>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">All Orders</h3>
              <button
                onClick={fetchData}
                className="flex items-center bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Table</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Waiter</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Table {order.tables?.table_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.users?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleGenerateBill(order)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:shadow-lg transition-all duration-300"
                        >
                          Generate Bill
                        </button>
                      </td>
                    </tr>
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
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Dishes</h3>
              <button
                onClick={handleAddDish}
                className="flex items-center bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Dish
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dishes.map((dish) => (
                    <tr key={dish.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{dish.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{dish.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dish.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{dish.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          dish.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {dish.is_available ? '✓ Available' : '✗ Unavailable'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleEditDish(dish)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDish(dish.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
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
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Tables</h3>
                <button
                  onClick={handleAddTable}
                  className="flex items-center bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Table
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Table Number</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Master Table</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tables.map((table) => (
                      <tr key={table.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Table {table.table_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{table.capacity} seats</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            table.is_occupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {table.is_occupied ? '🔴 Occupied' : '🟢 Available'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            table.is_master ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {table.is_master ? '✓ Master' : 'Standard'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleViewTableOrders(table.id)}
                            className="text-blue-600 hover:text-blue-800 transition-colors font-semibold"
                            title="View Orders"
                          >
                            View Orders
                          </button>
                          <button
                            onClick={() => handleEditTable(table)}
                            className="text-orange-600 hover:text-orange-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          {table.is_occupied && (
                            <button
                              onClick={() => handleReleaseTable(table.id)}
                              className="text-green-600 hover:text-green-800 transition-colors font-semibold"
                              title="Release Table"
                            >
                              Release
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTable(table.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
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
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports & Analytics</h2>
            <Reports orders={orders} payments={payments} dishes={dishes} />
          </>
        )}
      </main>

      {/* Dish Modal */}
      {showDishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {editingDish ? 'Edit Dish' : 'Add New Dish'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dish Name</label>
                <input
                  type="text"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter dish name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter price"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={dishForm.category}
                  onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                >
                  <option value="">Select category</option>
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Bread">Bread</option>
                  <option value="Sides">Sides</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
                <input
                  type="text"
                  value={dishForm.image_url}
                  onChange={(e) => setDishForm({ ...dishForm, image_url: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter image URL"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={dishForm.is_available}
                  onChange={(e) => setDishForm({ ...dishForm, is_available: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="is_available" className="text-sm font-semibold text-gray-700">Available</label>
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {editingDish ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Modal */}
     {selectedOrderForBilling && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" id="bill-modal">
            <div className="flex justify-between items-center mb-6 no-print">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Bill - Order #{selectedOrderForBilling.id.slice(0, 8)}
              </h2>
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Discount Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl no-print">
                <h3 className="font-bold text-gray-900 mb-3">Apply Discount</h3>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setDiscountType('amount')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                      discountType === 'amount'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white'
                        : 'bg-white text-gray-700 border-2 border-gray-300'
                    }`}
                  >
                    Fixed Amount (₹)
                  </button>
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                      discountType === 'percentage'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white'
                        : 'bg-white text-gray-700 border-2 border-gray-300'
                    }`}
                  >
                    Percentage (%)
                  </button>
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
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
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
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="Enter discount percentage"
                      max="100"
                      min="0"
                    />
                  )}
                </div>
              </div>

              {/* Order Details (for screen view) */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl no-print">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Table</p>
                  <p className="text-lg font-bold text-gray-900">Table {selectedOrderForBilling.tables?.table_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Waiter</p>
                  <p className="text-lg font-bold text-gray-900">{selectedOrderForBilling.users?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Date</p>
                  <p className="text-lg font-bold text-gray-900">{new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Time</p>
                  <p className="text-lg font-bold text-gray-900">{new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Hotel Name (for print) */}
              <div className="text-center print-only">
                <h1 className="text-3xl font-bold text-gray-900">HOTEL MANAGEMENT</h1>
                <p className="text-gray-600 mt-2">Order #{selectedOrderForBilling.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(selectedOrderForBilling.created_at).toLocaleDateString()} {new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">Table {selectedOrderForBilling.tables?.table_number}</p>
              </div>

              {/* Order Items */}
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-1/2">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase no-print">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase w-16">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase w-24">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrderForBilling.order_items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.dishes?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs no-print">{item.dishes?.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Amount Summary */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-700">Subtotal</span>
                  <span className="text-xl font-bold text-gray-900">
                    ₹{selectedOrderForBilling.total_amount.toFixed(2)}
                  </span>
                </div>
                {calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">
                      Discount ({discountType === 'amount' ? '₹' : '%'}{discountType === 'amount' ? discountAmount : discountPercentage})
                    </span>
                    <span className="text-xl font-bold text-red-600">
                      -₹{calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t-2 border-orange-300 pt-3">
                  <span className="text-xl font-bold text-gray-900">Final Amount</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    ₹{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Thank You Message (print only) */}
              <div className="text-center print-only mt-4">
                <p className="text-sm font-bold text-gray-900">Thank You for Dining With Us!</p>
                <p className="text-xs text-gray-600 mt-1">Visit Again</p>
                <div className="border-t border-dashed border-gray-400 mt-3 pt-3">
                  <p className="text-xs text-gray-500">Powered by Hotel Management System</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 no-print">
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
              >
                Print Bill (Preview)
              </button>
              <button
                onClick={() => handleDirectPrint()}
                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all duration-300 transform hover:scale-105"
              >
                Print to Thermal Printer
              </button>
              <button
                onClick={() => {
                  alert('To print to your thermal printer:\n\n1. Make sure your EC-58B printer is connected via USB\n2. Set it as your default printer in system settings\n3. Click "Print Bill (Preview)" and select your thermal printer\n4. For Linux: Install CUPS and configure the printer\n\nUSB Vendor ID for EC-58B: 0x0456 (may vary)')
                }}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-all duration-300 transform hover:scale-105"
              >
                Setup Help
              </button>
              <button
                onClick={() => selectedOrderForBilling && handleMarkAsPaid(selectedOrderForBilling)}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
              >
                Mark as Paid & Release Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {editingTable ? 'Edit Table' : 'Add New Table'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Table Number</label>
                <input
                  type="number"
                  value={tableForm.table_number}
                  onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter table number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (seats)</label>
                <input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {editingTable ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Orders Modal */}
      {showTableOrders && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
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
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
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
                            <tr key={item.id} className="hover:bg-orange-50">
                              <td className="px-4 py-2 text-sm font-semibold text-gray-900">{item.dishes?.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700">Total Amount:</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
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
    </div>
  )
}
