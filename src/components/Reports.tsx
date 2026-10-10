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
  FileDown
} from 'lucide-react'
import { playClickSound, playSuccessSound, playErrorSound } from '@/lib/sound-effects'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [foodTypeFilter, setFoodTypeFilter] = useState<'all' | 'veg' | 'nonveg'>('all')
  const [reportData, setReportData] = useState<any>(null)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    generateReport()
  }, [dateRange, startDate, endDate, foodTypeFilter, orders, payments, dishes])

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

    // Filter by food type (veg/nonveg)
    if (foodTypeFilter !== 'all') {
      filteredOrders = filteredOrders.filter((order: any) => {
        if (!order.order_items || order.order_items.length === 0) return false
        return order.order_items.some((item: any) => {
          const dish = item.dishes || item.dish
          return dish?.food_type === foodTypeFilter
        })
      })
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
      { name: 'Paid', value: filteredOrders.filter(o => o.status === 'paid').length, color: '#5D3A1A' },
      { name: 'Preparing', value: filteredOrders.filter(o => o.status === 'preparing').length, color: '#8B4513' },
      { name: 'Ready', value: filteredOrders.filter(o => o.status === 'ready').length, color: '#DEB887' },
      { name: 'Pending', value: filteredOrders.filter(o => o.status === 'pending').length, color: '#F5F5DC' },
    ]

    // Hourly sales data - 24 hours in AM/PM format (1-12 AM, 1-12 PM)
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

  const exportCSV = () => {
    if (!reportData) return
    playSuccessSound()

    // Calculate totals
    let totalFoodAmount = 0
    let totalDiscount = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalFoodTotal = 0

    // Check if any order has GST
    const hasGST = reportData.filteredOrders.some((order: any) => {
      const foodAmount = order.total_amount || 0
      const discount = order.discount_amount || 0
      return (foodAmount - discount) > 0
    })

    let csvContent = 'Bill No,Table No,Payment,Food Amount,Discount'
    if (hasGST) {
      csvContent += ',CGST,SGST'
    }
    csvContent += ',Food Total\n'
    
    reportData.filteredOrders.forEach((order: any) => {
      const billNo = formatOrderId(order.id)
      const tableNo = order.tables?.table_number || 'N/A'
      const payment = order.payment_method || 'Cash'
      const foodAmount = order.total_amount || 0
      const discount = order.discount_amount || 0
      const cgst = (foodAmount - discount) * 0.025
      const sgst = (foodAmount - discount) * 0.025
      const foodTotal = foodAmount - discount + cgst + sgst
      
      totalFoodAmount += foodAmount
      totalDiscount += discount
      totalCGST += cgst
      totalSGST += sgst
      totalFoodTotal += foodTotal
      
      csvContent += `"${billNo}","${tableNo}","${payment}",${foodAmount.toFixed(2)},${discount.toFixed(2)}`
      if (hasGST) {
        csvContent += `,${cgst.toFixed(2)},${sgst.toFixed(2)}`
      }
      csvContent += `,${foodTotal.toFixed(2)}\n`
    })

    // Add summary rows
    csvContent += '\nSUMMARY\n'
    csvContent += `Total Food Amount,${totalFoodAmount.toFixed(2)}\n`
    csvContent += `Total Discount,${totalDiscount.toFixed(2)}\n`
    if (hasGST) {
      csvContent += `Total CGST,${totalCGST.toFixed(2)}\n`
      csvContent += `Total SGST,${totalSGST.toFixed(2)}\n`
    }
    csvContent += `Total Sales,${totalFoodTotal.toFixed(2)}\n`
    csvContent += `Total Orders,${reportData.totalOrders}\n`
    csvContent += `Completed Orders,${reportData.completedOrders}\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotel-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }

  const exportPDF = () => {
    if (!reportData) return
    playSuccessSound()

    try {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(18)
      doc.setTextColor(139, 69, 19)
      doc.text('Dhole Patil Khanawal', 14, 20)

      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text('Sales Report', 14, 28)
      
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35)
      doc.text(`Date Range: ${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRange}`, 14, 42)

      // Calculate totals
      let totalFoodAmount = 0
      let totalDiscount = 0
      let totalCGST = 0
      let totalSGST = 0
      let totalFoodTotal = 0

      // Check if any order has GST
      const hasGST = reportData.filteredOrders.some((order: any) => {
        const foodAmount = order.total_amount || 0
        const discount = order.discount_amount || 0
        return (foodAmount - discount) > 0
      })

      // Prepare table data
      const tableData: string[][] = []
      reportData.filteredOrders.forEach((order: any) => {
        const billNo = formatOrderId(order.id)
        const tableNo = order.tables?.table_number || 'N/A'
        const payment = order.payment_method || 'Cash'
        const foodAmount = order.total_amount || 0
        const discount = order.discount_amount || 0
        const cgst = (foodAmount - discount) * 0.025
        const sgst = (foodAmount - discount) * 0.025
        const foodTotal = foodAmount - discount + cgst + sgst
        
        totalFoodAmount += foodAmount
        totalDiscount += discount
        totalCGST += cgst
        totalSGST += sgst
        totalFoodTotal += foodTotal
        
        const row = [billNo, tableNo, payment, foodAmount.toFixed(2), discount.toFixed(2)]
        if (hasGST) {
          row.push(cgst.toFixed(2), sgst.toFixed(2))
        }
        row.push(foodTotal.toFixed(2))
        tableData.push(row)
      })

      // Prepare table header
      const tableHeader = ['Bill No', 'Table No', 'Payment', 'Food Amount', 'Discount']
      if (hasGST) {
        tableHeader.push('CGST', 'SGST')
      }
      tableHeader.push('Food Total')

      // Add table using autoTable
      autoTable(doc, {
        startY: 50,
        head: [tableHeader],
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

      // Add summary at bottom
      const finalY = (doc as any).lastAutoTable.finalY + 10
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('SUMMARY', 14, finalY)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Food Amount: ₹${totalFoodAmount.toFixed(2)}`, 14, finalY + 7)
      doc.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`, 14, finalY + 14)
      if (hasGST) {
        doc.text(`Total CGST: ₹${totalCGST.toFixed(2)}`, 14, finalY + 21)
        doc.text(`Total SGST: ₹${totalSGST.toFixed(2)}`, 14, finalY + 28)
        doc.setFont('helvetica', 'bold')
        doc.text(`Total Sales: ₹${totalFoodTotal.toFixed(2)}`, 14, finalY + 35)
        doc.setFont('helvetica', 'normal')
        doc.text(`Total Orders: ${reportData.totalOrders}`, 14, finalY + 42)
        doc.text(`Completed Orders: ${reportData.completedOrders}`, 14, finalY + 49)
      } else {
        doc.setFont('helvetica', 'bold')
        doc.text(`Total Sales: ₹${totalFoodTotal.toFixed(2)}`, 14, finalY + 21)
        doc.setFont('helvetica', 'normal')
        doc.text(`Total Orders: ${reportData.totalOrders}`, 14, finalY + 28)
        doc.text(`Completed Orders: ${reportData.completedOrders}`, 14, finalY + 35)
      }

      doc.save(`hotel-report-${new Date().toISOString().split('T')[0]}.pdf`)
      setShowExportModal(false)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
          <UtensilsCrossed className="w-16 h-16 text-orange-500 mx-auto mb-4" />
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
      <div className="bg-[#5D3A1A] rounded-lg shadow-md p-2 sm:p-3 md:p-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 sm:gap-2">
            <div>
              <h2 className="text-sm sm:text-base md:text-xl font-bold mb-0.5">Reports & Analytics</h2>
              <p className="text-[#F5F5DC] text-[10px] sm:text-xs">Track your restaurant performance</p>
            </div>
            <button
              onClick={() => {
                playClickSound()
                setShowExportModal(true)
              }}
              className="flex items-center justify-center gap-1 bg-white text-[#5D3A1A] px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-semibold hover:shadow-md transition-all duration-300 text-[10px] sm:text-xs"
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
            <div className="bg-[#F5F5DC] p-1 sm:p-1.5 rounded-md">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#5D3A1A]" />
            </div>
            <span className="font-bold text-gray-800 text-[10px] sm:text-xs">Date Range</span>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {(['today', 'week', 'month', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  playClickSound()
                  setDateRange(range)
                }}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all duration-300
                  ${dateRange === range
                    ? 'bg-[#5D3A1A] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-[#F5F5DC] border border-gray-200 hover:border-[#5D3A1A]'
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
                className="px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-200 rounded-md focus:border-[#5D3A1A] focus:outline-none text-[10px] sm:text-xs flex-1"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-200 rounded-md focus:border-[#5D3A1A] focus:outline-none text-[10px] sm:text-xs flex-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Food Type Filter */}
      <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-200">
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="bg-[#F5F5DC] p-1 sm:p-1.5 rounded-md">
              <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#5D3A1A]" />
            </div>
            <span className="font-bold text-gray-800 text-[10px] sm:text-xs">Food Type</span>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            <button
              onClick={() => {
                playClickSound()
                setFoodTypeFilter('all')
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all ${
                foodTypeFilter === 'all'
                  ? 'bg-[#5D3A1A] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-[#F5F5DC] border border-gray-200 hover:border-[#5D3A1A]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                playClickSound()
                setFoodTypeFilter('veg')
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all ${
                foodTypeFilter === 'veg'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-green-700 hover:bg-green-50 border border-green-200'
              }`}
            >
              <div className="w-3 h-3 flex items-center justify-center border-2 border-green-600 bg-green-50 rounded-sm">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
              </div>
              Veg
            </button>
            <button
              onClick={() => {
                playClickSound()
                setFoodTypeFilter('nonveg')
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all ${
                foodTypeFilter === 'nonveg'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-red-700 hover:bg-red-50 border border-red-200'
              }`}
            >
              <div className="w-3 h-3 flex items-center justify-center border-2 border-red-600 bg-red-50 rounded-sm">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
              </div>
              Non-Veg
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards - Overview Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5D3A1A] mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">₹{reportData.totalRevenue.toFixed(0)}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Total Revenue</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5D3A1A] mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">{reportData.totalOrders}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Total Orders</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5D3A1A] mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">{reportData.completedOrders}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Completed</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5D3A1A] mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">{reportData.pendingOrders}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Pending</p>
        </div>
      </div>

      {/* Additional Metrics - Overview Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5D3A1A] mr-0.5" />
            <span className="text-sm sm:text-base font-bold text-gray-800">₹{reportData.avgOrderValue.toFixed(0)}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-gray-600">Avg Order Value</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-center mb-0.5">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5D3A1A] mr-0.5" />
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
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#5D3A1A]" />
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
              <Bar dataKey="sales" fill="#5D3A1A" name="Sales (₹)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-md p-1.5 sm:p-2 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-1">
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#5D3A1A]" />
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
            <thead className="bg-[#D2691E]">
              <tr>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase rounded-tl-md">Rank</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase">Dish Name</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase">Orders</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase rounded-tr-md">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.topDishes.map((dish: any, index: number) => (
                <tr key={index} className="hover:bg-[#F5F5DC] transition-colors">
                  <td className="px-1.5 sm:px-2 py-1 whitespace-nowrap">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#5D3A1A] rounded-full flex items-center justify-center text-white font-bold text-[9px] sm:text-[10px]">
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
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#5D3A1A]" />
            Order Report
          </h3>
          <p className="text-[9px] sm:text-[10px] text-gray-600 mt-0.5">Complete order history for selected period</p>
        </div>
        <div className="overflow-x-auto max-h-40 sm:max-h-56 md:max-h-72 overflow-y-auto">
          <table className="w-full min-w-[350px] sm:min-w-[600px]">
            <thead className="bg-[#D2691E] sticky top-0">
              <tr>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase rounded-tl-md">Order ID</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase">Table</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase">Waiter</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase">Status</th>
                <th className="px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase">Amount</th>
                <th className="hidden sm:table-cell px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase">Date</th>
                <th className="hidden sm:table-cell px-1.5 sm:px-2 py-1 text-left text-[9px] sm:text-[10px] font-bold text-white uppercase rounded-tr-md">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.filteredOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-[#F5F5DC] transition-colors">
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] font-semibold text-gray-900 truncate" title={order.id}>
                    {formatOrderId(order.id)}
                  </td>
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] text-gray-900">Table {order.tables?.table_number}</td>
                  <td className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] text-gray-900 truncate" title={order.users?.name}>
                    {order.users?.name}
                  </td>
                  <td className="px-1.5 sm:px-2 py-1">
                    <span className={`px-0.5 sm:px-1 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                      order.status === 'paid' ? 'bg-[#F5F5DC] text-[#5D3A1A]' :
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-[#5D3A1A]" />
              Export Report
            </h3>
            <p className="text-gray-600 mb-6">Choose the format to export the report:</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  playClickSound()
                  exportCSV()
                }}
                className="flex flex-col items-center gap-3 p-6 border-2 border-[#5D3A1A] rounded-xl hover:bg-[#F5F5DC] transition-all duration-300 group"
              >
                <FileSpreadsheet className="w-12 h-12 text-[#5D3A1A] group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-gray-900">CSV</span>
                <span className="text-xs text-gray-500">Spreadsheet format</span>
              </button>
              
              <button
                onClick={() => {
                  playClickSound()
                  exportPDF()
                }}
                className="flex flex-col items-center gap-3 p-6 border-2 border-[#8B4513] rounded-xl hover:bg-[#F5F5DC] transition-all duration-300 group"
              >
                <FileDown className="w-12 h-12 text-[#8B4513] group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-gray-900">PDF</span>
                <span className="text-xs text-gray-500">Printable format</span>
              </button>
            </div>
            
            <button
              onClick={() => {
                playClickSound()
                setShowExportModal(false)
              }}
              className="mt-6 w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
