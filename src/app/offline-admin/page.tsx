'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, DollarSign, Users, Utensils, User as UserIcon, Search, LogOut, Download, Printer } from 'lucide-react'
import { localStorageDB, LocalOrder, LocalDish, LocalTable, LocalUser } from '@/lib/local-storage-db'
import { printWithFallback, WebUSBPrinter } from '@/lib/webusb-printer'

const formatOrderId = (orderId: string) => {
  const hash = orderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const orderNumber = (hash % 999) + 1
  return `GGR-${String(orderNumber).padStart(3, '0')}`
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

  useEffect(() => {
    localStorageDB.initializeSampleData()
    loadOfflineData()
    const userData = localStorage.getItem('offline_user')
    if (!userData) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(userData))
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
    setLoading(false)
    return () => clearInterval(timer)
  }, [])

  const loadOfflineData = () => {
    setOrders(localStorageDB.getOrders())
    setDishes(localStorageDB.getDishes())
    setTables(localStorageDB.getTables())
  }

  const handleLogout = () => {
    localStorage.removeItem('offline_user')
    router.push('/login')
  }

  const handleConnectPrinter = async () => {
    try {
      const printer = new WebUSBPrinter()
      await printer.connect()
      setPrinterConnected(true)
      alert('Printer connected successfully!')
    } catch (error: any) {
      alert('Failed to connect printer: ' + error.message)
    }
  }

  const calculateDiscountValue = (total: number) => {
    return discountType === 'amount' ? parseFloat(discountAmount) || 0 : (parseFloat(discountPercentage) || 0) / 100 * total
  }

  const calculateFinalAmount = (total: number) => total - calculateDiscountValue(total)

  const handleThermalPrint = async () => {
    if (!selectedOrderForBilling) return
    try {
      let escposContent = '\x1B\x40'
      escposContent += '\x1B\x61\x01\x1B\x21\x30GALAXY GARDEN\n\x1B\x21\x00Restaurant & Bar\n================================\n123, Main Street\nCity, State - 123456\nPhone: +91 98765 43210\nGSTIN: 29ABCDE1234F1Z5\n================================\nBILL / INVOICE\n================================\n\n'
      escposContent += '\x1B\x61\x00'
      escposContent += `Bill No: ${formatOrderId(selectedOrderForBilling.id)}\nDate: ${new Date(selectedOrderForBilling.created_at).toLocaleDateString()}\nTime: ${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}\nTable: ${selectedOrderForBilling.tables?.table_number}\nWaiter: ${selectedOrderForBilling.users?.name}\nCustomer: ${selectedOrderForBilling.customer_name || 'Guest'}\n--------------------------------\n`
      escposContent += '\x1B\x21\x01ITEM           QTY    TOTAL\n------------------------\n\x1B\x21\x00'
      escposContent += '\x1B\x21\x01'
      selectedOrderForBilling.order_items?.forEach((item: any) => {
        const name = item.dishes?.name || 'Unknown'
        const qty = item.quantity
        const price = (item.dishes?.price || item.price || 0)
        const total = (price * qty).toFixed(2)
        const itemName = name.length > 15 ? name.substring(0, 14) + '.' : name
        escposContent += `${itemName.padEnd(15)} ${qty.toString().padStart(2)}  ₹${total.padStart(7)}\n`
      })
      escposContent += '\x1B\x21\x00------------------------\n'
      const subtotal = selectedOrderForBilling.total_amount
      const discount = calculateDiscountValue(subtotal)
      const finalAmount = calculateFinalAmount(subtotal)
      escposContent += `Subtotal:       ₹${subtotal.toFixed(2)}\n`
      if (discount > 0) escposContent += `Discount:        ₹${discount.toFixed(2)}\n`
      escposContent += '\x1B\x21\x08GRAND TOTAL:    ₹' + finalAmount.toFixed(2) + '\n\x1B\x21\x00\n'
      escposContent += '\x1b\x61\x01================================\nThank You for Dining!\nVisit Us Again\n================================\n\x1B\x4D\x01Developed by onethynk techmedia\n\x1B\x4D\x00================================\n\n \n\x1D\x56\x00'
      
      const plainText = `GALAXY GARDEN\nRestaurant & Bar\n================================\nBill No: ${formatOrderId(selectedOrderForBilling.id)}\nCustomer: ${selectedOrderForBilling.customer_name || 'Guest'}\nTable: ${selectedOrderForBilling.tables?.table_number}\nTotal: ₹${calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}\n================================\nThank You for Dining!\n================================\n`
      
      await printWithFallback(escposContent, plainText)
      alert('Bill sent to printer!')
    } catch (error) {
      alert('Printing failed: ' + (error as Error).message)
    }
  }

  const handleMarkAsPaid = (order: LocalOrder) => {
    localStorageDB.updateOrder(order.id, { status: 'paid' })
    loadOfflineData()
    setSelectedOrderForBilling(null)
    alert('Order marked as paid!')
  }

  const handleAddDish = () => {
    if (!newDish.name || !newDish.price || !newDish.category) { alert('Please fill all fields'); return }
    localStorageDB.addDish({ id: Date.now().toString(), name: newDish.name, price: parseFloat(newDish.price), category: newDish.category, is_available: true })
    loadOfflineData()
    setNewDish({ name: '', price: '', category: '', is_available: true })
  }

  const handleAddTable = () => {
    if (!newTable.table_number || !newTable.capacity) { alert('Please fill all fields'); return }
    localStorageDB.addTable({ id: Date.now().toString(), table_number: parseInt(newTable.table_number), capacity: parseInt(newTable.capacity), is_available: true })
    loadOfflineData()
    setNewTable({ table_number: '', capacity: '', is_available: true })
  }

  const handleDeleteDish = (id: string) => {
    if (confirm('Delete this dish?')) { localStorageDB.deleteDish(id); loadOfflineData() }
  }

  const handleDeleteTable = (id: string) => {
    if (confirm('Delete this table?')) { localStorageDB.deleteTable(id); loadOfflineData() }
  }

  const handleExportData = () => {
    const data = localStorageDB.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotel_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || formatOrderId(order.id).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3"><Utensils className="w-8 h-8 text-green-600" /><h1 className="text-2xl font-bold text-green-700">Galaxy Garden - OFFLINE</h1></div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-sm text-gray-600">{currentDateTime.toLocaleDateString()}</p><p className="text-sm font-semibold text-gray-800">{currentDateTime.toLocaleTimeString()}</p></div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"><LogOut className="w-4 h-4" />Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Total Orders</p><p className="text-3xl font-bold text-green-600">{orders.length}</p></div><Users className="w-12 h-12 text-green-200" /></div></div>
          <div className="bg-white rounded-xl shadow-lg p-6"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Total Dishes</p><p className="text-3xl font-bold text-blue-600">{dishes.length}</p></div><Utensils className="w-12 h-12 text-blue-200" /></div></div>
          <div className="bg-white rounded-xl shadow-lg p-6"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Total Tables</p><p className="text-3xl font-bold text-purple-600">{tables.length}</p></div><UserIcon className="w-12 h-12 text-purple-200" /></div></div>
          <div className="bg-white rounded-xl shadow-lg p-6"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Revenue</p><p className="text-3xl font-bold text-yellow-600">₹{orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_amount, 0).toFixed(0)}</p></div><DollarSign className="w-12 h-12 text-yellow-200" /></div></div>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200"><nav className="flex gap-4 px-6"><button className="px-4 py-4 text-green-600 border-b-2 border-green-600 font-semibold">Orders</button></nav></div>
          <div className="p-6">
            <div className="flex gap-4 mb-6"><div className="flex-1 relative"><Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg"><option value="all">All Status</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order ID</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Table</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-200">{filteredOrders.map((order) => (<tr key={order.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm font-medium text-gray-900">{formatOrderId(order.id)}</td><td className="px-4 py-3 text-sm text-gray-600">{order.customer_name || 'Guest'}</td><td className="px-4 py-3 text-sm text-gray-600">{order.tables?.table_number || '-'}</td><td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{order.total_amount.toFixed(2)}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span></td><td className="px-4 py-3"><button onClick={() => setSelectedOrderForBilling(order)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs">Print Bill</button></td></tr>))}</tbody></table></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Dish</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><input type="text" placeholder="Dish Name" value={newDish.name} onChange={(e) => setNewDish({ ...newDish, name: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" /><input type="number" placeholder="Price" value={newDish.price} onChange={(e) => setNewDish({ ...newDish, price: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" /><input type="text" placeholder="Category" value={newDish.category} onChange={(e) => setNewDish({ ...newDish, category: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" /><button onClick={handleAddDish} className="bg-green-600 text-white px-4 py-2 rounded-lg"><Plus className="w-4 h-4 inline" /> Add Dish</button></div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">{dishes.map((dish) => (<div key={dish.id} className="border border-gray-200 rounded-lg p-4"><div className="flex justify-between"><div><h4 className="font-semibold">{dish.name}</h4><p className="text-sm text-gray-600">{dish.category}</p><p className="text-lg font-bold text-green-600">₹{dish.price}</p></div><button onClick={() => handleDeleteDish(dish.id)} className="text-red-500"><Trash2 className="w-5 h-5" /></button></div></div>))}</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Table</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><input type="number" placeholder="Table Number" value={newTable.table_number} onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" /><input type="number" placeholder="Capacity" value={newTable.capacity} onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" /><button onClick={handleAddTable} className="bg-green-600 text-white px-4 py-2 rounded-lg"><Plus className="w-4 h-4 inline" /> Add Table</button></div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">{tables.map((table) => (<div key={table.id} className="border border-gray-200 rounded-lg p-4"><div className="flex justify-between"><div><h4 className="font-semibold">Table {table.table_number}</h4><p className="text-sm text-gray-600">Capacity: {table.capacity}</p></div><button onClick={() => handleDeleteTable(table.id)} className="text-red-500"><Trash2 className="w-5 h-5" /></button></div></div>))}</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Management</h2>
          <button onClick={handleExportData} className="bg-blue-600 text-white px-4 py-2 rounded-lg"><Download className="w-4 h-4 inline" /> Export Data (Backup)</button>
        </div>
      </div>

      {selectedOrderForBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-green-700">Print Bill</h2><button onClick={() => setSelectedOrderForBilling(null)} className="text-gray-500"><Trash2 className="w-6 h-6" /></button></div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-semibold mb-2">Order Details</h3><p>Order ID: {formatOrderId(selectedOrderForBilling.id)}</p><p>Customer: {selectedOrderForBilling.customer_name || 'Guest'}</p><p>Table: {selectedOrderForBilling.tables?.table_number}</p><p>Total: ₹{selectedOrderForBilling.total_amount.toFixed(2)}</p></div>
              <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-semibold mb-2">Discount</h3><div className="flex gap-4"><select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')} className="px-4 py-2 border border-gray-300 rounded-lg"><option value="amount">Amount (₹)</option><option value="percentage">Percentage (%)</option></select><input type="number" placeholder={discountType === 'amount' ? 'Discount Amount' : 'Discount %'} value={discountType === 'amount' ? discountAmount : discountPercentage} onChange={(e) => discountType === 'amount' ? setDiscountAmount(e.target.value) : setDiscountPercentage(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" /></div><p className="mt-2 text-lg font-bold text-green-600">Final Amount: ₹{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}</p></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setSelectedOrderForBilling(null)} className="flex-1 px-6 py-3 border-2 border-green-300 text-green-700 rounded-xl">Close</button><button onClick={handleConnectPrinter} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl"><Printer className="w-4 h-4 inline" /> {printerConnected ? 'Connected' : 'Connect'}</button><button onClick={handleThermalPrint} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl">Print Bill</button><button onClick={() => handleMarkAsPaid(selectedOrderForBilling)} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl">Mark Paid</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
