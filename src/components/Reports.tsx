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
  Utensils, 
  Filter,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react'

// Utility function to format order ID as GGR-XXX
const formatOrderId = (orderId: string) => {
  // Extract a number from the UUID and format it
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1 // Ensure it's between 1-999
  return `GGR-${String(orderNumber).padStart(3, '0')}`
}

interface ReportsProps {
  orders: any[]
  payments: any[]
  dishes: any[]
}

export default function Reports({ orders, payments, dishes }: ReportsProps) {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    generateReport()
  }, [dateRange, startDate, endDate, orders, payments, dishes])

  const generateReport = () => {
    let filteredOrders = [...orders]
    let filteredPayments = [...payments]

    console.log('Reports - Orders:', orders.length)
    console.log('Reports - Orders Data:', orders)
    console.log('Reports - Payments:', payments.length)
    console.log('Reports - Dishes:', dishes.length)
    console.log('Reports - Filtered Orders:', filteredOrders.length)
    console.log('Reports - Filtered Payments:', filteredPayments.length)

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
    } else if (dateRange === 'custom' && !startDate && !endDate) {
      // If custom range selected but no dates, show all data
      filteredOrders = [...orders]
      filteredPayments = [...payments]
    }

    // Calculate metrics
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)

    // Calculate revenue from orders directly (fallback if no payments)
    const orderRevenue = filteredOrders
      .filter(o => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0)

    // Use the higher of payment revenue or order revenue
    const finalRevenue = Math.max(totalRevenue, orderRevenue)

    const totalOrders = filteredOrders.length
    const completedOrders = filteredOrders.filter(o => o.status === 'paid' || o.status === 'completed').length
    const pendingOrders = filteredOrders.filter(o => !['paid', 'completed'].includes(o.status)).length
    const avgOrderValue = totalOrders > 0 ? finalRevenue / totalOrders : 0

    // Order status distribution
    const statusDistribution = [
      { name: 'Paid', value: filteredOrders.filter(o => o.status === 'paid').length, color: '#22c55e' },
      { name: 'Preparing', value: filteredOrders.filter(o => o.status === 'preparing').length, color: '#eab308' },
      { name: 'Ready', value: filteredOrders.filter(o => o.status === 'ready').length, color: '#3b82f6' },
      { name: 'Pending', value: filteredOrders.filter(o => o.status === 'pending').length, color: '#f97316' },
    ]

    // Hourly sales data - use order data for better accuracy
    const hourlySales = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sales: 0,
      orders: 0
    }))

    filteredOrders.forEach(order => {
      if (order.status === 'paid' || order.status === 'completed') {
        const hour = new Date(order.created_at).getHours()
        hourlySales[hour].sales += order.total_amount || 0
        hourlySales[hour].orders += 1
      }
    })

    // Top selling dishes - calculate from order items
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
    console.log('Reports - Dish Sales:', dishSales)
    const topDishes = Object.values(dishSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    setReportData({
      totalRevenue: finalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      avgOrderValue,
      statusDistribution,
      hourlySales,
      topDishes,
      filteredOrders,
      filteredPayments
    })

    console.log('Reports - Generated Data:', {
      totalRevenue: finalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      avgOrderValue,
      topDishesCount: topDishes.length
    })
  }

  const exportReport = () => {
    if (!reportData) return

    let csvContent = 'Hotel Management System - Sales Report\n'
    csvContent += `Generated: ${new Date().toLocaleString()}\n`
    csvContent += `Date Range: ${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRange}\n`
    csvContent += '\n'

    // Summary Section
    csvContent += 'SUMMARY METRICS\n'
    csvContent += 'Metric,Value\n'
    csvContent += `Total Revenue,₹${reportData.totalRevenue.toFixed(2)}\n`
    csvContent += `Total Orders,${reportData.totalOrders}\n`
    csvContent += `Completed Orders,${reportData.completedOrders}\n`
    csvContent += `Pending Orders,${reportData.pendingOrders}\n`
    csvContent += `Average Order Value,₹${reportData.avgOrderValue.toFixed(2)}\n`
    csvContent += `Completion Rate,${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%\n`
    csvContent += '\n'

    // Top Dishes Section
    csvContent += 'TOP SELLING DISHES\n'
    csvContent += 'Rank,Dish Name,Orders,Revenue\n'
    reportData.topDishes.forEach((dish: any, index: number) => {
      csvContent += `${index + 1},"${dish.name}",${dish.orders},₹${dish.revenue.toFixed(2)}\n`
    })
    csvContent += '\n'

    // Order Details Section
    csvContent += 'ORDER DETAILS\n'
    csvContent += 'Order ID,Table,Waiter,Status,Amount,Date,Time\n'
    reportData.filteredOrders.forEach((order: any) => {
      csvContent += `"${formatOrderId(order.id)}",${order.tables?.table_number},"${order.users?.name || 'N/A'}",${order.status},₹${order.total_amount.toFixed(2)},${new Date(order.created_at).toLocaleDateString()},${new Date(order.created_at).toLocaleTimeString()}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotel-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading report data...</div>
        <div className="text-xs text-gray-400 mt-2">
          Orders: {orders.length} | Payments: {payments.length} | Dishes: {dishes.length}
        </div>
        {orders.length === 0 && (
          <div className="text-xs text-orange-500 mt-2">
            No orders found. Create some orders to see reports.
          </div>
        )}
      </div>
    )
  }

  if (reportData.totalOrders === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-8 max-w-md mx-auto">
          <Utensils className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">
            There are no orders for the selected date range ({dateRange}).
          </p>
          <p className="text-sm text-gray-500">
            Try selecting a different date range or create some orders.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header with Title and Export */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-lg shadow-md p-2 sm:p-3 md:p-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 sm:gap-2">
            <div>
              <h2 className="text-sm sm:text-base md:text-xl font-bold mb-0.5">Reports & Analytics</h2>
              <p className="text-green-100 text-[10px] sm:text-xs">Track your restaurant performance</p>
            </div>
            <button
              onClick={exportReport}
              className="flex items-center justify-center gap-1 bg-white text-green-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-semibold hover:shadow-md transition-all duration-300 text-[10px] sm:text-xs"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="bg-green-100 p-1 sm:p-1.5 rounded-md">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
            </div>
            <span className="font-bold text-gray-800 text-[10px] sm:text-xs">Date Range</span>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {(['today', 'week', 'month', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all duration-300
                  ${dateRange === range
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-green-50 border border-gray-200 hover:border-green-300'
                  }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex gap-1 sm:gap-1.5 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-200 rounded-md focus:border-green-500 focus:outline-none text-[10px] sm:text-xs flex-1"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-200 rounded-md focus:border-green-500 focus:outline-none text-[10px] sm:text-xs flex-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards - Overview Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">₹{reportData.totalRevenue.toFixed(0)}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Total Revenue</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">{reportData.totalOrders}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Total Orders</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">{reportData.completedOrders}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Completed</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">{reportData.pendingOrders}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Pending</p>
        </div>
      </div>

      {/* Additional Metrics - Overview Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">₹{reportData.avgOrderValue.toFixed(0)}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Avg Order Value</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">
              {reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Completion Rate</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {/* Hourly Sales Chart */}
        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
            Hourly Sales
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={reportData.hourlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" stroke="#6b7280" fontSize={7} />
              <YAxis stroke="#6b7280" fontSize={7} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#16a34a" name="Sales (₹)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-1">
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
            Order Status
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={reportData.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={35}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.statusDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Dishes */}
      <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 shadow-sm hover:shadow-md transition-all duration-300">
        <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
          Top Selling Dishes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[250px] sm:min-w-[400px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase rounded-tl-md">Rank</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase">Dish Name</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase">Orders</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase rounded-tr-md">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.topDishes.map((dish: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-1.5 sm:px-2 py-1 whitespace-nowrap">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-[9px] sm:text-[10px]">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] font-semibold text-gray-900 truncate" title={dish.name}>
                    {dish.name}
                  </td>
                  <td className="px-1.5 sm:px-2 py-1 whitespace-nowrap text-[9px] sm:text-[10px] text-gray-900">{dish.orders}</td>
                  <td className="px-1.5 sm:px-2 py-1 whitespace-nowrap text-[9px] sm:text-[10px] font-bold text-gray-900">₹{dish.revenue.toFixed(2)}</td>
                </tr>
              ))}
              {reportData.topDishes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-1.5 sm:px-2 py-3 text-center text-gray-500 text-[9px] sm:text-[10px]">
                    No dish data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Orders Table */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="p-1.5 sm:p-2 border-b border-gray-200 bg-gray-50">
          <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 flex items-center gap-1">
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
            Order Report
          </h3>
          <p className="text-[9px] sm:text-[10px] text-gray-600 mt-0.5">Complete order history for selected period</p>
        </div>
        <div className="overflow-x-auto max-h-40 sm:max-h-56 md:max-h-72 overflow-y-auto">
          <table className="w-full min-w-[350px] sm:min-w-[600px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase rounded-tl-md">Order ID</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase">Table</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase">Waiter</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase">Status</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase">Amount</th>
                <th className="hidden sm:table-cell px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase">Date</th>
                <th className="hidden sm:table-cell px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase rounded-tr-md">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.filteredOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] font-semibold text-gray-900 truncate" title={order.id}>
                    {formatOrderId(order.id)}
                  </td>
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] text-gray-900">Table {order.tables?.table_number}</td>
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] text-gray-900 truncate" title={order.users?.name}>
                    {order.users?.name}
                  </td>
                  <td className="px-1.5 sm:px-2 py-1">
                    <span className={`px-0.5 sm:px-1 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                      order.status === 'paid' ? 'bg-green-100 text-green-800' :
                      order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</td>
                  <td className="hidden sm:table-cell px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="hidden sm:table-cell px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
              {reportData.filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-1.5 sm:px-2 py-3 text-center text-gray-500 text-[9px] sm:text-[10px]">
                    No orders found for the selected date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
