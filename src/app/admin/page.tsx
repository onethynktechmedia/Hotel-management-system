'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Order, Dish, Table, Payment, Notification } from '@/types'
import { Plus, Edit, Trash2, DollarSign, Users, Utensils, User as UserIcon, Search, Filter, HelpCircle, Bell, LogOut, Download } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports'>('overview')
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = async () => {
    try {
      const [ordersRes, dishesRes, tablesRes, paymentsRes, notificationsRes] = await Promise.all([
        fetch('/api/orders').then(res => res.json()),
        fetch('/api/dishes').then(res => res.json()),
        supabase.from('tables').select('*').order('table_number'),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false })
      ])

      setOrders(ordersRes || [])
      setDishes(dishesRes || [])
      setTables(tablesRes.data || [])
      setPayments(paymentsRes.data || [])
      setNotifications(notificationsRes.data || [])
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

  // ESC/POS Command Generator for Thermal Printer
  const generateESCPOSBill = () => {
    if (!selectedOrderForBilling) return ''
    
    let escpos = ''
    
    // Initialize printer
    escpos += '\x1B\x40' // Initialize
    escpos += '\x1B\x61\x01' // Center align
    
    // Hotel Header
    escpos += '\x1B\x61\x01' // Center align
    escpos += '\x1B\x21\x30' // Double height, double width
    escpos += 'Galaxy Garden\n'
    escpos += '\x1B\x21\x00' // Normal text
    escpos += 'Restaurant & Bar\n'
    escpos += '====================\n'
    escpos += '123, Main Street\n'
    escpos += 'City, State - 123456\n'
    escpos += 'Phone: +91 98765 43210\n'
    escpos += 'GSTIN: 29ABCDE1234F1Z5\n'
    escpos += '====================\n'
    escpos += 'BILL / INVOICE\n'
    escpos += '====================\n\n'
    
    // Order Info
    escpos += '\x1B\x61\x00' // Left align
    escpos += `Bill No: ${selectedOrderForBilling.id.slice(0, 8)}\n`
    escpos += `Date: ${new Date(selectedOrderForBilling.created_at).toLocaleDateString()}\n`
    escpos += `Time: ${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}\n`
    escpos += `Table: ${selectedOrderForBilling.tables?.table_number}\n`
    escpos += `Waiter: ${selectedOrderForBilling.users?.name}\n`
    escpos += `Customer: ${selectedOrderForBilling.customer_name || 'Guest'}\n`
    escpos += '--------------------\n\n'
    
    // Items Header
    escpos += '\x1B\x21\x08' // Bold
    escpos += 'ITEM           QTY  PRICE   TOTAL\n'
    escpos += '--------------------\n'
    escpos += '\x1B\x21\x00' // Normal
    
    // Items
    selectedOrderForBilling.order_items?.forEach((item: any) => {
      const name = item.dishes?.name || 'Unknown'
      const qty = item.quantity
      const price = (item.dishes?.price || item.price || 0).toFixed(2)
      const total = ((item.dishes?.price || item.price || 0) * item.quantity).toFixed(2)
      
      // Format: Item name (12 chars), Qty (2), Price (7), Total (7)
      const itemName = name.length > 12 ? name.substring(0, 11) + '.' : name
      escpos += `${itemName.padEnd(12)} ${qty.toString().padStart(2)}  Rs.${price.padStart(5)}  Rs.${total.padStart(5)}\n`
    })
    
    escpos += '----------------------------\n\n'
    
    // Totals
    const subtotal = selectedOrderForBilling.total_amount
    const discount = calculateDiscountValue(subtotal)
    const finalAmount = calculateFinalAmount(subtotal)
    
    escpos += '\x1B\x61\x00' // Left align
    escpos += `Subtotal:         Rs.${subtotal.toFixed(2)}\n`
    
    if (discount > 0) {
      escpos += `Discount:        -Rs.${discount.toFixed(2)}\n`
    }
    
    escpos += '\x1B\x21\x30' // Double height, double width
    escpos += `GRAND TOTAL:      Rs.${finalAmount.toFixed(2)}\n`
    escpos += '\x1B\x21\x00' // Normal text
    
    // Footer
    escpos += '\n\n'
    escpos += '\x1b\x61\x01' // Center align
    escpos += 'Thank You for Dining!\n'
    escpos += 'Visit Us Again\n'
    escpos += '====================\n'
    escpos += 'Developed by onethynk techmedia\n'
    escpos += '====================\n'
    escpos += '\n' // Blank line at the end for proper printing
    
    // Cut paper
    escpos += '\x1D\x56\x00' // Cut paper
    
    return escpos
  }

  // Direct Print Function using CUPS API
  const handleThermalPrint = async () => {
    if (!selectedOrderForBilling) return
    
    try {
      console.log('Starting thermal print...')
      
      // Generate ESC/POS formatted bill content for thermal printer with proper font sizing
      let billContent = ''
      
      // Initialize printer
      billContent += '\x1B\x40' // Initialize
      
      // Hotel Header - Double height, double width, centered
      billContent += '\x1B\x61\x01' // Center align
      billContent += '\x1B\x21\x30' // Double height, double width
      billContent += 'GALAXY GARDEN\n'
      billContent += '\x1B\x21\x00' // Normal text
      billContent += 'Restaurant & Bar\n'
      billContent += '================================\n'
      billContent += '123, Main Street\n'
      billContent += 'City, State - 123456\n'
      billContent += 'Phone: +91 98765 43210\n'
      billContent += 'GSTIN: 29ABCDE1234F1Z5\n'
      billContent += '================================\n'
      billContent += 'BILL / INVOICE\n'
      billContent += '================================\n\n'
      
      // Order Info - Normal size, left aligned
      billContent += '\x1B\x61\x00' // Left align
      billContent += `Bill No: ${selectedOrderForBilling.id.slice(0, 8)}\n`
      billContent += `Date: ${new Date(selectedOrderForBilling.created_at).toLocaleDateString()}\n`
      billContent += `Time: ${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}\n`
      billContent += `Table: ${selectedOrderForBilling.tables?.table_number}\n`
      billContent += `Waiter: ${selectedOrderForBilling.users?.name}\n`
      billContent += `Customer: ${selectedOrderForBilling.customer_name || 'Guest'}\n`
      billContent += '--------------------------------\n'
      
      // Items Header - Very small font, bold
      billContent += '\x1B\x21\x01' // Small font
      billContent += '\x1B\x21\x09' // Bold
      billContent += 'ITEM           TYPE    QTY    PRICE    TOTAL\n'
      billContent += '----------------------------------------\n'
      billContent += '\x1B\x21\x00' // Normal
      
      // Items - Very small font, proper one line format for table orders
      billContent += '\x1B\x21\x01' // Small font
      selectedOrderForBilling.order_items?.forEach((item: any) => {
        const name = item.dishes?.name || 'Unknown'
        const qty = item.quantity
        const price = (item.dishes?.price || item.price || 0).toFixed(2)
        const total = ((item.dishes?.price || item.price || 0) * item.quantity).toFixed(2)
        const dishType = item.dish_type || ''
        
        // Format: Item name (12 chars), Type (6), Qty (2), Price (7), Total (7) - ensure one line
        const itemName = name.length > 12 ? name.substring(0, 11) + '.' : name
        const typeStr = dishType.length > 6 ? dishType.substring(0, 5) + '.' : dishType
        billContent += `${itemName.padEnd(12)} ${typeStr.padEnd(6)} ${qty.toString().padStart(2)}  Rs.${price.padStart(5)}  Rs.${total.padStart(5)}\n`
      })
      billContent += '\x1B\x21\x00' // Normal text
      
      billContent += '--------------------------------\n'
      
      // Totals - Proper format matching invoice
      const subtotal = selectedOrderForBilling.total_amount
      const discount = calculateDiscountValue(subtotal)
      const finalAmount = calculateFinalAmount(subtotal)
      
      billContent += `Subtotal:       Rs.${subtotal.toFixed(2)}\n`
      
      if (discount > 0) {
        billContent += `Discount:        -Rs.${discount.toFixed(2)}\n`
      }
      
      // Grand Total - Bold but normal size (professional but not too large)
      billContent += '\x1B\x21\x08' // Bold
      billContent += `GRAND TOTAL:    Rs.${finalAmount.toFixed(2)}\n`
      billContent += '\x1B\x21\x00' // Normal text
      
      // Footer - Centered, smaller size for developer credit
      billContent += '\n'
      billContent += '\x1b\x61\x01' // Center align
      billContent += '================================\n'
      billContent += 'Thank You for Dining!\n'
      billContent += 'Visit Us Again\n'
      billContent += '================================\n'
      billContent += '\x1B\x4D\x01' // Font B (condensed/smaller)
      billContent += 'Developed by onethynk techmedia\n'
      billContent += '\x1B\x4D\x00' // Font A (normal)
      billContent += '================================\n'
      billContent += '\n \n' // Blank line at the end for proper printing
      
      // Cut paper
      billContent += '\x1D\x56\x00' // Cut paper
      
      console.log('Bill content generated, sending to API...')
      console.log('Bill content:', billContent)
      
      // Send to backend API for direct printing
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billContent }),
      })
      
      console.log('API response received:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Print response:', data)
        
        if (data.success) {
          alert('Bill sent to printer successfully!')
        } else if (data.fallback) {
          // Fallback to browser print if server-side printing is not available
          console.log('Using browser print fallback')
          alert('Direct printing not available. Opening browser print dialog...')
          // Create a printable version of the bill
          const printWindow = window.open('', '_blank')
          if (printWindow) {
            const printableContent = billContent
              .replace(/\x1B\x40/g, '') // Remove initialize
              .replace(/\x1B\x61\x01/g, '<div style="text-align: center;">') // Center align
              .replace(/\x1B\x61\x00/g, '</div><div style="text-align: left;">') // Left align
              .replace(/\x1B\x45\x01/g, '<b>') // Bold on
              .replace(/\x1B\x45\x00/g, '</b>') // Bold off
              .replace(/\x1D\x21\x11/g, '<span style="font-size: 24px;">') // Double height/width
              .replace(/\x1D\x21\x00/g, '</span>') // Normal size
              .replace(/\x1B\x4D\x00/g, '<span style="font-size: 12px;">') // Font A
              .replace(/\x1B\x4D\x01/g, '<span style="font-size: 16px;">') // Font B
              .replace(/\x1D\x56\x00/g, '') // Remove cut command
              .replace(/\n/g, '<br>')
            
            printWindow.document.write(`
              <html>
                <head>
                  <title>Print Bill</title>
                  <style>
                    body { font-family: monospace; padding: 20px; }
                    @media print { body { padding: 0; } }
                  </style>
                </head>
                <body>${printableContent}</body>
              </html>
            `)
            printWindow.document.close()
            printWindow.print()
          }
        } else {
          throw new Error(data.error || 'Print failed')
        }
      } else {
        const errorData = await response.json()
        console.error('Print API error:', errorData)
        throw new Error(errorData.error || 'Print API failed')
      }
    } catch (error) {
      console.error('Direct printing failed:', error)
      alert('Printing failed: ' + (error as Error).message + '\n\nCheck browser console for details.')
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

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => !['completed', 'paid'].includes(o.status)).length,
    totalRevenue: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
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
            <div className="flex items-center gap-2">
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
                            supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
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
                              supabase.from('notifications').update({ is_read: true }).eq('id', notification.id)
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
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.totalOrders}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Active Orders</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.activeOrders}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Utensils className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Total Revenue</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">₹{stats.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Total Customers</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.totalCustomers}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <UserIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>
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
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports & Analytics</h2>
            <Reports orders={orders} payments={payments} dishes={dishes} />
          </>
        )}
      </main>

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
                              <td className="px-4 py-2 text-sm text-right text-gray-600">Rs.{item.price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">Rs.{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700">Total Amount:</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          Rs.{order.total_amount.toFixed(2)}
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
          <div id="bill-modal" className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto text-center">
            <div className="flex justify-between items-center mb-6 no-print">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Print Bill
              </h2>
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-green-200 rounded-xl p-6 bg-white">
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-green-300">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">
                  Galaxy Garden
                </h1>
                <p className="text-sm font-semibold text-gray-700 mb-1">Restaurant & Bar</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>123, Main Street, City, State - 123456</p>
                  <p>Phone: +91 98765 43210</p>
                  <p>GSTIN: 29ABCDE1234F1Z5</p>
                </div>
                <p className="text-sm font-bold text-gray-800 mt-3 border-t border-dashed border-gray-300 pt-2">BILL / INVOICE</p>
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
                  <span>Bill No: {selectedOrderForBilling.id.slice(0, 8)}</span>
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
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl no-print">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Bill No</p>
                  <p className="text-lg font-bold text-gray-900">{selectedOrderForBilling.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Date</p>
                  <p className="text-lg font-bold text-gray-900">{new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Table</p>
                  <p className="text-lg font-bold text-gray-900">Table {selectedOrderForBilling.tables?.table_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Waiter</p>
                  <p className="text-lg font-bold text-gray-900">{selectedOrderForBilling.users?.name}</p>
                </div>
              </div>

              {/* Items */}
              <table className="w-full mb-6">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Item</th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedOrderForBilling.order_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">{item.dishes?.name}</td>
                      <td className="px-4 py-2 text-sm text-center text-gray-600">
                        {item.quantity}
                        {item.dish_type && (
                          <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                            {item.dish_type}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600">Rs.{item.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">Rs.{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Print-only items table */}
              <div className="print-only mb-2">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-bold text-black uppercase">Item</th>
                      <th className="text-center text-xs font-bold text-black uppercase">Qty</th>
                      <th className="text-right text-xs font-bold text-black uppercase">Price</th>
                      <th className="text-right text-xs font-bold text-black uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderForBilling.order_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="text-xs text-black">{item.dishes?.name}</td>
                        <td className="text-xs text-center text-black">
                          {item.quantity}
                          {item.dish_type && ` (${item.dish_type})`}
                        </td>
                        <td className="text-xs text-right text-black">{item.price.toFixed(2)}</td>
                        <td className="text-xs text-right text-black">{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Discount Section (no-print) */}
              <div className="mb-6 p-4 bg-green-50 rounded-xl no-print">
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-sm font-semibold text-gray-700">Discount Type:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDiscountType('amount')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        discountType === 'amount' 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                          : 'bg-white text-gray-700 border-2 border-gray-200'
                      }`}
                    >
                      Amount (Rs.)
                    </button>
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        discountType === 'percentage' 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                          : 'bg-white text-gray-700 border-2 border-gray-200'
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
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="Enter discount amount in Rs."
                    />
                  ) : (
                    <input
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => {
                        setDiscountPercentage(e.target.value)
                        setDiscountAmount('')
                      }}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400"
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
                  <p className="text-sm font-semibold text-gray-600">Customer</p>
                  <p className="text-lg font-bold text-gray-900">{selectedOrderForBilling.customer_name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Date</p>
                  <p className="text-lg font-bold text-gray-900">{new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t-2 border-green-300 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-700">Subtotal</span>
                  <span className="text-xl font-bold text-gray-900">Rs.{selectedOrderForBilling.total_amount.toFixed(2)}</span>
                </div>
                {calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">
                      Discount ({discountType === 'amount' ? 'Rs.' : '%'}{discountType === 'amount' ? discountAmount : discountPercentage})
                    </span>
                    <span className="text-xl font-bold text-red-600">
                      -Rs.{calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t-2 border-green-300 pt-3">
                  <span className="text-xl font-bold text-gray-900">GRAND TOTAL</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Rs.{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Print-only totals */}
              <div className="print-only mb-2 pb-2 border-t border-dashed border-black">
                <div className="flex justify-between text-xs text-black mt-2">
                  <span>Subtotal:</span>
                  <span>Rs.{selectedOrderForBilling.total_amount.toFixed(2)}</span>
                </div>
                {calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 && (
                  <div className="flex justify-between text-xs text-black mt-1">
                    <span>Discount ({discountType === 'amount' ? 'Rs.' : '%'}{discountType === 'amount' ? discountAmount : discountPercentage}):</span>
                    <span>-Rs.{calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-black mt-2 pt-2 border-t border-dashed border-black">
                  <span>GRAND TOTAL:</span>
                  <span>Rs.{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}</span>
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

            <div className="flex gap-3 no-print">
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Close
              </button>
              
              <button
                onClick={async () => {
                  // Use thermal print API since browser can't access EC58B
                  await handleThermalPrint()
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
