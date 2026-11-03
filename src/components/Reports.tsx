'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  UtensilsCrossed,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  FileDown,
  Printer,
  Table as TableIcon,
  ChefHat,
  UserCheck,
  CreditCard,
  X
} from 'lucide-react'
import { playClickSound, playSuccessSound, playErrorSound } from '@/lib/sound-effects'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Utility function to format order ID as DPK-XXX
const formatOrderId = (orderId: string) => {
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1
  return `DPK-${String(orderNumber).padStart(3, '0')}`
}

interface ReportsProps {
  orders: any[]
  payments: any[]
  dishes: any[]
  tables: any[]
}

export default function Reports({ orders, payments, dishes, tables }: ReportsProps) {
  const [reportType, setReportType] = useState<'sales' | 'orders' | 'tables' | 'dishes' | 'staff'>('sales')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTable, setSelectedTable] = useState<string>('all')
  const [selectedWaiter, setSelectedWaiter] = useState<string>('all')
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'upi' | 'card'>('all')
  const [foodTypeFilter, setFoodTypeFilter] = useState<'all' | 'veg' | 'nonveg'>('all')
  const [reportData, setReportData] = useState<any>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf')

  useEffect(() => {
    generateReport()
  }, [reportType, dateRange, startDate, endDate, selectedTable, selectedWaiter, paymentMethod, foodTypeFilter, orders, payments, dishes, tables])

  const generateReport = () => {
    let filteredOrders = [...orders]
    let filteredPayments = [...payments]

    // Filter by date range
    if (dateRange === 'today') {
      const today = new Date().toDateString()
      filteredOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
      filteredPayments = payments.filter(p => new Date(p.created_at).toDateString() === today)
    } else if (dateRange === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filteredOrders = orders.filter(o => new Date(o.created_at) >= weekAgo)
      filteredPayments = payments.filter(p => new Date(p.created_at) >= weekAgo)
    } else if (dateRange === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filteredOrders = orders.filter(o => new Date(o.created_at) >= monthAgo)
      filteredPayments = payments.filter(p => new Date(p.created_at) >= monthAgo)
    } else if (dateRange === 'custom' && startDate && endDate) {
      filteredOrders = orders.filter(o => {
        const date = new Date(o.created_at)
        return date >= new Date(startDate) && date <= new Date(endDate)
      })
      filteredPayments = payments.filter(p => {
        const date = new Date(p.created_at)
        return date >= new Date(startDate) && date <= new Date(endDate)
      })
    }

    // Filter by table
    if (selectedTable !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.table_id === selectedTable)
    }

    // Filter by waiter
    if (selectedWaiter !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.waiter_id === selectedWaiter)
    }

    // Filter by payment method
    if (paymentMethod !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.payment_method === paymentMethod)
    }

    // Filter by food type
    if (foodTypeFilter !== 'all') {
      filteredOrders = filteredOrders.filter((order: any) => {
        if (!order.order_items || order.order_items.length === 0) return false
        return order.order_items.some((item: any) => {
          const dish = item.dishes || item.dish
          return dish?.food_type === foodTypeFilter
        })
      })
    }

    // Calculate metrics based on report type
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)

    const orderRevenue = filteredOrders
      .filter(o => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0)

    const finalRevenue = Math.max(totalRevenue, orderRevenue)
    const totalOrders = filteredOrders.length
    const completedOrders = filteredOrders.filter(o => o.status === 'paid' || o.status === 'completed').length
    const avgOrderValue = totalOrders > 0 ? finalRevenue / totalOrders : 0

    // Status distribution
    const statusDistribution = [
      { name: 'Paid', value: filteredOrders.filter(o => o.status === 'paid').length, color: '#5D3A1A' },
      { name: 'Preparing', value: filteredOrders.filter(o => o.status === 'preparing').length, color: '#8B4513' },
      { name: 'Ready', value: filteredOrders.filter(o => o.status === 'ready').length, color: '#DEB887' },
      { name: 'Pending', value: filteredOrders.filter(o => o.status === 'pending').length, color: '#F5F5DC' },
    ]

    // Hourly sales data
    const hourlySales = Array.from({ length: 24 }, (_, i) => {
      const hour24 = i
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
      const period = hour24 < 12 ? 'AM' : 'PM'
      return {
        hour: `${hour12}:00 ${period}`,
        sales: 0,
        orders: 0
      }
    })

    filteredOrders.forEach(order => {
      if (order.status === 'paid' || order.status === 'completed') {
        const date = new Date(order.created_at)
        const hour24 = date.getHours()
        hourlySales[hour24].sales += order.total_amount || 0
        hourlySales[hour24].orders += 1
      }
    })

    // Top selling dishes
    const dishSales: { [key: string]: { name: string, orders: number, revenue: number } } = {}
    filteredOrders.forEach((order: any) => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach((item: any) => {
          const dishName = item.dishes?.name || item.dish?.name || 'Unknown'
          const price = item.price || 0
          if (!dishSales[dishName]) {
            dishSales[dishName] = { name: dishName, orders: 0, revenue: 0 }
          }
          dishSales[dishName].orders += item.quantity
          dishSales[dishName].revenue += price * item.quantity
        })
      }
    })
    const topDishes = Object.values(dishSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Table performance
    const tablePerformance = tables.map(table => {
      const tableOrders = filteredOrders.filter(o => o.table_id === table.id)
      const tableRevenue = tableOrders
        .filter(o => o.status === 'paid' || o.status === 'completed')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0)
      return {
        tableNumber: table.table_number,
        orders: tableOrders.length,
        revenue: tableRevenue,
        occupied: table.is_occupied
      }
    })

    setReportData({
      totalRevenue: finalRevenue,
      totalOrders,
      completedOrders,
      avgOrderValue,
      statusDistribution,
      hourlySales,
      topDishes,
      tablePerformance,
      filteredOrders,
      filteredPayments
    })
  }

  const exportPDF = () => {
    if (!reportData) return
    playSuccessSound()

    try {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(20)
      doc.setTextColor(93, 58, 26)
      doc.text('Dhole Patil Khanawal', 14, 20)

      doc.setFontSize(14)
      doc.setTextColor(100, 100, 100)
      doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, 14, 30)
      
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40)
      doc.text(`Date Range: ${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRange}`, 14, 47)

      // Summary section
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('SUMMARY', 14, 60)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Revenue: ₹${reportData.totalRevenue.toFixed(2)}`, 14, 68)
      doc.text(`Total Orders: ${reportData.totalOrders}`, 14, 75)
      doc.text(`Completed Orders: ${reportData.completedOrders}`, 14, 82)
      doc.text(`Average Order Value: ₹${reportData.avgOrderValue.toFixed(2)}`, 14, 89)

      // Orders table
      const tableData: string[][] = []
      reportData.filteredOrders.forEach((order: any) => {
        const billNo = formatOrderId(order.id)
        const tableNo = order.tables?.table_number || 'N/A'
        const payment = order.payment_method || 'Cash'
        const amount = order.total_amount || 0
        const status = order.status || 'Pending'
        const date = new Date(order.created_at).toLocaleDateString()
        
        tableData.push([billNo, tableNo, payment, amount.toFixed(2), status, date])
      })

      autoTable(doc, {
        startY: 100,
        head: [['Bill No', 'Table', 'Payment', 'Amount', 'Status', 'Date']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [93, 58, 26],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 220]
        }
      })

      doc.save(`${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`)
      setShowExportModal(false)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    }
  }

  const exportCSV = () => {
    if (!reportData) return
    playSuccessSound()

    let csvContent = ''
    
    if (reportType === 'sales') {
      csvContent = 'Bill No,Table No,Payment,Amount,Status,Date\n'
      reportData.filteredOrders.forEach((order: any) => {
        const billNo = formatOrderId(order.id)
        const tableNo = order.tables?.table_number || 'N/A'
        const payment = order.payment_method || 'Cash'
        const amount = order.total_amount || 0
        const status = order.status || 'Pending'
        const date = new Date(order.created_at).toLocaleDateString()
        
        csvContent += `"${billNo}","${tableNo}","${payment}",${amount.toFixed(2)},"${status}","${date}"\n`
      })
    } else if (reportType === 'tables') {
      csvContent = 'Table Number,Orders,Revenue,Status\n'
      reportData.tablePerformance.forEach((table: any) => {
        csvContent += `${table.tableNumber},${table.orders},${table.revenue.toFixed(2)},${table.occupied ? 'Occupied' : 'Available'}\n`
      })
    } else if (reportType === 'dishes') {
      csvContent = 'Dish Name,Orders,Revenue\n'
      reportData.topDishes.forEach((dish: any) => {
        csvContent += `"${dish.name}",${dish.orders},${dish.revenue.toFixed(2)}\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }

  const exportExcel = () => {
    if (!reportData) return
    playSuccessSound()

    let data: any[] = []
    
    if (reportType === 'sales') {
      data = reportData.filteredOrders.map((order: any) => ({
        'Bill No': formatOrderId(order.id),
        'Table': order.tables?.table_number || 'N/A',
        'Payment': order.payment_method || 'Cash',
        'Amount': order.total_amount || 0,
        'Status': order.status || 'Pending',
        'Date': new Date(order.created_at).toLocaleDateString()
      }))
    } else if (reportType === 'tables') {
      data = reportData.tablePerformance.map((table: any) => ({
        'Table Number': table.tableNumber,
        'Orders': table.orders,
        'Revenue': table.revenue,
        'Status': table.occupied ? 'Occupied' : 'Available'
      }))
    } else if (reportType === 'dishes') {
      data = reportData.topDishes.map((dish: any) => ({
        'Dish Name': dish.name,
        'Orders': dish.orders,
        'Revenue': dish.revenue
      }))
    }

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`)
    setShowExportModal(false)
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#5D3A1A] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-semibold text-gray-600">Loading report data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#5D3A1A] pt-5">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2 text-sm">Comprehensive business insights and performance metrics</p>
        </div>
        <button
          onClick={() => { playClickSound(); setShowExportModal(true) }}
          className="flex items-center gap-2 bg-[#5D3A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Report Type</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { playClickSound(); setReportType('sales') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                reportType === 'sales'
                  ? 'bg-[#5D3A1A] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Sales Report
            </button>
            <button
              onClick={() => { playClickSound(); setReportType('orders') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                reportType === 'orders'
                  ? 'bg-[#5D3A1A] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Orders Report
            </button>
            <button
              onClick={() => { playClickSound(); setReportType('tables') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                reportType === 'tables'
                  ? 'bg-[#5D3A1A] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              Table Performance
            </button>
            <button
              onClick={() => { playClickSound(); setReportType('dishes') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                reportType === 'dishes'
                  ? 'bg-[#5D3A1A] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Dish Analytics
            </button>
            <button
              onClick={() => { playClickSound(); setReportType('staff') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                reportType === 'staff'
                  ? 'bg-[#5D3A1A] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Staff Performance
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
            <div className="flex flex-wrap gap-2">
              {(['today', 'week', 'month', 'custom'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => { playClickSound(); setDateRange(range) }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    dateRange === range
                      ? 'bg-[#5D3A1A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
              {dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#5D3A1A] focus:outline-none"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#5D3A1A] focus:outline-none"
                  />
                </>
              )}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Table Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Table</label>
              <select
                value={selectedTable}
                onChange={(e) => { playClickSound(); setSelectedTable(e.target.value) }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#5D3A1A] focus:outline-none"
              >
                <option value="all">All Tables</option>
                {tables.map(table => (
                  <option key={table.id} value={table.id}>Table {table.table_number}</option>
                ))}
              </select>
            </div>

            {/* Waiter Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Waiter</label>
              <select
                value={selectedWaiter}
                onChange={(e) => { playClickSound(); setSelectedWaiter(e.target.value) }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#5D3A1A] focus:outline-none"
              >
                <option value="all">All Waiters</option>
                {/* Waiters would be fetched from orders */}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => { playClickSound(); setPaymentMethod(e.target.value as any) }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#5D3A1A] focus:outline-none"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            {/* Food Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Food Type</label>
              <select
                value={foodTypeFilter}
                onChange={(e) => { playClickSound(); setFoodTypeFilter(e.target.value as any) }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#5D3A1A] focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="veg">Veg</option>
                <option value="nonveg">Non-Veg</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Total Revenue</p>
              <p className="text-2xl font-bold text-[#5D3A1A]">₹{reportData.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
              <p className="text-2xl font-bold text-[#5D3A1A]">{reportData.totalOrders}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Completed</p>
              <p className="text-2xl font-bold text-[#5D3A1A]">{reportData.completedOrders}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Avg Order Value</p>
              <p className="text-2xl font-bold text-[#5D3A1A]">₹{reportData.avgOrderValue.toFixed(2)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Hourly Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.hourlySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#5D3A1A" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.statusDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {reportData.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Dishes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Dishes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F5DC]">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dish Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {reportData.topDishes.map((dish: any, index: number) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="px-6 py-3 font-semibold text-gray-900">{dish.name}</td>
                  <td className="px-6 py-3 text-gray-600">{dish.orders}</td>
                  <td className="px-6 py-3 font-bold text-[#5D3A1A]">₹{dish.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#5D3A1A]">Export Report</h2>
              <button
                onClick={() => { playClickSound(); setShowExportModal(false) }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Export Format</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => { playClickSound(); setExportFormat('pdf') }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      exportFormat === 'pdf'
                        ? 'border-[#5D3A1A] bg-[#5D3A1A] text-white'
                        : 'border-gray-200 hover:border-[#5D3A1A]'
                    }`}
                  >
                    <FileText className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-semibold">PDF</span>
                  </button>
                  <button
                    onClick={() => { playClickSound(); setExportFormat('csv') }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      exportFormat === 'csv'
                        ? 'border-[#5D3A1A] bg-[#5D3A1A] text-white'
                        : 'border-gray-200 hover:border-[#5D3A1A]'
                    }`}
                  >
                    <FileSpreadsheet className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-semibold">CSV</span>
                  </button>
                  <button
                    onClick={() => { playClickSound(); setExportFormat('excel') }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      exportFormat === 'excel'
                        ? 'border-[#5D3A1A] bg-[#5D3A1A] text-white'
                        : 'border-gray-200 hover:border-[#5D3A1A]'
                    }`}
                  >
                    <FileDown className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-semibold">Excel</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  if (exportFormat === 'pdf') exportPDF()
                  else if (exportFormat === 'csv') exportCSV()
                  else if (exportFormat === 'excel') exportExcel()
                }}
                className="w-full bg-[#5D3A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#8B4513] transition-all duration-300"
              >
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
