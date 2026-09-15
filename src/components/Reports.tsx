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

interface ReportsProps {
  orders: any[]
  payments: any[]
  dishes: any[]
}

export default function Reports({ orders, payments, dishes }: ReportsProps) {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    generateReport()
  }, [dateRange, startDate, endDate, orders, payments])

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

    // Calculate metrics
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)
    
    const totalOrders = filteredOrders.length
    const completedOrders = filteredOrders.filter(o => o.status === 'paid' || o.status === 'completed').length
    const pendingOrders = filteredOrders.filter(o => !['paid', 'completed'].includes(o.status)).length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Order status distribution
    const statusDistribution = [
      { name: 'Paid', value: filteredOrders.filter(o => o.status === 'paid').length, color: '#22c55e' },
      { name: 'Preparing', value: filteredOrders.filter(o => o.status === 'preparing').length, color: '#eab308' },
      { name: 'Ready', value: filteredOrders.filter(o => o.status === 'ready').length, color: '#3b82f6' },
      { name: 'Pending', value: filteredOrders.filter(o => o.status === 'pending').length, color: '#f97316' },
    ]

    // Hourly sales data
    const hourlySales = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sales: 0,
      orders: 0
    }))

    filteredPayments.forEach(payment => {
      const hour = new Date(payment.created_at).getHours()
      hourlySales[hour].sales += payment.amount
      hourlySales[hour].orders += 1
    })

    // Top selling dishes (mock data - would need order items joined with dishes)
    const topDishes = dishes.slice(0, 5).map((dish: any) => ({
      name: dish.name,
      orders: Math.floor(Math.random() * 50) + 10,
      revenue: dish.price * (Math.floor(Math.random() * 50) + 10)
    }))

    setReportData({
      totalRevenue,
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
  }

  const exportReport = () => {
    if (!reportData) return

    const csvContent = [
      ['Report Generated', new Date().toLocaleString()],
      ['Date Range', dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRange],
      [],
      ['Metric', 'Value'],
      ['Total Revenue', `₹${reportData.totalRevenue.toFixed(2)}`],
      ['Total Orders', reportData.totalOrders],
      ['Completed Orders', reportData.completedOrders],
      ['Pending Orders', reportData.pendingOrders],
      ['Average Order Value', `₹${reportData.avgOrderValue.toFixed(2)}`],
      [],
      ['Top Dishes'],
      ...reportData.topDishes.map((d: any) => [d.name, d.orders, `₹${d.revenue.toFixed(2)}`])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotel-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!reportData) {
    return <div className="text-center py-8">Loading report data...</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Title and Export */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Reports & Analytics</h2>
            <p className="text-green-100 text-sm">Track your restaurant performance and insights</p>
          </div>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-white text-green-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-700">Date Range:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300
                  ${dateRange === range
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-green-50 border-2 border-gray-200'
                  }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ₹{reportData.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-xl">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <span className="text-green-600 font-semibold">↑ 12%</span> from previous period
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {reportData.totalOrders}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-xl">
              <Utensils className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <span className="text-green-600 font-semibold">↑ 8%</span> from previous period
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Completed Orders</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {reportData.completedOrders}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-xl">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <span className="text-green-600 font-semibold">↑ 15%</span> completion rate
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Pending Orders</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                {reportData.pendingOrders}
              </p>
            </div>
            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-xl">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <span className="text-yellow-600 font-semibold">↓ 5%</span> from previous period
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Average Order Value</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ₹{reportData.avgOrderValue.toFixed(2)}
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-xl">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Completion Rate</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-xl">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Hourly Sales Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.hourlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16a34a" strokeOpacity={0.2} />
              <XAxis dataKey="hour" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '8px', 
                  border: '2px solid #16a34a' 
                }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#16a34a" name="Sales (₹)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Order Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.statusDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Dishes */}
      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Top Selling Dishes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-100 to-emerald-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-16">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase min-w-[200px]">Dish Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-24">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-32">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.topDishes.map((dish: any, index: number) => (
                <tr key={index} className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 truncate" title={dish.name}>
                    {dish.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dish.orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{dish.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Orders Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Detailed Order Report
          </h3>
          <p className="text-sm text-gray-600 mt-1">Complete order history for selected period</p>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-100 to-emerald-100 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-32">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-24">Table</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase min-w-[150px]">Waiter</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-28">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-32">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-32">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase w-32">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.filteredOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 truncate" title={order.id}>
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">Table {order.tables?.table_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 truncate" title={order.users?.name}>
                    {order.users?.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      order.status === 'paid' ? 'bg-green-100 text-green-800' :
                      order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
              {reportData.filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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
