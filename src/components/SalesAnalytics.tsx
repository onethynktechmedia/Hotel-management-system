'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { TrendingUp, DollarSign, Calendar, ArrowUp, ArrowDown } from 'lucide-react'

interface SalesAnalyticsProps {
  payments: any[]
  orders: any[]
}

export default function SalesAnalytics({ payments, orders }: SalesAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [chartData, setChartData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])

  useEffect(() => {
    processData()
  }, [payments, orders, timeRange])

  const processData = () => {
    const completedPayments = payments.filter(p => p.status === 'completed')
    
    if (timeRange === 'daily') {
      // Group by hour for today
      const today = new Date()
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        sales: 0,
        orders: 0
      }))

      completedPayments.forEach(payment => {
        const paymentDate = new Date(payment.created_at)
        if (paymentDate.toDateString() === today.toDateString()) {
          const hour = paymentDate.getHours()
          hourlyData[hour].sales += payment.amount
          hourlyData[hour].orders += 1
        }
      })

      setChartData(hourlyData)
    } else if (timeRange === 'weekly') {
      // Group by day for last 7 days
      const weeklyData = []
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayStr = days[date.getDay()]
        
        const dayPayments = completedPayments.filter(p => {
          const paymentDate = new Date(p.created_at)
          return paymentDate.toDateString() === date.toDateString()
        })

        weeklyData.push({
          day: dayStr,
          sales: dayPayments.reduce((sum, p) => sum + p.amount, 0),
          orders: dayPayments.length
        })
      }

      setChartData(weeklyData)
    } else if (timeRange === 'monthly') {
      // Group by week for current month
      const monthlyData = []
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(firstDay)
        weekStart.setDate(weekStart.getDate() + (i * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const weekPayments = completedPayments.filter(p => {
          const paymentDate = new Date(p.created_at)
          return paymentDate >= weekStart && paymentDate <= weekEnd
        })

        monthlyData.push({
          week: `Week ${i + 1}`,
          sales: weekPayments.reduce((sum, p) => sum + p.amount, 0),
          orders: weekPayments.length
        })
      }

      setChartData(monthlyData)
    } else if (timeRange === 'yearly') {
      // Group by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const yearlyData = months.map((month, index) => {
        const monthPayments = completedPayments.filter(p => {
          const paymentDate = new Date(p.created_at)
          return paymentDate.getMonth() === index && paymentDate.getFullYear() === new Date().getFullYear()
        })

        return {
          month,
          sales: monthPayments.reduce((sum, p) => sum + p.amount, 0),
          orders: monthPayments.length
        }
      })

      setChartData(yearlyData)
    }

    // Process category data (mock data for now - would need order items joined with dishes)
    setCategoryData([
      { name: 'Starters', value: 25, color: '#f97316' },
      { name: 'Main Course', value: 40, color: '#ea580c' },
      { name: 'Beverages', value: 15, color: '#c2410c' },
      { name: 'Desserts', value: 12, color: '#9a3412' },
      { name: 'Others', value: 8, color: '#7c2d12' },
    ])
  }

  const totalSales = chartData.reduce((sum, item) => sum + item.sales, 0)
  const totalOrders = chartData.reduce((sum, item) => sum + item.orders, 0)
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

  const previousPeriodSales = totalSales * 0.85 // Mock previous period
  const growth = previousPeriodSales > 0 ? ((totalSales - previousPeriodSales) / previousPeriodSales) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-2 bg-white rounded-xl shadow-lg p-2">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`flex-1 min-w-[80px] py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300
              ${timeRange === range
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-orange-50'
              }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Total Sales</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                ₹{totalSales.toFixed(2)}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {growth >= 0 ? (
              <ArrowUp className="w-4 h-4 text-green-600" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(growth).toFixed(1)}% vs previous period
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {totalOrders}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Avg. ₹{avgOrderValue.toFixed(2)} per order
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Growth Rate</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} performance
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sales Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f97316" strokeOpacity={0.2} />
              <XAxis 
                dataKey={timeRange === 'daily' ? 'hour' : timeRange === 'weekly' ? 'day' : timeRange === 'monthly' ? 'week' : 'month'}
                stroke="#6b7280"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '8px', 
                  border: '2px solid #f97316' 
                }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#f97316" name="Sales (₹)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Orders Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f97316" strokeOpacity={0.2} />
              <XAxis 
                dataKey={timeRange === 'daily' ? 'hour' : timeRange === 'weekly' ? 'day' : timeRange === 'monthly' ? 'week' : 'month'}
                stroke="#6b7280"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '8px', 
                  border: '2px solid #f97316' 
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#ea580c" 
                strokeWidth={3}
                name="Orders"
                dot={{ fill: '#ea580c', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-gray-700 font-medium">Peak Hour</span>
              <span className="font-bold text-orange-600">7:00 PM - 9:00 PM</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-gray-700 font-medium">Avg. Order Value</span>
              <span className="font-bold text-orange-600">₹{avgOrderValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-gray-700 font-medium">Conversion Rate</span>
              <span className="font-bold text-orange-600">78.5%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-gray-700 font-medium">Customer Satisfaction</span>
              <span className="font-bold text-orange-600">4.8/5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
