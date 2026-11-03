'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Order, Dish, Table, Payment, Notification, Offer } from '@/types'
import { Plus, Edit, Trash2, DollarSign, Users, Utensils, User as UserIcon, Search, Filter, HelpCircle, Bell, LogOut, Download, Printer, Layers, Minus, X, UtensilsCrossed, RefreshCw, ShoppingCart, ArrowLeft, CheckCircle, ChefHat, Calendar, LayoutDashboard, BarChart3, CreditCard, Receipt, Clock, Wifi, WifiOff, CalendarCheck } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import WaiterStatus from '@/components/WaiterStatus'
import Reports from '@/components/Reports'
import { WebUSBPrinter, printSilently } from '@/lib/webusb-printer'
import { playClickSound, playNotificationSound, playSuccessSound, playErrorSound } from '@/lib/sound-effects'
import GoogleTranslate from '@/components/GoogleTranslate'

// Utility function to format order ID as DPK-XXX
const formatOrderId = (orderId: string) => {
  // Extract a number from the UUID and format it
  const hash = orderId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const orderNumber = (hash % 999) + 1
  return `DPK-${String(orderNumber).padStart(3, '0')}`
}

// Get food type icon
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

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [offers, setOffers] = useState<Offer[]>([])
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    discount_percent: '',
    min_order_value: '',
    max_discount: '',
    start_date: '',
    end_date: '',
    is_active: true,
    is_promotional: false,
    applicable_dishes: [] as string[]
  } as {
    title: string
    description: string
    discount_percent: string
    min_order_value: string
    max_discount: string
    start_date: string
    end_date: string
    is_active: boolean
    is_promotional: boolean
    applicable_dishes: string[]
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports' | 'offline-billing' | 'online-orders' | 'reservations' | 'rooms' | 'bookings' | 'kitchen' | 'customers' | 'inventory' | 'delivery' | 'team' | 'accounting' | 'marketing' | 'operations' | 'attendance' | 'offers' | 'settings'>('overview')
  const [overviewSubTab, setOverviewSubTab] = useState<'all' | 'veg' | 'nonveg' | 'active' | 'occupied' | 'available'>('all')
  const [selectedTableForOverview, setSelectedTableForOverview] = useState<Table | null>(null)
  const [showTableOrderDetails, setShowTableOrderDetails] = useState(false)
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
  const [viewingBill, setViewingBill] = useState<Order | null>(null)
  const [billOrderItems, setBillOrderItems] = useState<any[]>([])
  const [billCGST, setBillCGST] = useState('5')
  const [billSGST, setBillSGST] = useState('5')
  const [isEditingBill, setIsEditingBill] = useState(false)
  const [showPrebookModal, setShowPrebookModal] = useState(false)
  const [selectedTableForPrebook, setSelectedTableForPrebook] = useState<Table | null>(null)
  const [prebookTime, setPrebookTime] = useState('')
  const [prebookCustomer, setPrebookCustomer] = useState('')
  const [showMasterTableModal, setShowMasterTableModal] = useState(false)
  const [selectedTablesForMaster, setSelectedTablesForMaster] = useState<string[]>([])
  const [dishForm, setDishForm] = useState({
    name: '',
    marathi_name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    food_type: 'veg' as 'veg' | 'nonveg' | 'custom' | 'parcel',
    is_available: true,
    offer: '',
    offer_discount: ''
  } as {
    name: string
    marathi_name: string
    description: string
    price: string
    category: string
    image_url: string
    food_type: 'veg' | 'nonveg' | 'custom' | 'parcel'
    is_available: boolean
    offer: string
    offer_discount: string
  })
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<Order | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null)
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [cartAnimation, setCartAnimation] = useState(false)
  const [orderAnimation, setOrderAnimation] = useState<string | null>(null)
  const [previousOrderCount, setPreviousOrderCount] = useState(0)
  
  // Offline Orders State
  const [offlineCart, setOfflineCart] = useState<any[]>([])
  const [offlineOrders, setOfflineOrders] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [menuSearchTerm, setMenuSearchTerm] = useState('')
  const [showBillPreview, setShowBillPreview] = useState(false)
  const [billDiscountAmount, setBillDiscountAmount] = useState('')
  const [billDiscountPercentage, setBillDiscountPercentage] = useState('')
  const [billDiscountType, setBillDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [cgstRate, setCgstRate] = useState('2.5')
  const [sgstRate, setSgstRate] = useState('2.5')
  const [showCartModal, setShowCartModal] = useState(false)
  const [addedDishIds, setAddedDishIds] = useState<Set<string>>(new Set())
  const [billPaymentType, setBillPaymentType] = useState<'cash' | 'upi' | 'card'>('cash')
  
  // Admin Order Taking State
  const [showAdminOrderModal, setShowAdminOrderModal] = useState(false)
  const [adminOrderCart, setAdminOrderCart] = useState<any[]>([])
  const [adminOrderTable, setAdminOrderTable] = useState<Table | null>(null)
  const [adminOrderCustomerName, setAdminOrderCustomerName] = useState('')
  const [adminOrderCustomerMobile, setAdminOrderCustomerMobile] = useState('')
  const [adminOrderCategory, setAdminOrderCategory] = useState<string>('all')
  const [adminOrderFoodType, setAdminOrderFoodType] = useState<string>('all')
  const [adminOrderSubmitting, setAdminOrderSubmitting] = useState(false)
  const [adminOrderStep, setAdminOrderStep] = useState<'dishes' | 'cart'>('dishes')
  const [adminSelectedDishTypes, setAdminSelectedDishTypes] = useState<{[key: string]: string}>({})
  const dishTypes = ['Normal', 'Medium', 'Spicy', 'Extra Spicy']

  // Occupied Table Order State
  const [showOccupiedTableOrderModal, setShowOccupiedTableOrderModal] = useState(false)
  const [selectedOccupiedTableOrder, setSelectedOccupiedTableOrder] = useState<any>(null)

  // Reservations State
  const [reservations, setReservations] = useState<any[]>([])
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [editingReservation, setEditingReservation] = useState<any>(null)
  const [reservationForm, setReservationForm] = useState({
    customer_name: '',
    customer_mobile: '',
    table_id: '',
    date: '',
    time: '',
    guests: '',
    special_requests: ''
  })

  // Rooms State
  const [rooms, setRooms] = useState<any[]>([])
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: '',
    floor: '',
    capacity: '',
    price_per_night: '',
    amenities: '',
    status: 'available'
  })

  // Bookings State
  const [bookings, setBookings] = useState<any[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [editingBooking, setEditingBooking] = useState<any>(null)
  const [bookingForm, setBookingForm] = useState({
    customer_name: '',
    customer_mobile: '',
    room_id: '',
    check_in: '',
    check_out: '',
    guests: '',
    total_amount: '',
    status: 'confirmed'
  })

  // Customers State
  const [customers, setCustomers] = useState<any[]>([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [customerForm, setCustomerForm] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    preferences: ''
  })

  // Inventory State
  const [inventory, setInventory] = useState<any[]>([])
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [editingInventory, setEditingInventory] = useState<any>(null)
  const [inventoryForm, setInventoryForm] = useState({
    item_name: '',
    category: '',
    quantity: '',
    unit: '',
    unit_price: '',
    minimum_stock: '',
    supplier: ''
  })

  // Team State
  const [team, setTeam] = useState<any[]>([])
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<any>(null)
  const [teamForm, setTeamForm] = useState({
    name: '',
    role: '',
    mobile: '',
    email: '',
    department: '',
    salary: ''
  })

  // Delivery State
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<any>(null)
  const [deliveryForm, setDeliveryForm] = useState({
    customer_name: '',
    mobile: '',
    address: '',
    order_id: '',
    driver_id: '',
    status: 'pending',
    delivery_fee: '',
    notes: ''
  })
  const [deliverySubTab, setDeliverySubTab] = useState<'active' | 'history' | 'zones'>('active')

  // Accounting State
  const [transactions, setTransactions] = useState<any[]>([])
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [transactionForm, setTransactionForm] = useState({
    date: '',
    type: 'income',
    category: '',
    amount: '',
    description: '',
    reference: ''
  })
  const [accountingFilter, setAccountingFilter] = useState<'all' | 'income' | 'expense'>('all')

  // Marketing State
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'promotion',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'active',
    description: ''
  })

  // Operations State
  const [shifts, setShifts] = useState<any[]>([])
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [editingShift, setEditingShift] = useState<any>(null)
  const [shiftForm, setShiftForm] = useState({
    date: '',
    staff_id: '',
    start_time: '',
    end_time: '',
    status: 'scheduled',
    notes: ''
  })

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState<any>(null)
  const [attendanceForm, setAttendanceForm] = useState({
    staff_id: '',
    date: '',
    check_in: '',
    check_out: '',
    status: 'present',
    notes: ''
  })

  // Settings State
  const [hotelSettings, setHotelSettings] = useState({
    hotel_name: 'Dhole Patil Khanawal',
    logo_url: '',
    address: 'New Gunjalwadi Road, Gunjalwadi, Sangamner',
    phone: '+91 9371967595',
    email: '',
    gstin: '',
    tax_rates: {
      cgst: 5,
      sgst: 5
    },
    printer_settings: {
      printer_type: 'thermal_58mm',
      auto_print: true,
      paper_size: '58mm'
    },
    notification_settings: {
      new_orders: true,
      low_inventory: true,
      staff_changes: false
    },
    theme_settings: {
      primary_color: '#6B3E26',
      secondary_color: '#9A572D'
    },
    currency: 'INR'
  })
  const [logoPreview, setLogoPreview] = useState('')

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Check role from cookie first for quick redirect
        const role = document.cookie
          .split('; ')
          .find(row => row.startsWith('hotel_role='))
          ?.split('=')[1]

        if (role !== 'admin') {
          router.push('/auth-portal-xyz789')
          return
        }

        const response = await fetch('/api/auth/verify')
        const data = await response.json()

        if (!response.ok || !data.authenticated) {
          // Session invalid, redirect to login
          router.push('/auth-portal-xyz789')
          return
        }

        // Double-check role from API response
        if (data.user.role !== 'admin') {
          router.push('/auth-portal-xyz789')
          return
        }

        // Check if user has admin role
        if (data.user.role !== 'admin') {
          router.push('/auth-portal-xyz789')
          return
        }

        // Set user data from verified session
        setUser(data.user)

        // Load cached data first
        loadCachedData()

        // Then fetch from API if online
        if (navigator.onLine) {
          fetchData()
        }

        // Set up polling for order updates (replacing real-time subscription)
        const interval = setInterval(() => {
          if (navigator.onLine) {
            fetchData()
          }
        }, 5000)

        return () => {
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Session verification failed:', error)
        router.push('/auth-portal-xyz789')
      }
    }

    verifySession()
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load reservations
  useEffect(() => {
    const loadReservations = async () => {
      try {
        const response = await fetch('/api/reservations')
        if (response.ok) {
          const data = await response.json()
          setReservations(data)
        }
      } catch (error) {
        console.error('Error loading reservations:', error)
      }
    }
    loadReservations()
  }, [])

  // Load rooms
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/rooms')
        if (response.ok) {
          const data = await response.json()
          setRooms(data)
        }
      } catch (error) {
        console.error('Error loading rooms:', error)
      }
    }
    loadRooms()
  }, [])

  // Load bookings, customers, inventory, team
  useEffect(() => {
    const loadData = async () => {
      try {
        const [bookingsRes, customersRes, inventoryRes, teamRes] = await Promise.all([
          fetch('/api/bookings').then(res => res.ok ? res.json() : []),
          fetch('/api/customers').then(res => res.ok ? res.json() : []),
          fetch('/api/inventory').then(res => res.ok ? res.json() : []),
          fetch('/api/team').then(res => res.ok ? res.json() : [])
        ])
        setBookings(bookingsRes)
        setCustomers(customersRes)
        setInventory(inventoryRes)
        setTeam(teamRes)
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [])

  // Load deliveries
  useEffect(() => {
    const loadDeliveries = async () => {
      try {
        const response = await fetch('/api/deliveries')
        if (response.ok) {
          const data = await response.json()
          setDeliveries(data)
        }
      } catch (error) {
        console.error('Error loading deliveries:', error)
      }
    }
    loadDeliveries()
  }, [])

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await fetch('/api/accounting')
        if (response.ok) {
          const data = await response.json()
          setTransactions(data)
        }
      } catch (error) {
        console.error('Error loading transactions:', error)
      }
    }
    loadTransactions()
  }, [])

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const response = await fetch('/api/marketing')
        if (response.ok) {
          const data = await response.json()
          setCampaigns(data)
        }
      } catch (error) {
        console.error('Error loading campaigns:', error)
      }
    }
    loadCampaigns()
  }, [])

  // Load shifts
  useEffect(() => {
    const loadShifts = async () => {
      try {
        const response = await fetch('/api/operations')
        if (response.ok) {
          const data = await response.json()
          setShifts(data)
        }
      } catch (error) {
        console.error('Error loading shifts:', error)
      }
    }
    loadShifts()
  }, [])

  // Load attendance
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const response = await fetch('/api/attendance')
        if (response.ok) {
          const data = await response.json()
          setAttendanceRecords(data)
        }
      } catch (error) {
        console.error('Error loading attendance:', error)
      }
    }
    loadAttendance()
  }, [])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setHotelSettings(data)
          if (data.logo_url) {
            setLogoPreview(data.logo_url)
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Load offers
  useEffect(() => {
    fetchOffers()
  }, [])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineOrders()
      fetchData()
    }
    const handleOffline = () => {
      setIsOnline(false)
      loadCachedData()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    // Load offline orders from localStorage
    const savedOfflineOrders = localStorage.getItem('offline_orders')
    if (savedOfflineOrders) {
      setOfflineOrders(JSON.parse(savedOfflineOrders))
    }

    // Load cached data on initial load
    loadCachedData()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load cached data from localStorage
  const loadCachedData = () => {
    try {
      const cachedDishes = localStorage.getItem('cached_dishes')
      const cachedTables = localStorage.getItem('cached_tables')
      const cachedOrders = localStorage.getItem('cached_orders')
      const cachedPayments = localStorage.getItem('cached_payments')
      const cachedNotifications = localStorage.getItem('cached_notifications')
      
      if (cachedDishes) {
        setDishes(JSON.parse(cachedDishes))
      }
      if (cachedTables) {
        setTables(JSON.parse(cachedTables))
      }
      if (cachedOrders) {
        setOrders(JSON.parse(cachedOrders))
      }
      if (cachedPayments) {
        setPayments(JSON.parse(cachedPayments))
      }
      if (cachedNotifications) {
        setNotifications(JSON.parse(cachedNotifications))
      }
    } catch (error) {
      console.error('Error loading cached data:', error)
    }
  }

  // Sync offline orders when coming online
  const syncOfflineOrders = async () => {
    const savedOfflineOrders = localStorage.getItem('offline_orders')
    if (!savedOfflineOrders) return

    const orders = JSON.parse(savedOfflineOrders)
    if (orders.length === 0) return

    try {
      for (const order of orders) {
        // Create order in database
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_id: order.table_id,
            waiter_id: order.waiter_id,
            customer_name: order.customer_name,
            total_amount: order.total_amount,
            status: 'pending'
          })
        })

        if (orderResponse.ok) {
          const createdOrder = await orderResponse.json()

          // Create order items
          for (const item of order.order_items) {
            await fetch('/api/order-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: createdOrder.id,
                dish_id: item.dish_id,
                quantity: item.quantity,
                price: item.price,
                special_instructions: item.special_instructions
              })
            })
          }
        }
      }

      // Clear synced orders from localStorage
      localStorage.removeItem('offline_orders')
      setOfflineOrders([])
      fetchData()
      alert(`Successfully synced ${orders.length} offline orders to database!`)
    } catch (error) {
      console.error('Error syncing offline orders:', error)
      alert('Failed to sync some offline orders. Please try again.')
    }
  }

  const fetchData = async () => {
    try {
      const [ordersRes, dishesRes, tablesRes, paymentsRes, notificationsRes] = await Promise.all([
        fetch('/api/orders').then(async res => {
          if (!res.ok) throw new Error(`Orders API error: ${res.status}`)
          return res.json()
        }).catch(() => null),
        fetch('/api/dishes').then(async res => {
          if (!res.ok) throw new Error(`Dishes API error: ${res.status}`)
          return res.json()
        }).catch(() => null),
        fetch('/api/tables').then(async res => {
          if (!res.ok) throw new Error(`Tables API error: ${res.status}`)
          return res.json()
        }).catch(() => null),
        fetch('/api/payments').then(async res => {
          if (!res.ok) throw new Error(`Payments API error: ${res.status}`)
          return res.json()
        }).catch(() => null),
        fetch('/api/notifications').then(async res => {
          if (!res.ok) throw new Error(`Notifications API error: ${res.status}`)
          return res.json()
        }).catch(() => null)
      ])

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (ordersRes || []).map(async (order: any) => {
          try {
            const itemsRes = await fetch(`/api/orders/${order.id}/items`)
            if (!itemsRes.ok) throw new Error(`Order items API error: ${itemsRes.status}`)
            const items = await itemsRes.json()
            return { ...order, order_items: items }
          } catch (error) {
            console.error('Error fetching order items:', error)
            return { ...order, order_items: [] }
          }
        })
      )

      // Remove duplicate orders by ID
      const uniqueOrders = ordersWithItems.filter((order: any, index: number, self: any[]) =>
        index === self.findIndex((o: any) => o.id === order.id)
      )

      // Play notification sound if new orders detected
      if (uniqueOrders.length > previousOrderCount && previousOrderCount > 0) {
        playNotificationSound()
      }
      setPreviousOrderCount(uniqueOrders.length)

      // Only update state if data was successfully fetched
      if (uniqueOrders && uniqueOrders.length > 0) {
        setOrders(uniqueOrders)
      }
      if (dishesRes && dishesRes.length > 0) {
        setDishes(dishesRes)
      }
      if (tablesRes && tablesRes.length > 0) {
        setTables(tablesRes)
      }
      if (paymentsRes && (paymentsRes.data || paymentsRes).length > 0) {
        setPayments(paymentsRes.data || paymentsRes)
      }
      if (notificationsRes && (notificationsRes.data || notificationsRes).length > 0) {
        setNotifications(notificationsRes.data || notificationsRes)
      }

      // Cache all data for offline use
      if (dishesRes && dishesRes.length > 0) {
        localStorage.setItem('cached_dishes', JSON.stringify(dishesRes))
      }
      if (tablesRes && tablesRes.length > 0) {
        localStorage.setItem('cached_tables', JSON.stringify(tablesRes))
      }
      if (ordersWithItems && ordersWithItems.length > 0) {
        localStorage.setItem('cached_orders', JSON.stringify(ordersWithItems))
      }
      if (paymentsRes && (paymentsRes.data || paymentsRes).length > 0) {
        localStorage.setItem('cached_payments', JSON.stringify(paymentsRes.data || paymentsRes))
      }
      if (notificationsRes && (notificationsRes.data || notificationsRes).length > 0) {
        localStorage.setItem('cached_notifications', JSON.stringify(notificationsRes.data || notificationsRes))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDish = () => {
    playClickSound()
    setEditingDish(null)
    setDishForm({
      name: '',
      marathi_name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      food_type: 'veg',
      is_available: true,
      offer: '',
      offer_discount: ''
    })
    setShowDishModal(true)
  }

  const handleEditDish = (dish: Dish) => {
    setEditingDish(dish)
    setDishForm({
      name: dish.name,
      marathi_name: dish.marathi_name ?? '',
      description: dish.description ?? '',
      price: dish.price.toString(),
      category: dish.category,
      image_url: dish.image_url ?? '',
      food_type: dish.food_type ?? 'veg',
      is_available: dish.is_available,
      offer: dish.offer ?? '',
      offer_discount: dish.offer_discount?.toString() ?? ''
    })
    setShowDishModal(true)
  }

  const handleDeleteDish = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this dish?')) return

    try {
      const response = await fetch(`/api/dishes/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete dish')

      fetchData()
    } catch (error) {
      console.error('Error deleting dish:', error)
      alert('Failed to delete dish')
    }
  }

  const handleToggleDishAvailability = async (dish: Dish) => {
    try {
      const response = await fetch(`/api/dishes/${dish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !dish.is_available })
      })

      if (!response.ok) throw new Error('Failed to update dish availability')

      fetchData()
    } catch (error) {
      console.error('Error toggling dish availability:', error)
      alert('Failed to update dish availability')
    }
  }

  const handleAddOffer = () => {
    playClickSound()
    setEditingOffer(null)
    setOfferForm({
      title: '',
      description: '',
      discount_percent: '',
      min_order_value: '',
      max_discount: '',
      start_date: '',
      end_date: '',
      is_active: true,
      is_promotional: false,
      applicable_dishes: []
    })
    setShowOfferModal(true)
  }

  const handleEditOffer = (offer: Offer) => {
    playClickSound()
    setEditingOffer(offer)
    setOfferForm({
      title: offer.title,
      description: offer.description,
      discount_percent: offer.discount_percent.toString(),
      min_order_value: offer.min_order_value?.toString() || '',
      max_discount: offer.max_discount?.toString() || '',
      start_date: offer.start_date,
      end_date: offer.end_date,
      is_active: offer.is_active,
      is_promotional: offer.is_promotional || false,
      applicable_dishes: offer.applicable_dishes || []
    })
    setShowOfferModal(true)
  }

  const handleDeleteOffer = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this offer?')) return

    try {
      const offerToDelete = offers.find(o => o.id === id)

      const response = await fetch(`/api/offers/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete offer')

      // Remove offer from applicable dishes
      if (offerToDelete?.applicable_dishes && offerToDelete.applicable_dishes.length > 0) {
        for (const dishId of offerToDelete.applicable_dishes) {
          try {
            await fetch(`/api/dishes/${dishId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                offer: null,
                offer_discount: null
              })
            })
          } catch (error) {
            console.error(`Error removing offer from dish ${dishId}:`, error)
          }
        }
      }

      fetchOffers()
      fetchData()
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting offer:', error)
      alert('Failed to delete offer')
      playErrorSound()
    }
  }

  const handleToggleOfferStatus = async (offer: Offer) => {
    try {
      const newStatus = !offer.is_active

      const response = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update offer status')

      // Update offer status on applicable dishes
      if (offer.applicable_dishes && offer.applicable_dishes.length > 0) {
        const offerText = `${offer.discount_percent}% OFF`
        for (const dishId of offer.applicable_dishes) {
          try {
            await fetch(`/api/dishes/${dishId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                offer: newStatus ? offerText : null,
                offer_discount: newStatus ? offer.discount_percent : null
              })
            })
          } catch (error) {
            console.error(`Error updating offer status on dish ${dishId}:`, error)
          }
        }
      }

      fetchOffers()
      fetchData()
      playSuccessSound()
    } catch (error) {
      console.error('Error toggling offer status:', error)
      alert('Failed to update offer status')
      playErrorSound()
    }
  }

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()

    try {
      const payload = {
        title: offerForm.title,
        description: offerForm.description,
        discount_percent: parseFloat(offerForm.discount_percent),
        min_order_value: offerForm.min_order_value ? parseFloat(offerForm.min_order_value) : null,
        max_discount: offerForm.max_discount ? parseFloat(offerForm.max_discount) : null,
        start_date: offerForm.start_date,
        end_date: offerForm.end_date,
        is_active: offerForm.is_active,
        is_promotional: offerForm.is_promotional,
        applicable_dishes: offerForm.applicable_dishes
      }

      const url = editingOffer ? `/api/offers/${editingOffer.id}` : '/api/offers'
      const method = editingOffer ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to save offer')

      const offerText = `${offerForm.discount_percent}% OFF`

      // If editing, remove offer from previously selected dishes that are no longer selected
      if (editingOffer && editingOffer.applicable_dishes) {
        const removedDishes = editingOffer.applicable_dishes.filter(
          id => !offerForm.applicable_dishes.includes(id)
        )
        for (const dishId of removedDishes) {
          try {
            await fetch(`/api/dishes/${dishId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                offer: null,
                offer_discount: null
              })
            })
          } catch (error) {
            console.error(`Error removing offer from dish ${dishId}:`, error)
          }
        }
      }

      // Apply offer to newly selected dishes
      if (offerForm.applicable_dishes.length > 0) {
        for (const dishId of offerForm.applicable_dishes) {
          try {
            await fetch(`/api/dishes/${dishId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                offer: offerText,
                offer_discount: parseFloat(offerForm.discount_percent)
              })
            })
          } catch (error) {
            console.error(`Error applying offer to dish ${dishId}:`, error)
          }
        }
      }

      setShowOfferModal(false)
      setEditingOffer(null)
      setOfferForm({
        title: '',
        description: '',
        discount_percent: '',
        min_order_value: '',
        max_discount: '',
        start_date: '',
        end_date: '',
        is_active: true,
        is_promotional: false,
        applicable_dishes: []
      })
      fetchOffers()
      fetchData()
      playSuccessSound()
    } catch (error) {
      console.error('Error saving offer:', error)
      alert('Failed to save offer')
      playErrorSound()
    }
  }

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/offers')
      const data = await response.json()
      if (Array.isArray(data)) {
        setOffers(data)
      }
    } catch (error) {
      console.error('Error fetching offers:', error)
    }
  }

  const handleSaveDish = async () => {
    try {
      const payload = {
        name: dishForm.name,
        marathi_name: dishForm.marathi_name || null,
        description: dishForm.description,
        price: parseFloat(dishForm.price),
        category: dishForm.category,
        image_url: dishForm.image_url,
        food_type: dishForm.food_type,
        is_available: dishForm.is_available,
        offer: dishForm.offer || null,
        offer_discount: dishForm.offer_discount ? parseFloat(dishForm.offer_discount) : null
      }

      console.log('=== Saving dish ===')
      console.log('Editing dish:', editingDish?.id)
      console.log('Payload:', payload)

      const url = editingDish ? `/api/dishes/${editingDish.id}` : '/api/dishes'
      const response = await fetch(url, {
        method: editingDish ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingDish ? { ...payload, id: editingDish.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save dish')

      setShowDishModal(false)
      setEditingDish(null)
      setDishForm({
        name: '',
        marathi_name: '',
        description: '',
        price: '',
        category: '',
        image_url: '',
        food_type: 'veg',
        is_available: true,
        offer: '',
        offer_discount: ''
      })
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
      console.log('Generating bill for order:', order.id)
      console.log('Original order items:', order.order_items)

      // Fetch the order with all its items from the API
      const orderResponse = await fetch(`/api/orders/${order.id}`)
      const fullOrder = await orderResponse.json()
      console.log('Full order with items:', fullOrder)
      console.log('Full order items count:', fullOrder.order_items?.length)

      // Set viewing bill state to show preview modal
      setViewingBill(fullOrder)
      setBillOrderItems(fullOrder.order_items || [])
      setIsEditingBill(false)
      // Reset discount and tax values
      setBillDiscountAmount('')
      setBillDiscountPercentage('')
      // Set payment type from order (map 'online' to 'upi' for consistency)
      const orderPaymentType = (fullOrder as any).payment_type
      setBillPaymentType(orderPaymentType === 'upi' ? 'upi' : orderPaymentType === 'card' ? 'card' : 'cash')

    } catch (error: any) {
      console.error('Error generating bill:', error)
    }
  }

  const calculateBillSubtotal = () => {
    if (!viewingBill) return 0
    return viewingBill.total_amount
  }

  const calculateBillDiscount = () => {
    const subtotal = calculateBillSubtotal()
    if (billDiscountType === 'amount' && billDiscountAmount) {
      return parseFloat(billDiscountAmount)
    } else if (billDiscountType === 'percentage' && billDiscountPercentage) {
      return (parseFloat(billDiscountPercentage) / 100) * subtotal
    }
    return 0
  }

  const calculateBillTax = (amount:number, rate: string) => {
    return (parseFloat(rate) / 100) * amount
  }

  const calculateBillGrandTotal = () => {
    const subtotal = calculateBillSubtotal()
    const discount = calculateBillDiscount()
    const afterDiscount = subtotal - discount
    const cgst = calculateBillTax(afterDiscount, billCGST)
    const sgst = calculateBillTax(afterDiscount, billSGST)
    return afterDiscount + cgst + sgst
  }

  const handleUpdateBillItem = (itemId: string, newQuantity: number) => {
    playClickSound()
    const updatedItems = billOrderItems.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    )
    setBillOrderItems(updatedItems)

    // Recalculate total
    const newTotal = updatedItems.reduce((sum, item) =>
      sum + (item.dishes?.price || item.dish?.price || item.price || 0) * item.quantity, 0
    )
    if (viewingBill) {
      setViewingBill({ ...viewingBill, total_amount: newTotal })
    }
  }

  const handleRemoveBillItem = (itemId: string) => {
    const updatedItems = billOrderItems.filter(item => item.id !== itemId)
    setBillOrderItems(updatedItems)

    // Recalculate total
    const newTotal = updatedItems.reduce((sum, item) =>
      sum + (item.dishes?.price || item.dish?.price || item.price || 0) * item.quantity, 0
    )
    if (viewingBill) {
      setViewingBill({ ...viewingBill, total_amount: newTotal })
    }
  }

  // Helper function to group order items by dish and aggregate quantities
  const groupOrderItems = (items: any[]) => {
    return items.reduce((acc: any[], item: any) => {
      const dishId = item.dish_id || item.dishes?.id
      const existing = acc.find((i: any) => i.dish_id === dishId)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        acc.push({
          ...item,
          quantity: item.quantity
        })
      }
      return acc
    }, [])
  }

  const handleSaveBillEdits = async () => {
    if (!viewingBill) return

    try {
      // Get original order items to identify which ones were removed
      const originalItems = viewingBill.order_items || []
      const currentItemIds = billOrderItems.map(item => item.id)
      const removedItemIds = originalItems
        .filter((item: any) => !currentItemIds.includes(item.id))
        .map((item: any) => item.id)

      // Delete removed items from database
      for (const itemId of removedItemIds) {
        await fetch(`/api/order-items/${itemId}`, {
          method: 'DELETE'
        })
      }

      // Update quantities for existing items
      for (const item of billOrderItems) {
        await fetch(`/api/order-items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity })
        })
      }

      // Update order total and payment type
      await fetch(`/api/orders/${viewingBill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: viewingBill.total_amount,
          payment_type: billPaymentType
        })
      })

      setIsEditingBill(false)
      fetchData() // Refresh data
      playSuccessSound()
      alert('Bill updated successfully!')
    } catch (error) {
      console.error('Error saving bill edits:', error)
      playErrorSound()
      alert('Failed to update bill. Please try again.')
    }
  }

  const handlePrintPreviewBill = async () => {
    if (!viewingBill) return

    try {
      console.log('Printing bill for order:', viewingBill.id)
      console.log('Order items:', viewingBill.order_items)

      // Use order_items directly from the order object (already fetched by API)
      const orderItems = viewingBill.order_items || []

      // Generate ESC/POS commands for direct printing
      let escposContent = ''

      // Initialize printer
      escposContent += '\x1B\x40' // Initialize

      // Center alignment for header
      escposContent += '\x1B\x61\x01'

      // Hotel Name - Large and Bold
      escposContent += '\x1B\x21\x30' // Double width and height
      escposContent += 'DHOLE PATIL KHANAWAL\n'
      escposContent += '\x1B\x21\x00' // Normal
      escposContent += 'Restaurant & Bar\n'
      escposContent += '================================\n'

      // Left align for bill info
      escposContent += '\x1B\x61\x00'
      escposContent += `Bill No: ${formatOrderId(viewingBill.id)}\n`
      escposContent += `Date: ${new Date(viewingBill.created_at).toLocaleDateString()}\n`
      escposContent += `Time: ${new Date(viewingBill.created_at).toLocaleTimeString()}\n`
      escposContent += `Table: ${viewingBill.tables?.is_master ? `${viewingBill.tables?.table_number || 'N/A'} (M)` : (viewingBill.tables?.table_number || 'N/A')}\n`
      escposContent += `Waiter: ${viewingBill.users?.name || 'N/A'}\n`
      escposContent += `Payment: ${billPaymentType === 'upi' ? 'UPI' : billPaymentType === 'card' ? 'CARD' : billPaymentType === 'cash' ? 'CASH' : 'CASH'}\n`
      escposContent += '--------------------------\n'

      // Items Header
      escposContent += '\x1B\x21\x08' // Bold
      escposContent += '  ITEM                  QTY  AMT\n'
      escposContent += '--------------------------\n'
      escposContent += '\x1B\x21\x00' // Normal font for items

      // Items - Group by dish to aggregate quantities
      const groupedItems = groupOrderItems(orderItems)
      groupedItems.forEach((item: any) => {
        const name = item.dishes?.name || item.dish?.name || 'Unknown'
        const qty = item.quantity
        const price = item.dishes?.price || item.dish?.price || item.price || 0
        const total = (price * qty).toFixed(2)
        const itemName = name.length > 14 ? name.substring(0, 13) + '.' : name
        escposContent += `${itemName.padEnd(14)} ${qty.toString().padStart(2)}x ${total.padStart(7)}\n`
      })
      escposContent += '\x1B\x21\x00' // Ensure normal text

      escposContent += '--------------------------\n'
      escposContent += `Subtotal: Rs${calculateBillSubtotal().toFixed(2)}\n`

      // Discount
      const discount = calculateBillDiscount()
      if (discount > 0) {
        escposContent += `Discount: -Rs${discount.toFixed(2)}\n`
      }

      // Taxes
      const afterDiscount = calculateBillSubtotal() - discount
      const cgst = calculateBillTax(afterDiscount, billCGST)
      const sgst = calculateBillTax(afterDiscount, billSGST)
      escposContent += `CGST (${billCGST}%): Rs${cgst.toFixed(2)}\n`
      escposContent += `SGST (${billSGST}%): Rs${sgst.toFixed(2)}\n`

      // Grand Total - Centered, Bold and Large
      escposContent += '\x1B\x61\x01' // Center align
      escposContent += '================================\n'
      escposContent += '\x1B\x21\x08' // Bold
      escposContent += 'GRAND TOTAL\n'
      escposContent += `Rs ${calculateBillGrandTotal().toFixed(2)}\n`
      escposContent += '\x1B\x21\x00' // Normal
      escposContent += '================================\n'
      escposContent += 'Thank You for Dining!\n'
      escposContent += 'Visit Us Again\n'
      escposContent += '================================\n'
      escposContent += 'Developed by onethynk techmedia\n'
      escposContent += '================================\n\n'

      // Cut paper
      escposContent += '\x1D\x56\x00' // Partial cut

      console.log('ESC/POS content generated')

      // Use WebUSB for direct printing (no Chrome dialog)
      const printer = new WebUSBPrinter()
      await printer.connect()
      await printer.print(escposContent)
      await printer.disconnect()

      console.log('Bill printed successfully via WebUSB')

      // Mark order as printed and paid
      await fetch(`/api/orders/${viewingBill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_printed: true, status: 'paid' })
      })

      // Release the table
      if (viewingBill.table_id) {
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: viewingBill.table_id, is_occupied: false })
        })
      }

      // Update local state
      setViewingBill({ ...viewingBill, is_printed: true, status: 'paid' })
      fetchData() // Refresh orders list
      playSuccessSound()
      
    } catch (error: any) {
      console.error('USB printing failed:', error)
      console.log('Falling back to browser printing...')

      // Fallback to browser printing using iframe
      try {
        const isMasterTable = viewingBill.tables?.is_master || false
        const plainText = `
<div style="text-align: center; margin-bottom: 8px;">
  <img src="/logo.png" alt="Dhole Patil Logo" style="width: 120px; height: auto; margin-bottom: 8px;" />
  <div style="font-size: 18px; font-weight: 900; color: #000;">DHOLE PATIL KHANAWAL</div>
  <div style="font-size: 12px; font-weight: bold; color: #000;">VEG & NON-VEG</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 10px; margin-bottom: 4px; font-weight: bold; color: #000;">
  <div>New Gunjalwadi Road</div>
  <div>Gunjalwadi, Sangamner</div>
  <div>PHONE: +91 9371967595</div>
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
    <span>${new Date(viewingBill.created_at).toLocaleDateString()}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>TIME:</span>
    <span>${new Date(viewingBill.created_at).toLocaleTimeString()}</span>
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
    <span>${billPaymentType === 'upi' ? 'UPI' : billPaymentType === 'card' ? 'CARD' : billPaymentType === 'cash' ? 'CASH' : 'CASH'}</span>
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
${groupOrderItems(billOrderItems).map((item: any) => {
  const name = item.dishes?.name || item.dish?.name || 'Unknown'
  const qty = item.quantity
  const price = (item.dishes?.price || item.dish?.price || item.price || 0)
  const total = price * qty
  const itemName = name.length > 20 ? name.substring(0, 19) + '.' : name
  return `<div style="display: flex; font-size: 9px; margin: 2px 0;">
  <span style="flex: 2;">${itemName}</span>
  <span style="flex: 1; text-align: right;">${qty}x</span>
  <span style="flex: 1; text-align: right;">${total.toFixed(2)}</span>
</div>`
}).join('')}
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="margin: 4px 0; font-size: 10px; font-weight: bold; color: #000;">
  <div style="display: flex; justify-content: space-between;">
    <span>SUBTOTAL:</span>
    <span>₹${calculateBillSubtotal().toFixed(2)}</span>
  </div>
  ${calculateBillDiscount() > 0 ? `
  <div style="display: flex; justify-content: space-between;">
    <span>DISCOUNT:</span>
    <span>-₹${calculateBillDiscount().toFixed(2)}</span>
  </div>` : ''}
  <div style="display: flex; justify-content: space-between;">
    <span>CGST (${billCGST}%):</span>
    <span>₹${calculateBillTax(calculateBillSubtotal() - calculateBillDiscount(), billCGST).toFixed(2)}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>SGST (${billSGST}%):</span>
    <span>₹${calculateBillTax(calculateBillSubtotal() - calculateBillDiscount(), billSGST).toFixed(2)}</span>
  </div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 12px; font-weight: 900; margin: 4px 0; color: #000;">
  GRAND TOTAL: ₹${calculateBillGrandTotal().toFixed(2)}
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 10px; margin: 4px 0; color: #000;">
  <div>THANK YOU FOR DINING!</div>
  <div>VISIT US AGAIN</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 8px; font-weight: bold; margin: 2px 0; color: #000;">
  DEVELOPED BY ONETHYNK TECHMEDIA
</div>
`
        
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
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                  }
                  body {
                    font-family: monospace;
                    font-size: 16px;
                    line-height: 1.3;
                    font-weight: bold;
                  }
                </style>
              </head>
              <body>${plainText}</body>
            </html>
          `)
          printDoc.close()
          
          setTimeout(() => {
            printFrame.contentWindow?.focus()
            printFrame.contentWindow?.print()

            // Mark order as printed after browser print dialog
            setTimeout(() => {
              document.body.removeChild(printFrame)

              // Mark order as printed and paid
              if (viewingBill) {
                fetch(`/api/orders/${viewingBill.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ is_printed: true, status: 'paid' })
                })

                // Release the table
                if (viewingBill.table_id) {
                  fetch('/api/tables', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: viewingBill.table_id, is_occupied: false })
                  })
                }

                // Refresh order data from API to get updated is_printed status
                fetch(`/api/orders/${viewingBill.id}`)
                  .then(res => res.json())
                  .then(updatedOrder => {
                    setViewingBill(updatedOrder)
                    setOrders(orders.map(o => o.id === viewingBill.id ? updatedOrder : o))
                  })
              }
            }, 1000)
          }, 250)
        } else {
          alert('Failed to prepare print document')
          document.body.removeChild(printFrame)
        }
      } catch (fallbackError) {
        console.error('Browser printing also failed:', fallbackError)
      }
    }
  }

  // Direct Print Function using WebUSB for direct thermal printing
  const handleThermalPrint = async () => {
    if (!selectedOrderForBilling) return

    try {
      console.log('Starting thermal print...')

      // Generate ESC/POS commands for direct printing
      let escposContent = ''

      // Initialize printer
      escposContent += '\x1B\x40' // Initialize

      // Center alignment for header
      escposContent += '\x1B\x61\x01'

      // Hotel Name - Large and Bold
      escposContent += '\x1B\x21\x30' // Double width and height
      escposContent += 'DHOLE PATIL KHANAWAL\n'
      escposContent += '\x1B\x21\x00' // Normal
      escposContent += 'VEG & NON-VEG\n'
      escposContent += '================================\n'

      // Address - Centered
      escposContent += 'Sangamner\n'
      escposContent += '================================\n'
      escposContent += '\x1B\x21\x08' // Bold
      escposContent += 'BILL / INVOICE\n'
      escposContent += '\x1B\x21\x00' // Normal
      escposContent += '================================\n\n'

      // Left align for bill info
      escposContent += '\x1B\x61\x00'
      escposContent += `Bill No: ${formatOrderId(selectedOrderForBilling.id)}\n`
      escposContent += `Date: ${new Date(selectedOrderForBilling.created_at).toLocaleDateString()}\n`
      escposContent += `Time: ${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}\n`
      escposContent += `Table: ${selectedOrderForBilling.tables?.is_master ? `${selectedOrderForBilling.tables?.table_number} (M)` : selectedOrderForBilling.tables?.table_number}\n`
      escposContent += `Waiter: ${selectedOrderForBilling.users?.name}\n`
      escposContent += `Customer: ${selectedOrderForBilling.customer_name || 'Guest'}\n`
      escposContent += `Payment: ${billPaymentType === 'upi' ? 'UPI' : billPaymentType === 'card' ? 'CARD' : billPaymentType === 'cash' ? 'CASH' : 'CASH'}\n`
      escposContent += '--------------------------\n'

      // Items Header
      escposContent += '\x1B\x21\x08' // Bold
      escposContent += '  ITEM                  QTY  AMT\n'
      escposContent += '--------------------------\n'
      escposContent += '\x1B\x21\x08' // Bold font for items

      // Items - Group by dish_id and dish_type
      const groupedItems = (selectedOrderForBilling.order_items || []).reduce((acc: any[], item: any) => {
        const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          acc.push({
            ...item,
            quantity: item.quantity
          })
        }
        return acc
      }, [])

      groupedItems.forEach((item: any) => {
        const name = item.dishes?.name || 'Unknown'
        const qty = item.quantity
        const price = (item.dishes?.price || item.price || 0)
        const total = (price * qty).toFixed(2)
        const itemName = name.length > 14 ? name.substring(0, 13) + '.' : name
        escposContent += `${itemName.padEnd(14)} ${qty.toString().padStart(2)}x ${total.padStart(7)}\n`
      })
      escposContent += '\x1B\x21\x00' // Ensure normal text

      escposContent += '--------------------------\n'
      escposContent += '\x1B\x21\x08' // Bold
      escposContent += `Subtotal: Rs${selectedOrderForBilling.total_amount.toFixed(2)}\n`

      // Discount if applicable
      const discount = calculateDiscountValue(selectedOrderForBilling.total_amount)
      if (discount > 0) {
        escposContent += `Discount: Rs${discount.toFixed(2)}\n`
      }
      escposContent += '\x1B\x21\x00' // Normal

      // Grand Total - Centered, Bold and Large
      escposContent += '\x1B\x61\x01' // Center align
      escposContent += '================================\n'
      escposContent += '\x1B\x21\x11' // Double height, double width, Bold
      escposContent += 'GRAND TOTAL\n'
      escposContent += `Rs${calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}\n`
      escposContent += '\x1B\x21\x00' // Normal
      escposContent += '================================\n'
      escposContent += 'Thank You for Dining!\n'
      escposContent += 'Visit Us Again\n'
      escposContent += '================================\n'
      escposContent += 'Developed by onethynk techmedia\n'
      escposContent += '================================\n\n'

      // Cut paper
      escposContent += '\x1D\x56\x00' // Partial cut

      console.log('ESC/POS content generated')

      // Use WebUSB for direct printing (no Chrome dialog)
      const printer = new WebUSBPrinter()
      await printer.connect()
      await printer.print(escposContent)
      await printer.disconnect()

      console.log('Bill printed successfully via WebUSB')

      // Mark order as printed and paid
      await fetch(`/api/orders/${selectedOrderForBilling.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_printed: true, status: 'paid' })
      })

      // Release the table
      if (selectedOrderForBilling.table_id) {
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedOrderForBilling.table_id, is_occupied: false })
        })
      }

      // Refresh order data from API to get updated is_printed status
      const updatedOrderResponse = await fetch(`/api/orders/${selectedOrderForBilling.id}`)
      const updatedOrder = await updatedOrderResponse.json()

      // Update local state with fresh data
      setSelectedOrderForBilling(updatedOrder)
      setOrders(orders.map(o => o.id === selectedOrderForBilling.id ? updatedOrder : o))

    } catch (error: any) {
      console.error('USB printing failed:', error)
      console.log('Falling back to browser printing...')
      
      // Fallback to browser printing using iframe
      try {
        const isMasterTable = selectedOrderForBilling.tables?.is_master || false
        const plainText = `
<div style="text-align: center; margin-bottom: 8px;">
  <div style="font-size: 22px; font-weight: 900; color: #000;">DHOLE PATIL KHANAWAL</div>
  <div style="font-size: 14px; font-weight: bold; color: #000;">VEG & NON-VEG</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 12px; margin-bottom: 4px; font-weight: bold; color: #000;">
  <div>Sangamner</div>
  <div>CITY, STATE - 123456</div>
  <div>PHONE: +91 98765 43210</div>
  <div>GSTIN: 29ABCDE1234F1Z5</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 14px; font-weight: 900; margin: 4px 0; color: #000;">BILL / INVOICE</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="margin: 4px 0; font-size: 12px; font-weight: bold; color: #000;">
  <div style="display: flex; justify-content: space-between;">
    <span>BILL NO:</span>
    <span>${formatOrderId(selectedOrderForBilling.id)}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>DATE:</span>
    <span>${new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>TIME:</span>
    <span>${new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>TABLE:</span>
    <span>${selectedOrderForBilling.tables?.table_number}${isMasterTable ? ' (M)' : ''}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>WAITER:</span>
    <span>${selectedOrderForBilling.users?.name}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>CUSTOMER:</span>
    <span>${selectedOrderForBilling.customer_name || 'GUEST'}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>PAYMENT:</span>
    <span>${billPaymentType === 'upi' ? 'UPI' : billPaymentType === 'card' ? 'CARD' : billPaymentType === 'cash' ? 'CASH' : 'CASH'}</span>
  </div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="font-size: 12px; font-weight: 900; margin: 4px 0; color: #000;">ITEM DETAILS</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="display: flex; font-size: 11px; font-weight: 900; margin-bottom: 2px; color: #000;">
  <span style="flex: 2;">ITEM</span>
  <span style="flex: 1; text-align: right;">QTY</span>
  <span style="flex: 1; text-align: right;">AMT</span>
</div>
<div style="border-top: 1px dashed #000; margin: 2px 0;"></div>
${(() => {
  // Group items by dish_id and dish_type
  const groupedItems = (selectedOrderForBilling.order_items || []).reduce((acc: any[], item: any) => {
    const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
    if (existing) {
      existing.quantity += item.quantity
      existing.total_price += (item.price * item.quantity)
    } else {
      acc.push({
        ...item,
        quantity: item.quantity,
        total_price: (item.price * item.quantity)
      })
    }
    return acc
  }, [])
  return groupedItems.map((item: any) => {
    const name = item.dishes?.name || 'Unknown'
    const qty = item.quantity
    const total = item.total_price
    const itemName = name.length > 20 ? name.substring(0, 19) + '.' : name
    return `<div style="display: flex; font-size: 11px; margin: 2px 0;">
  <span style="flex: 2;">${itemName}</span>
  <span style="flex: 1; text-align: right; font-weight: bold;">${qty}x</span>
  <span style="flex: 1; text-align: right;">${total.toFixed(2)}</span>
</div>`
  }).join('')
})()}
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="margin: 4px 0; font-size: 12px; font-weight: bold; color: #000;">
  <div style="display: flex; justify-content: space-between;">
    <span>SUBTOTAL:</span>
    <span>₹${selectedOrderForBilling.total_amount.toFixed(2)}</span>
  </div>
  ${calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 ? `
  <div style="display: flex; justify-content: space-between;">
    <span>DISCOUNT:</span>
    <span>-₹${calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}</span>
  </div>` : ''}
  <div style="display: flex; justify-content: space-between;">
    <span>CGST (${cgstRate}%):</span>
    <span>₹${calculateBillTax(selectedOrderForBilling.total_amount - calculateDiscountValue(selectedOrderForBilling.total_amount), cgstRate).toFixed(2)}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>SGST (${sgstRate}%):</span>
    <span>₹${calculateBillTax(selectedOrderForBilling.total_amount - calculateDiscountValue(selectedOrderForBilling.total_amount), sgstRate).toFixed(2)}</span>
  </div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 16px; font-weight: 900; margin: 4px 0; color: #000;">
  GRAND TOTAL: ₹${calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 12px; margin: 4px 0; color: #000;">
  <div>THANK YOU FOR DINING!</div>
  <div>VISIT US AGAIN</div>
</div>
<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
<div style="text-align: center; font-size: 10px; font-weight: bold; margin: 2px 0; color: #000;">
  DEVELOPED BY ONETHYNK TECHMEDIA
</div>
`
        
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
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                  }
                  body {
                    font-family: monospace;
                    font-size: 16px;
                    line-height: 1.3;
                    font-weight: bold;
                  }
                </style>
              </head>
              <body>${plainText}</body>
            </html>
          `)
          printDoc.close()
          
          setTimeout(() => {
            printFrame.contentWindow?.focus()
            printFrame.contentWindow?.print()

            // Mark order as printed after browser print dialog
            setTimeout(() => {
              document.body.removeChild(printFrame)

              // Mark order as printed and paid
              if (selectedOrderForBilling) {
                fetch(`/api/orders/${selectedOrderForBilling.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ is_printed: true, status: 'paid' })
                })

                // Release the table
                if (selectedOrderForBilling.table_id) {
                  fetch('/api/tables', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: selectedOrderForBilling.table_id, is_occupied: false })
                  })
                }

                // Refresh order data from API to get updated is_printed status
                fetch(`/api/orders/${selectedOrderForBilling.id}`)
                  .then(res => res.json())
                  .then(updatedOrder => {
                    setSelectedOrderForBilling(updatedOrder)
                    setOrders(orders.map(o => o.id === selectedOrderForBilling.id ? updatedOrder : o))
                  })
              }
            }, 1000)
          }, 250)
        } else {
          alert('Failed to prepare print document')
          document.body.removeChild(printFrame)
        }
      } catch (fallbackError) {
        console.error('Browser printing also failed:', fallbackError)
      }
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
      // Update order status to paid and save payment type
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: 'paid', payment_type: billPaymentType })
      })

      // Check if this is a master table
      const table = tables.find(t => t.id === order.table_id)
      
      if (table?.is_master) {
        // Release all child tables
        const childTables = tables.filter(t => t.master_table_id === order.table_id)

        // Calculate the original capacity by subtracting child table capacities
        const childTablesCapacity = childTables.reduce((sum, child) => sum + (child.capacity || 0), 0)
        const originalCapacity = Math.max(0, (table.capacity || 0) - childTablesCapacity)

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

        // Remove master status from the table and reset capacity to original
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: order.table_id,
            is_master: false,
            capacity: originalCapacity
          })
        })
      }

      // Release the table
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.table_id, is_occupied: false })
      })

      setSelectedOrderForBilling(null)
      fetchData()
      
      // Play success sound
      playNotificationSound('success')
      
      alert('Order marked as paid and table released!')
    } catch (error) {
      console.error('Error marking order as paid:', error)
      alert('Failed to mark order as paid')
    }
  }

  const handleLogout = async () => {
    playClickSound()
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    // Clear localStorage
    localStorage.clear()
    router.push('/auth-portal-xyz789')
  }

  // Table Management Functions
  const handleAddTable = () => {
    playClickSound()
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
    const table = tables.find(t => t.id === id)

    if (!confirm(table?.is_master
      ? 'Are you sure you want to delete this master table? This will also release and unlink all child tables.'
      : 'Are you sure you want to delete this table?')) return

    try {
      // If this is a master table, release and unlink all child tables first
      if (table?.is_master) {
        const childTables = tables.filter(t => t.master_table_id === id)
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
      }

      const response = await fetch(`/api/tables/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete table')

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
        is_master: false
      }

      if (editingTable) {
        await fetch(`/api/tables/${editingTable.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        await fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      setShowTableModal(false)
      setEditingTable(null)
      setTableForm({ table_number: '', capacity: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving table:', error)
      alert('Failed to save table')
    }
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
      alert(`Table ${masterTable.table_number} is now the master table with ${selectedTablesForMaster.length} tables combined. All tables are now occupied and reserved.`)
    } catch (error) {
      console.error('Error creating master table:', error)
      alert('Failed to create master table')
    }
  }

  const handleViewTableOrders = async (tableId: string) => {
    try {
      const ordersRes = await fetch(`/api/orders`)
      const orders = await ordersRes.json()
      const tableOrders = orders.filter((o: any) => o.table_id === tableId && ['pending', 'preparing', 'ready'].includes(o.status))

      // Remove duplicate orders by ID
      const uniqueTableOrders = tableOrders.filter((order: any, index: number, self: any[]) => 
        index === self.findIndex((o: any) => o.id === order.id)
      )

      setSelectedTableOrders(uniqueTableOrders || [])
      setShowTableOrders(true)
    } catch (error) {
      console.error('Error fetching table orders:', error)
      alert('Failed to fetch table orders')
    }
  }

  const handleReleaseTable = async (tableId: string) => {
    const table = tables.find(t => t.id === tableId)

    if (!confirm(table?.is_master
      ? 'Are you sure you want to release this master table? This will also release all child tables.'
      : 'Are you sure you want to release this table?')) return

    try {
      // If this is a master table, release all child tables first
      if (table?.is_master) {
        const childTables = tables.filter(t => t.master_table_id === tableId)

        // Calculate the original capacity by subtracting child table capacities
        const childTablesCapacity = childTables.reduce((sum, child) => sum + (child.capacity || 0), 0)
        const originalCapacity = Math.max(0, (table.capacity || 0) - childTablesCapacity)

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

        // Also release the master table, remove master status, and reset capacity
        await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tableId,
            is_occupied: false,
            is_master: false,
            capacity: originalCapacity
          })
        })
      } else {
        // Regular table release
        const response = await fetch('/api/tables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tableId, is_occupied: false })
        })

        if (!response.ok) throw new Error('Failed to release table')
      }

      fetchData()
    } catch (error) {
      console.error('Error releasing table:', error)
      alert('Failed to release table')
    }
  }

  const handleAdminSubmitOrder = async () => {
    if (adminOrderCart.length === 0) {
      alert('Please add items to the order')
      return
    }

    setAdminOrderSubmitting(true)
    try {
      // Get user_id from cookie
      const userIdMatch = document.cookie.match(/hotel_user_id=([^;]+)/)
      const userId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : null

      // Create the order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: adminOrderTable?.id,
          waiter_id: userId,
          customer_name: adminOrderCustomerName || null,
          total_amount: adminOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          status: 'pending'
        })
      })

      if (!orderResponse.ok) throw new Error('Failed to create order')

      const order = await orderResponse.json()

      // Create order items
      for (const item of adminOrderCart) {
        await fetch('/api/order-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            dish_id: item.dish_id,
            quantity: item.quantity,
            price: item.price,
            status: 'pending',
            dish_type: item.dish_type || 'Normal'
          })
        })
      }

      // Mark table as occupied
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adminOrderTable?.id, is_occupied: true })
      })

      // Create notifications for kitchen staff
      const usersResponse = await fetch('/api/users')
      const allUsers = await usersResponse.json()
      const kitchenUsers = allUsers.filter((u: any) => u.role === 'kitchen')

      for (const kitchenUser of kitchenUsers) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: kitchenUser.id,
            message: `New order for Table ${adminOrderTable?.table_number}`,
            type: 'new_order'
          })
        })
      }

      playSuccessSound()
      setShowAdminOrderModal(false)
      setAdminOrderTable(null)
      setAdminOrderCart([])
      setAdminOrderCustomerName('')
      setAdminOrderCustomerMobile('')
      setAdminOrderStep('dishes')
      setAdminSelectedDishTypes({})
      fetchData()
      alert('Order submitted successfully!')
    } catch (error) {
      console.error('Error submitting order:', error)
      playErrorSound()
      alert('Failed to submit order. Please try again.')
    } finally {
      setAdminOrderSubmitting(false)
    }
  }

  // Admin order cart helpers
  const adminAddToCart = (dish: Dish, dishType: string = 'Normal') => {
    setAdminOrderCart([...adminOrderCart, {
      dish_id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity: 1,
      food_type: dish.food_type,
      dish_type: dishType
    }])
  }

  const adminGetCartTotal = () => {
    return adminOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const adminUpdateCartItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setAdminOrderCart(adminOrderCart.filter((_, i) => i !== index))
    } else {
      setAdminOrderCart(adminOrderCart.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      ))
    }
  }

  // Handle click on occupied table to show active order
  const handleOccupiedTableClick = async (table: Table) => {
    playClickSound()
    try {
      // Find active order for this table
      const activeOrder = orders.find(order =>
        order.table_id === table.id &&
        (order.status === 'pending' || order.status === 'preparing' || order.status === 'ready')
      )

      if (activeOrder) {
        // Fetch order items
        const itemsResponse = await fetch(`/api/orders/${activeOrder.id}/items`)
        const orderItems = await itemsResponse.json()
        setSelectedOccupiedTableOrder({ ...activeOrder, order_items: orderItems })
        setShowOccupiedTableOrderModal(true)
      } else {
        alert('No active order found for this table')
      }
    } catch (error) {
      console.error('Error fetching table order:', error)
      alert('Failed to fetch table order')
    }
  }

  // Handle repeat order
  const handleRepeatOrder = () => {
    playClickSound()
    if (selectedOccupiedTableOrder) {
      // Convert order items to cart format
      const cartItems = selectedOccupiedTableOrder.order_items.map((item: any) => ({
        dish_id: item.dish_id,
        name: item.dish?.name || 'Unknown',
        price: item.price,
        quantity: item.quantity,
        food_type: item.dish?.food_type || 'veg',
        dish_type: item.dish_type || 'Normal'
      }))

      setAdminOrderCart(cartItems)
      setAdminOrderTable(tables.find(t => t.id === selectedOccupiedTableOrder.table_id) || null)
      setAdminOrderCustomerName(selectedOccupiedTableOrder.customer_name || '')
      setAdminOrderCustomerMobile(selectedOccupiedTableOrder.customer_mobile || '')
      setShowOccupiedTableOrderModal(false)
      setShowAdminOrderModal(true)
      setAdminOrderStep('cart')
    }
  }

  // Handle print order
  const handlePrintOrder = async () => {
    playClickSound()
    if (!selectedOccupiedTableOrder) return

    try {
      // Update order status to 'printed' to remove from waiter and kitchen dashboards
      await fetch(`/api/orders/${selectedOccupiedTableOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_printed: true,
          status: 'served'
        })
      })

      playSuccessSound()
      setShowOccupiedTableOrderModal(false)
      setSelectedOccupiedTableOrder(null)
      fetchData()
      alert('Order printed and marked as served!')
    } catch (error) {
      console.error('Error printing order:', error)
      playErrorSound()
      alert('Failed to print order')
    }
  }

  const adminRemoveFromCart = (index: number) => {
    setAdminOrderCart(adminOrderCart.filter((_, i) => i !== index))
  }

  const handlePrebookTable = (table: Table) => {
    setSelectedTableForPrebook(table)
    setPrebookTime('')
    setPrebookCustomer('')
    setShowPrebookModal(true)
  }

  const handleSavePrebook = async () => {
    if (!selectedTableForPrebook || !prebookTime) {
      alert('Please select a table and time')
      return
    }

    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTableForPrebook.id,
          is_prebooked: true,
          prebooked_by: prebookCustomer || null,
          prebooked_time: prebookTime
        })
      })

      if (!response.ok) throw new Error('Failed to pre-book table')

      setShowPrebookModal(false)
      setSelectedTableForPrebook(null)
      setPrebookTime('')
      setPrebookCustomer('')
      fetchData()
    } catch (error) {
      console.error('Error pre-booking table:', error)
      alert('Failed to pre-book table')
    }
  }

  const handleCancelPrebook = async (tableId: string) => {
    if (!confirm('Are you sure you want to cancel this pre-booking?')) return

    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tableId,
          is_prebooked: false,
          prebooked_by: null,
          prebooked_time: null
        })
      })

      if (!response.ok) throw new Error('Failed to cancel pre-booking')

      fetchData()
    } catch (error) {
      console.error('Error canceling pre-booking:', error)
      alert('Failed to cancel pre-booking')
    }
  }

  // Offline Orders Functions
  const addToCart = (dish: Dish) => {
    const existingItem = offlineCart.find(item => item.dish_id === dish.id)
    if (existingItem) {
      setOfflineCart(offlineCart.map(item => 
        item.dish_id === dish.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setOfflineCart([...offlineCart, {
        id: `${dish.id}-${Date.now()}`, // Unique key for cart item
        dish_id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        image_url: dish.image_url
      }])
    }
    // Play sound and trigger animation
    playNotificationSound('cart')
    setCartAnimation(true)
    setAddedDishIds(prev => new Set(prev).add(dish.id))
    setTimeout(() => setCartAnimation(false), 500)
  }

  const removeFromCart = (cartItemId: string) => {
    const item = offlineCart.find(i => i.id === cartItemId)
    if (item) {
      setAddedDishIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.dish_id)
        return newSet
      })
    }
    setOfflineCart(offlineCart.filter(item => item.id !== cartItemId))
  }

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId)
    } else {
      setOfflineCart(offlineCart.map(item => 
        item.id === cartItemId 
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return offlineCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const createOfflineOrder = async () => {
    if (offlineCart.length === 0) {
      alert('Please add items to cart first')
      return
    }
    if (!selectedTable) {
      alert('Please select a table')
      return
    }

    const offlineOrder = {
      id: Date.now().toString(),
      table_id: selectedTable,
      waiter_id: user?.id,
      customer_name: customerName || 'Guest',
      customer_mobile: customerMobile || '',
      total_amount: getCartTotal(),
      status: 'pending',
      created_at: new Date().toISOString(),
      order_items: offlineCart.map(item => ({
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price,
        special_instructions: null
      }))
    }

    // Save to localStorage
    const savedOfflineOrders = localStorage.getItem('offline_orders') || '[]'
    const orders = JSON.parse(savedOfflineOrders)
    orders.push(offlineOrder)
    localStorage.setItem('offline_orders', JSON.stringify(orders))

    setOfflineOrders([...offlineOrders, offlineOrder])
    setOfflineCart([])
    setSelectedTable('')
    setCustomerName('')
    setCustomerMobile('')
    setAddedDishIds(new Set())
    
    // Play sound and trigger animation
    playNotificationSound('order')
    setOrderAnimation(offlineOrder.id)
    setTimeout(() => setOrderAnimation(null), 2000)
    
    alert('Offline order created successfully!')

    // If online, try to sync immediately
    if (isOnline) {
      syncOfflineOrders()
    }
  }

  const printOfflineBill = async (order: any) => {
    try {
      const plainText = `
<div style="text-align: center; margin-bottom: 8px;">
  <img src="/dhole patil logo-03.png" alt="Dhole Patil Logo" style="width: 120px; height: auto; margin-bottom: 8px;" />
</div>
<div class="header">DHOLE PATIL KHANAWAL</div>
<div class="subheader">Restaurant & Bar</div>
<div class="divider">================================</div>
<div class="address">Sangamner</div>
<div class="divider">================================</div>
<div class="section-title">BILL / INVOICE</div>
<div class="divider">================================</div>
<div class="spacer"></div>
<div class="bill-info"><span class="label">Bill No:</span> <span class="value">OFF-${order.id}</span></div>
<div class="bill-info"><span class="label">Date:</span> <span class="value">${new Date(order.created_at).toLocaleDateString()}</span></div>
<div class="bill-info"><span class="label">Time:</span> <span class="value">${new Date(order.created_at).toLocaleTimeString()}</span></div>
<div class="bill-info"><span class="label">Table:</span> <span class="value">${tables.find(t => t.id === order.table_id)?.table_number || 'N/A'}</span></div>
<div class="bill-info"><span class="label">Customer:</span> <span class="value">${order.customer_name || 'Guest'}</span></div>
<div class="divider">--------------------------</div>
<table class="items-table">
  <thead>
    <tr>
      <th class="col-item">ITEM</th>
      <th class="col-qty">QTY</th>
      <th class="col-amount">AMOUNT</th>
    </tr>
  </thead>
  <tbody>
${(() => {
  // Group items by dish_id and dish_type
  const groupedItems = (order.order_items || []).reduce((acc: any[], item: any) => {
    const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
    if (existing) {
      existing.quantity += item.quantity
      existing.total_price += (item.price * item.quantity)
    } else {
      acc.push({
        ...item,
        quantity: item.quantity,
        total_price: (item.price * item.quantity)
      })
    }
    return acc
  }, [])
  return groupedItems.map((item: any) => {
    const dish = dishes.find(d => d.id === item.dish_id)
    const name = dish?.name || 'Unknown'
    const qty = item.quantity
    const total = item.total_price.toFixed(2)
    const displayName = name.length > 18 ? name.substring(0, 17) + '.' : name
    return `    <tr>
      <td class="col-item">${displayName}</td>
      <td class="col-qty">${qty}x</td>
      <td class="col-amount">${total}</td>
    </tr>`
  }).join('')
})()}
  </tbody>
</table>
<div class="divider">--------------------------</div>
<div class="total-row"><span class="label">Subtotal:</span> <span class="amount">Rs${order.total_amount.toFixed(2)}</span></div>
<div class="divider">================================</div>
<div class="grand-total"> GRAND TOTAL: Rs${order.total_amount.toFixed(2)} </div>
<div class="divider">================================</div>
<div class="footer">Thank You for Dining!</div>
<div class="footer">Visit Us Again</div>
<div class="divider">================================</div>
<div class="developer">Developed by onethynk techmedia</div>
<div class="divider">================================</div>
`

      // Use browser print directly (works on all platforms including Vercel)
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
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
                  * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
                * {
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Courier New', 'Consolas', 'Lucida Console', monospace;
                  font-size: 12px;
                  font-weight: bold;
                  line-height: 1.3;
                  margin: 0;
                  padding: 2mm;
                  text-align: center;
                  width: 54mm;
                  max-width: 54mm;
                  overflow: hidden;
                  background: white;
                  color: black;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
                  image-rendering: crisp-edges;
                }
                .header {
                  font-size: 18px;
                  font-weight: 900;
                  margin-bottom: 1mm;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                .subheader {
                  font-size: 13px;
                  font-weight: bold;
                  margin-bottom: 1mm;
                }
                .divider {
                  font-size: 10px;
                  font-weight: bold;
                  margin: 1mm 0;
                  letter-spacing: 1px;
                }
                .address {
                  font-size: 11px;
                  font-weight: bold;
                  margin: 0.5mm 0;
                }
                .section-title {
                  font-size: 13px;
                  font-weight: 900;
                  margin: 1mm 0;
                }
                .spacer {
                  height: 2mm;
                }
                .bill-info {
                  display: flex;
                  justify-content: space-between;
                  font-size: 11px;
                  font-weight: bold;
                  margin: 0.5mm 0;
                }
                .label {
                  font-weight: bold;
                }
                .value {
                  font-weight: bold;
                }
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1mm 0;
                  font-size: 11px;
                }
                .items-table th {
                  border-bottom: 1px solid black;
                  padding: 1mm 0;
                  font-weight: 900;
                  font-size: 11px;
                }
                .items-table td {
                  padding: 0.5mm 0;
                  font-weight: bold;
                }
                .col-item {
                  text-align: left;
                  width: 55%;
                  padding-right: 2mm;
                }
                .col-qty {
                  text-align: center;
                  width: 15%;
                }
                .col-amount {
                  text-align: right;
                  width: 30%;
                }
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  font-size: 11px;
                  font-weight: bold;
                  margin: 1mm 0;
                }
                .amount {
                  font-weight: bold;
                }
                .grand-total {
                  font-size: 16px;
                  font-weight: 900;
                  margin: 2mm 0;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  text-align: center;
                }
                .footer {
                  font-size: 12px;
                  font-weight: bold;
                  margin: 1mm 0;
                  text-align: center;
                }
                .developer {
                  font-size: 9px;
                  font-weight: bold;
                  margin-top: 2mm;
                  opacity: 0.8;
                  text-align: center;
                }
              </style>
            </head>
            <body onload="window.print(); window.close();">${plainText}</body>
          </html>
        `)
        printWindow.document.close()
      } else {
        alert('Please allow popups for printing')
      }
    } catch (error) {
      alert('Printing failed: ' + (error as Error).message)
    }
  }

  const deleteOfflineOrder = (orderId: string) => {
    if (!confirm('Delete this offline order?')) return
    const updatedOrders = offlineOrders.filter(o => o.id !== orderId)
    setOfflineOrders(updatedOrders)
    localStorage.setItem('offline_orders', JSON.stringify(updatedOrders))
  }

  // Reservations Handlers
  const handleAddReservation = () => {
    playClickSound()
    setEditingReservation(null)
    setReservationForm({
      customer_name: '',
      customer_mobile: '',
      table_id: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      guests: '',
      special_requests: ''
    })
    setShowReservationModal(true)
  }

  const handleEditReservation = (reservation: any) => {
    playClickSound()
    setEditingReservation(reservation)
    setReservationForm({
      customer_name: reservation.customer_name,
      customer_mobile: reservation.customer_mobile,
      table_id: reservation.table_id,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      special_requests: reservation.special_requests || ''
    })
    setShowReservationModal(true)
  }

  const handleDeleteReservation = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this reservation?')) return

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete reservation')

      setReservations(reservations.filter(r => r.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting reservation:', error)
      playErrorSound()
      alert('Failed to delete reservation')
    }
  }

  const handleSaveReservation = async () => {
    try {
      const payload = {
        customer_name: reservationForm.customer_name,
        customer_mobile: reservationForm.customer_mobile,
        table_id: reservationForm.table_id,
        date: reservationForm.date,
        time: reservationForm.time,
        guests: parseInt(reservationForm.guests),
        special_requests: reservationForm.special_requests,
        status: 'confirmed'
      }

      const url = editingReservation ? `/api/reservations/${editingReservation.id}` : '/api/reservations'
      const response = await fetch(url, {
        method: editingReservation ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReservation ? { ...payload, id: editingReservation.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save reservation')

      setShowReservationModal(false)
      playSuccessSound()
      // Refresh reservations
      const updatedReservations = await fetch('/api/reservations').then(res => res.json())
      setReservations(updatedReservations)
    } catch (error) {
      console.error('Error saving reservation:', error)
      playErrorSound()
      alert('Failed to save reservation')
    }
  }

  // Rooms Handlers
  const handleAddRoom = () => {
    playClickSound()
    setEditingRoom(null)
    setRoomForm({
      room_number: '',
      room_type: '',
      floor: '',
      capacity: '',
      price_per_night: '',
      amenities: '',
      status: 'available'
    })
    setShowRoomModal(true)
  }

  const handleEditRoom = (room: any) => {
    playClickSound()
    setEditingRoom(room)
    setRoomForm({
      room_number: room.room_number,
      room_type: room.room_type,
      floor: room.floor,
      capacity: room.capacity,
      price_per_night: room.price_per_night,
      amenities: room.amenities || '',
      status: room.status
    })
    setShowRoomModal(true)
  }

  const handleDeleteRoom = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this room?')) return

    try {
      const response = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete room')

      setRooms(rooms.filter(r => r.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting room:', error)
      playErrorSound()
      alert('Failed to delete room')
    }
  }

  const handleSaveRoom = async () => {
    try {
      const payload = {
        room_number: roomForm.room_number,
        room_type: roomForm.room_type,
        floor: parseInt(roomForm.floor),
        capacity: parseInt(roomForm.capacity),
        price_per_night: parseFloat(roomForm.price_per_night),
        amenities: roomForm.amenities,
        status: roomForm.status
      }

      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms'
      const response = await fetch(url, {
        method: editingRoom ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRoom ? { ...payload, id: editingRoom.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save room')

      setShowRoomModal(false)
      playSuccessSound()
      // Refresh rooms
      const updatedRooms = await fetch('/api/rooms').then(res => res.json())
      setRooms(updatedRooms)
    } catch (error) {
      console.error('Error saving room:', error)
      playErrorSound()
      alert('Failed to save room')
    }
  }

  // Bookings Handlers
  const handleAddBooking = () => {
    playClickSound()
    setEditingBooking(null)
    setBookingForm({
      customer_name: '',
      customer_mobile: '',
      room_id: '',
      check_in: new Date().toISOString().split('T')[0],
      check_out: '',
      guests: '',
      total_amount: '',
      status: 'confirmed'
    })
    setShowBookingModal(true)
  }

  const handleEditBooking = (booking: any) => {
    playClickSound()
    setEditingBooking(booking)
    setBookingForm({
      customer_name: booking.customer_name,
      customer_mobile: booking.customer_mobile,
      room_id: booking.room_id,
      check_in: booking.check_in,
      check_out: booking.check_out,
      guests: booking.guests,
      total_amount: booking.total_amount,
      status: booking.status
    })
    setShowBookingModal(true)
  }

  const handleDeleteBooking = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this booking?')) return

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete booking')

      setBookings(bookings.filter(b => b.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting booking:', error)
      playErrorSound()
      alert('Failed to delete booking')
    }
  }

  const handleSaveBooking = async () => {
    try {
      const payload = {
        customer_name: bookingForm.customer_name,
        customer_mobile: bookingForm.customer_mobile,
        room_id: bookingForm.room_id,
        check_in: bookingForm.check_in,
        check_out: bookingForm.check_out,
        guests: parseInt(bookingForm.guests),
        total_amount: parseFloat(bookingForm.total_amount),
        status: bookingForm.status
      }

      const url = editingBooking ? `/api/bookings/${editingBooking.id}` : '/api/bookings'
      const response = await fetch(url, {
        method: editingBooking ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBooking ? { ...payload, id: editingBooking.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save booking')

      setShowBookingModal(false)
      playSuccessSound()
      const updatedBookings = await fetch('/api/bookings').then(res => res.json())
      setBookings(updatedBookings)
    } catch (error) {
      console.error('Error saving booking:', error)
      playErrorSound()
      alert('Failed to save booking')
    }
  }

  // Customers Handlers
  const handleAddCustomer = () => {
    playClickSound()
    setEditingCustomer(null)
    setCustomerForm({
      name: '',
      mobile: '',
      email: '',
      address: '',
      preferences: ''
    })
    setShowCustomerModal(true)
  }

  const handleEditCustomer = (customer: any) => {
    playClickSound()
    setEditingCustomer(customer)
    setCustomerForm({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email || '',
      address: customer.address || '',
      preferences: customer.preferences || ''
    })
    setShowCustomerModal(true)
  }

  const handleDeleteCustomer = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this customer?')) return

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete customer')

      setCustomers(customers.filter(c => c.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting customer:', error)
      playErrorSound()
      alert('Failed to delete customer')
    }
  }

  const handleSaveCustomer = async () => {
    try {
      const payload = {
        name: customerForm.name,
        mobile: customerForm.mobile,
        email: customerForm.email,
        address: customerForm.address,
        preferences: customerForm.preferences
      }

      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers'
      const response = await fetch(url, {
        method: editingCustomer ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer ? { ...payload, id: editingCustomer.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save customer')

      setShowCustomerModal(false)
      playSuccessSound()
      const updatedCustomers = await fetch('/api/customers').then(res => res.json())
      setCustomers(updatedCustomers)
    } catch (error) {
      console.error('Error saving customer:', error)
      playErrorSound()
      alert('Failed to save customer')
    }
  }

  // Inventory Handlers
  const handleAddInventory = () => {
    playClickSound()
    setEditingInventory(null)
    setInventoryForm({
      item_name: '',
      category: '',
      quantity: '',
      unit: '',
      unit_price: '',
      minimum_stock: '',
      supplier: ''
    })
    setShowInventoryModal(true)
  }

  const handleEditInventory = (item: any) => {
    playClickSound()
    setEditingInventory(item)
    setInventoryForm({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      minimum_stock: item.minimum_stock,
      supplier: item.supplier || ''
    })
    setShowInventoryModal(true)
  }

  const handleDeleteInventory = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete item')

      setInventory(inventory.filter(i => i.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting item:', error)
      playErrorSound()
      alert('Failed to delete item')
    }
  }

  const handleSaveInventory = async () => {
    try {
      const payload = {
        item_name: inventoryForm.item_name,
        category: inventoryForm.category,
        quantity: parseInt(inventoryForm.quantity),
        unit: inventoryForm.unit,
        unit_price: parseFloat(inventoryForm.unit_price),
        minimum_stock: parseInt(inventoryForm.minimum_stock),
        supplier: inventoryForm.supplier
      }

      const url = editingInventory ? `/api/inventory/${editingInventory.id}` : '/api/inventory'
      const response = await fetch(url, {
        method: editingInventory ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingInventory ? { ...payload, id: editingInventory.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save item')

      setShowInventoryModal(false)
      playSuccessSound()
      const updatedInventory = await fetch('/api/inventory').then(res => res.json())
      setInventory(updatedInventory)
    } catch (error) {
      console.error('Error saving item:', error)
      playErrorSound()
      alert('Failed to save item')
    }
  }

  // Team Handlers
  const handleAddTeam = () => {
    playClickSound()
    setEditingTeam(null)
    setTeamForm({
      name: '',
      role: '',
      mobile: '',
      email: '',
      department: '',
      salary: ''
    })
    setShowTeamModal(true)
  }

  const handleEditTeam = (member: any) => {
    playClickSound()
    setEditingTeam(member)
    setTeamForm({
      name: member.name,
      role: member.role,
      mobile: member.mobile,
      email: member.email || '',
      department: member.department,
      salary: member.salary
    })
    setShowTeamModal(true)
  }

  const handleDeleteTeam = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this team member?')) return

    try {
      const response = await fetch(`/api/team/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete team member')

      setTeam(team.filter(t => t.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting team member:', error)
      playErrorSound()
      alert('Failed to delete team member')
    }
  }

  const handleSaveTeam = async () => {
    try {
      const payload = {
        name: teamForm.name,
        role: teamForm.role,
        mobile: teamForm.mobile,
        email: teamForm.email,
        department: teamForm.department,
        salary: parseFloat(teamForm.salary)
      }

      const url = editingTeam ? `/api/team/${editingTeam.id}` : '/api/team'
      const response = await fetch(url, {
        method: editingTeam ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTeam ? { ...payload, id: editingTeam.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save team member')

      setShowTeamModal(false)
      playSuccessSound()
      const updatedTeam = await fetch('/api/team').then(res => res.json())
      setTeam(updatedTeam)
    } catch (error) {
      console.error('Error saving team member:', error)
      playErrorSound()
      alert('Failed to save team member')
    }
  }

  // Delivery Handlers
  const handleAddDelivery = () => {
    playClickSound()
    setEditingDelivery(null)
    setDeliveryForm({
      customer_name: '',
      mobile: '',
      address: '',
      order_id: '',
      driver_id: '',
      status: 'pending',
      delivery_fee: '',
      notes: ''
    })
    setShowDeliveryModal(true)
  }

  const handleEditDelivery = (delivery: any) => {
    playClickSound()
    setEditingDelivery(delivery)
    setDeliveryForm({
      customer_name: delivery.customer_name,
      mobile: delivery.mobile,
      address: delivery.address,
      order_id: delivery.order_id,
      driver_id: delivery.driver_id || '',
      status: delivery.status,
      delivery_fee: delivery.delivery_fee?.toString() || '',
      notes: delivery.notes || ''
    })
    setShowDeliveryModal(true)
  }

  const handleDeleteDelivery = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this delivery?')) return

    try {
      const response = await fetch(`/api/deliveries/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete delivery')

      setDeliveries(deliveries.filter(d => d.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting delivery:', error)
      playErrorSound()
      alert('Failed to delete delivery')
    }
  }

  const handleSaveDelivery = async () => {
    try {
      const payload = {
        customer_name: deliveryForm.customer_name,
        mobile: deliveryForm.mobile,
        address: deliveryForm.address,
        order_id: deliveryForm.order_id,
        driver_id: deliveryForm.driver_id,
        status: deliveryForm.status,
        delivery_fee: parseFloat(deliveryForm.delivery_fee) || 0,
        notes: deliveryForm.notes
      }

      const url = editingDelivery ? `/api/deliveries/${editingDelivery.id}` : '/api/deliveries'
      const response = await fetch(url, {
        method: editingDelivery ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDelivery ? { ...payload, id: editingDelivery.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save delivery')

      setShowDeliveryModal(false)
      playSuccessSound()
      const updatedDeliveries = await fetch('/api/deliveries').then(res => res.json())
      setDeliveries(updatedDeliveries)
    } catch (error) {
      console.error('Error saving delivery:', error)
      playErrorSound()
      alert('Failed to save delivery')
    }
  }

  // Accounting Handlers
  const handleAddTransaction = () => {
    playClickSound()
    setEditingTransaction(null)
    setTransactionForm({
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      category: '',
      amount: '',
      description: '',
      reference: ''
    })
    setShowTransactionModal(true)
  }

  const handleEditTransaction = (transaction: any) => {
    playClickSound()
    setEditingTransaction(transaction)
    setTransactionForm({
      date: transaction.date?.split('T')[0] || '',
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount?.toString() || '',
      description: transaction.description || '',
      reference: transaction.reference || ''
    })
    setShowTransactionModal(true)
  }

  const handleDeleteTransaction = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      const response = await fetch(`/api/accounting/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete transaction')

      setTransactions(transactions.filter(t => t.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting transaction:', error)
      playErrorSound()
      alert('Failed to delete transaction')
    }
  }

  const handleSaveTransaction = async () => {
    try {
      const payload = {
        date: transactionForm.date,
        type: transactionForm.type,
        category: transactionForm.category,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description,
        reference: transactionForm.reference
      }

      const url = editingTransaction ? `/api/accounting/${editingTransaction.id}` : '/api/accounting'
      const response = await fetch(url, {
        method: editingTransaction ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTransaction ? { ...payload, id: editingTransaction.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save transaction')

      setShowTransactionModal(false)
      playSuccessSound()
      const updatedTransactions = await fetch('/api/accounting').then(res => res.json())
      setTransactions(updatedTransactions)
    } catch (error) {
      console.error('Error saving transaction:', error)
      playErrorSound()
      alert('Failed to save transaction')
    }
  }

  // Marketing Handlers
  const handleAddCampaign = () => {
    playClickSound()
    setEditingCampaign(null)
    setCampaignForm({
      name: '',
      type: 'promotion',
      start_date: '',
      end_date: '',
      budget: '',
      status: 'active',
      description: ''
    })
    setShowCampaignModal(true)
  }

  const handleEditCampaign = (campaign: any) => {
    playClickSound()
    setEditingCampaign(campaign)
    setCampaignForm({
      name: campaign.name,
      type: campaign.type,
      start_date: campaign.start_date?.split('T')[0] || '',
      end_date: campaign.end_date?.split('T')[0] || '',
      budget: campaign.budget?.toString() || '',
      status: campaign.status,
      description: campaign.description || ''
    })
    setShowCampaignModal(true)
  }

  const handleDeleteCampaign = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const response = await fetch(`/api/marketing/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete campaign')

      setCampaigns(campaigns.filter(c => c.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      playErrorSound()
      alert('Failed to delete campaign')
    }
  }

  const handleSaveCampaign = async () => {
    try {
      const payload = {
        name: campaignForm.name,
        type: campaignForm.type,
        start_date: campaignForm.start_date,
        end_date: campaignForm.end_date,
        budget: parseFloat(campaignForm.budget) || 0,
        status: campaignForm.status,
        description: campaignForm.description
      }

      const url = editingCampaign ? `/api/marketing/${editingCampaign.id}` : '/api/marketing'
      const response = await fetch(url, {
        method: editingCampaign ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCampaign ? { ...payload, id: editingCampaign.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save campaign')

      setShowCampaignModal(false)
      playSuccessSound()
      const updatedCampaigns = await fetch('/api/marketing').then(res => res.json())
      setCampaigns(updatedCampaigns)
    } catch (error) {
      console.error('Error saving campaign:', error)
      playErrorSound()
      alert('Failed to save campaign')
    }
  }

  // Operations Handlers
  const handleAddShift = () => {
    playClickSound()
    setEditingShift(null)
    setShiftForm({
      date: new Date().toISOString().split('T')[0],
      staff_id: '',
      start_time: '',
      end_time: '',
      status: 'scheduled',
      notes: ''
    })
    setShowShiftModal(true)
  }

  const handleEditShift = (shift: any) => {
    playClickSound()
    setEditingShift(shift)
    setShiftForm({
      date: shift.date?.split('T')[0] || '',
      staff_id: shift.staff_id,
      start_time: shift.start_time,
      end_time: shift.end_time,
      status: shift.status,
      notes: shift.notes || ''
    })
    setShowShiftModal(true)
  }

  const handleDeleteShift = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this shift?')) return

    try {
      const response = await fetch(`/api/operations/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete shift')

      setShifts(shifts.filter(s => s.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting shift:', error)
      playErrorSound()
      alert('Failed to delete shift')
    }
  }

  const handleSaveShift = async () => {
    try {
      const payload = {
        date: shiftForm.date,
        staff_id: shiftForm.staff_id,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        status: shiftForm.status,
        notes: shiftForm.notes
      }

      const url = editingShift ? `/api/operations/${editingShift.id}` : '/api/operations'
      const response = await fetch(url, {
        method: editingShift ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingShift ? { ...payload, id: editingShift.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save shift')

      setShowShiftModal(false)
      playSuccessSound()
      const updatedShifts = await fetch('/api/operations').then(res => res.json())
      setShifts(updatedShifts)
    } catch (error) {
      console.error('Error saving shift:', error)
      playErrorSound()
      alert('Failed to save shift')
    }
  }

  // Attendance Handlers
  const handleAddAttendance = () => {
    playClickSound()
    setEditingAttendance(null)
    setAttendanceForm({
      staff_id: '',
      date: new Date().toISOString().split('T')[0],
      check_in: '',
      check_out: '',
      status: 'present',
      notes: ''
    })
    setShowAttendanceModal(true)
  }

  const handleEditAttendance = (attendance: any) => {
    playClickSound()
    setEditingAttendance(attendance)
    setAttendanceForm({
      staff_id: attendance.staff_id,
      date: attendance.date?.split('T')[0] || '',
      check_in: attendance.check_in,
      check_out: attendance.check_out,
      status: attendance.status,
      notes: attendance.notes || ''
    })
    setShowAttendanceModal(true)
  }

  const handleDeleteAttendance = async (id: string) => {
    playClickSound()
    if (!confirm('Are you sure you want to delete this attendance record?')) return

    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete attendance record')

      setAttendanceRecords(attendanceRecords.filter(a => a.id !== id))
      playSuccessSound()
    } catch (error) {
      console.error('Error deleting attendance record:', error)
      playErrorSound()
      alert('Failed to delete attendance record')
    }
  }

  const handleSaveAttendance = async () => {
    try {
      const payload = {
        staff_id: attendanceForm.staff_id,
        date: attendanceForm.date,
        check_in: attendanceForm.check_in,
        check_out: attendanceForm.check_out,
        status: attendanceForm.status,
        notes: attendanceForm.notes
      }

      const url = editingAttendance ? `/api/attendance/${editingAttendance.id}` : '/api/attendance'
      const response = await fetch(url, {
        method: editingAttendance ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAttendance ? { ...payload, id: editingAttendance.id } : payload)
      })

      if (!response.ok) throw new Error('Failed to save attendance record')

      setShowAttendanceModal(false)
      playSuccessSound()
      const updatedAttendance = await fetch('/api/attendance').then(res => res.json())
      setAttendanceRecords(updatedAttendance)
    } catch (error) {
      console.error('Error saving attendance record:', error)
      playErrorSound()
      alert('Failed to save attendance record')
    }
  }

  // Settings Handler
  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hotelSettings)
      })

      if (!response.ok) throw new Error('Failed to save settings')

      playSuccessSound()
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      playErrorSound()
      alert('Failed to save settings')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Failed to upload logo')

      const data = await response.json()
      setLogoPreview(data.url)
      setHotelSettings({ ...hotelSettings, logo_url: data.url })
      playSuccessSound()
    } catch (error) {
      console.error('Error uploading logo:', error)
      playErrorSound()
      alert('Failed to upload logo')
    }
  }

  // Calculate bill total with discount
  const calculateBillTotal = () => {
    const subtotal = getCartTotal()
    let discount = 0
    if (billDiscountType === 'amount' && billDiscountAmount) {
      discount = parseFloat(billDiscountAmount)
    } else if (billDiscountType === 'percentage' && billDiscountPercentage) {
      discount = (parseFloat(billDiscountPercentage) / 100) * subtotal
    }
    const discountedAmount = Math.max(0, subtotal - discount)
    const cgst = discountedAmount * (parseFloat(cgstRate) / 100)
    const sgst = discountedAmount * (parseFloat(sgstRate) / 100)
    return discountedAmount + cgst + sgst
  }

  // Calculate CGST and SGST amounts
  const calculateTaxes = () => {
    const subtotal = getCartTotal()
    let discount = 0
    if (billDiscountType === 'amount' && billDiscountAmount) {
      discount = parseFloat(billDiscountAmount)
    } else if (billDiscountType === 'percentage' && billDiscountPercentage) {
      discount = (parseFloat(billDiscountPercentage) / 100) * subtotal
    }
    const discountedAmount = Math.max(0, subtotal - discount)
    const cgst = discountedAmount * (parseFloat(cgstRate) / 100)
    const sgst = discountedAmount * (parseFloat(sgstRate) / 100)
    return { cgst, sgst, discountedAmount }
  }

  const handleCreateBill = () => {
    playClickSound()
    console.log('Creating bill - Cart items:', offlineCart)
    console.log('Selected table:', selectedTable)

    if (offlineCart.length === 0) {
      alert('Please add items to cart first')
      return
    }
    if (!selectedTable) {
      alert('Please select a table')
      return
    }
    setShowBillPreview(true)
  }

  const handlePrintBill = async () => {
    console.log('Printing bill - Cart items:', offlineCart)
    console.log('Selected table:', selectedTable)
    console.log('Tables available:', tables)

    if (offlineCart.length === 0) {
      alert('Cart is empty. Cannot print bill.')
      return
    }

    const tableNumber = tables.find(t => t.id === selectedTable)?.table_number || 'N/A'
    const isMasterTable = tables.find(t => t.id === selectedTable)?.is_master || false
    const waiterName = user?.name || 'N/A'

    console.log('Table number:', tableNumber)
    console.log('Waiter name:', waiterName)

    const plainText = `
<div style="text-align: center; margin-bottom: 8px;">
  <img src="/dhole patil logo-03.png" alt="Dhole Patil Logo" style="width: 120px; height: auto; margin-bottom: 8px;" />
</div>
<strong class="header">DHOLE PATIL KHANAWAL</strong><br>
<strong>VEG & NON-VEG</strong><br>
================================<br>
<strong>Sangamner</strong><br>
<strong>CITY, STATE - 123456</strong><br>
<strong>PHONE: +91 98765 43210</strong><br>
<strong>GSTIN: 29ABCDE1234F1Z5</strong><br>
================================<br>
<strong class="section-title">BILL / INVOICE</strong><br>
================================<br>
<br>
<strong>BILL NO: DPK-${String((Date.now() % 999) + 1).padStart(3, '0')}</strong><br>
<strong>DATE: ${new Date().toLocaleDateString()}</strong><br>
<strong>TIME: ${new Date().toLocaleTimeString()}</strong><br>
<strong>TABLE: ${tableNumber}${isMasterTable ? ' (M)' : ''}</strong><br>
<strong>WAITER: ${waiterName}</strong><br>
<strong>CUSTOMER: ${customerName || 'GUEST'}</strong><br>
--------------------------<br>
<strong class="section-title">ITEM             QTY  AMOUNT</strong><br>
--------------------------<br>
${offlineCart.map((item) => {
  const name = item.name
  const qty = item.quantity
  const price = item.price
  const total = (price * qty).toFixed(2)
  const itemName = name.length > 16 ? name.substring(0, 15) + '.' : name
  return `<strong>${itemName.padEnd(16)} ${qty.toString().padStart(2)}  ${total.padStart(8)}</strong><br>`
}).join('')}
--------------------------<br>
<strong>SUBTOTAL:      RS${getCartTotal().toFixed(2).padStart(8)}</strong><br>
${(() => {
  const subtotal = getCartTotal()
  let discount = 0
  if (billDiscountType === 'amount' && billDiscountAmount) {
    discount = parseFloat(billDiscountAmount)
  } else if (billDiscountType === 'percentage' && billDiscountPercentage) {
    discount = (parseFloat(billDiscountPercentage) / 100) * subtotal
  }
  return discount > 0 ? `<strong>DISCOUNT:      RS${discount.toFixed(2).padStart(8)}</strong><br>` : ''
})()}<strong>CGST (${cgstRate}%):   RS${calculateTaxes().cgst.toFixed(2).padStart(8)}</strong><br>
<strong>SGST (${sgstRate}%):   RS${calculateTaxes().sgst.toFixed(2).padStart(8)}</strong><br>
================================<br>
<strong class="grand-total"> GRAND TOTAL: RS${calculateBillTotal().toFixed(2)} </strong><br>
================================<br>
<strong>THANK YOU FOR DINING!</strong><br>
<strong>VISIT US AGAIN</strong><br>
================================<br>
<strong class="developer">DEVELOPED BY ONETHYNK TECHMEDIA</strong><br>
================================
`

    console.log('Bill content generated:', plainText)

    try {
      // QZ Tray printing disabled due to dependency issues
      // const printerConfig: PrinterConfig = {
      //   name: process.env.NEXT_PUBLIC_DEFAULT_PRINTER || '',
      //   isDefault: true
      // }

      // const printed = await printBillWithFallback(plainText, plainText, printerConfig)

      // if (printed) {
      //   playSuccessSound()
      //   console.log('Bill printed successfully via QZ Tray')
      // } else {
      //   console.log('Bill printed via browser fallback')
      // }

      // Use WebUSB printer instead
      const webusbPrinter = new WebUSBPrinter()
      await webusbPrinter.printReceipt(plainText)
      playSuccessSound()
    } catch (error) {
      console.error('Print failed:', error)
      playErrorSound()
      alert('Printing failed. Please check printer connection and try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#6B3E26]">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        overviewSubTab={overviewSubTab}
        setOverviewSubTab={setOverviewSubTab}
      />

      <div className="flex-1 lg:ml-72 bg-[#F3F3F3]">
        {/* Top Header Bar */}
        <header className="fixed top-0 right-0 left-0 lg:left-72 bg-white/95 backdrop-blur-sm shadow-md z-30 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Dhole Patil Hotel Logo" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-[#6B3E26] leading-tight">Dhole Patil</h1>
                <p className="text-sm text-gray-600 leading-tight font-semibold">Khanawal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <GoogleTranslate variant="white" />

              {/* Support Button */}
              <button
                onClick={() => { playClickSound(); alert('Support: Contact admin@hotel.com for assistance') }}
                className="p-2 rounded-xl bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-all duration-300"
                title="Support"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Notification Button */}
              <div className="relative">
                <button
                  onClick={() => { playClickSound(); setShowNotifications(!showNotifications) }}
                  className="p-2 rounded-xl bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-all duration-300 relative"
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
                          playClickSound()
                          notifications.forEach(n => {
                            fetch(`/api/notifications/${n.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ is_read: true })
                            })
                          })
                          setNotifications(notifications.map(n => ({ ...n, is_read: true })))
                        }}
                        className="text-xs text-[#6B3E26] hover:text-[#9A572D] font-semibold"
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
                            className={`px-4 py-3 hover:bg-amber-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-amber-50' : ''}`}
                            onClick={() => {
                              playClickSound()
                              fetch(`/api/notifications/${notification.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ is_read: true })
                              })
                              setNotifications(notifications.map(n => n.id === notification.id ? { ...n, is_read: true } : n))
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${!notification.is_read ? 'bg-[#9A572D]' : 'bg-gray-300'}`} />
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
                  onClick={() => { playClickSound(); setShowProfileMenu(!showProfileMenu) }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-[#F5F5DC] hover:bg-[#DEB887] transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-[#6B3E26] rounded-full flex items-center justify-center text-white font-bold text-sm">
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
                      onClick={() => { playClickSound(); handleLogout() }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:text-red-800 font-semibold"
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

        <main className="p-4 lg:p-8 pt-24 lg:pt-20 pb-20 lg:pb-8">

        {activeTab === 'overview' && (
          <>
            <div className="mb-6 animate-fade-in flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">
                  Welcome, {user?.name || 'Admin'}!
                </h1>
                <p className="text-gray-600 mt-2 text-sm">
                  {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} •
                  {currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => { playClickSound(); fetchData() }}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#6B3E26]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Today's Revenue</p>
                  <p className="text-2xl font-bold text-[#6B3E26]">₹12,450</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#9A572D]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Today's Orders</p>
                  <p className="text-2xl font-bold text-[#9A572D]">48</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#D4A574]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Occupied Tables</p>
                  <p className="text-2xl font-bold text-[#D4A574]">{tables.filter(t => t.is_occupied).length}/{tables.length}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#E8B478]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Kitchen Queue</p>
                  <p className="text-2xl font-bold text-[#E8B478]">{orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue - Last 14 Days</h3>
                <div className="h-64 bg-[#F5F5DC] rounded-xl flex items-center justify-center">
                  <p className="text-gray-600">Chart placeholder</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Food Waste Cost - Last 14 Days</h3>
                <div className="h-64 bg-[#F5F5DC] rounded-xl flex items-center justify-center">
                  <p className="text-gray-600">Chart placeholder</p>
                </div>
              </div>
            </div>

            {/* Tables Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#D4A574]">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#D4A574]">{tables.filter(t => !t.is_occupied).length}</p>
                  <p className="text-sm font-semibold text-[#9A572D]">Available</p>
                </div>
              </div>
              <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#C97B7B]">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#C97B7B]">{tables.filter(t => t.is_occupied).length}</p>
                  <p className="text-sm font-semibold text-[#9A572D]">Occupied</p>
                </div>
              </div>
              <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#E8B478]">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#E8B478]">0</p>
                  <p className="text-sm font-semibold text-[#9A572D]">Reserved</p>
                </div>
              </div>
              <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#9B8BB5]">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#9B8BB5]">0</p>
                  <p className="text-sm font-semibold text-[#9A572D]">Cleaning</p>
                </div>
              </div>
            </div>

            {/* Kitchen Queue Status */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Kitchen Queue Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#E8B478]">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#E8B478]">{orders.filter(o => o.status === 'pending').length}</p>
                    <p className="text-sm font-semibold text-[#9A572D]">New</p>
                  </div>
                </div>
                <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#9B8BB5]">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#9B8BB5]">{orders.filter(o => o.status === 'preparing').length}</p>
                    <p className="text-sm font-semibold text-[#9A572D]">Accepted</p>
                  </div>
                </div>
                <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#9A572D]">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#9A572D]">{orders.filter(o => o.status === 'preparing').length}</p>
                    <p className="text-sm font-semibold text-[#9A572D]">Preparing</p>
                  </div>
                </div>
                <div className="bg-[#F5F5DC] rounded-xl p-4 border-2 border-[#D4A574]">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#D4A574]">{orders.filter(o => o.status === 'ready').length}</p>
                    <p className="text-sm font-semibold text-[#9A572D]">Ready</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{formatOrderId(order.id)}</p>
                      <p className="text-sm text-gray-600">Table {order.tables?.table_number || '-'}</p>
                    </div>
                    <p className="font-bold text-[#6B3E26]">₹{order.total_amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Online Orders</h3>
                <div className="text-center py-8">
                  <p className="text-4xl font-bold text-[#6B3E26]">0</p>
                  <p className="text-gray-600">Today</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Offline Orders</h3>
                <div className="text-center py-8">
                  <p className="text-4xl font-bold text-[#9A572D]">{orders.length}</p>
                  <p className="text-gray-600">Today</p>
                </div>
              </div>
            </div>

            {/* Table Order Details Modal */}
            {showTableOrderDetails && selectedTableForOverview && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center sticky top-0">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Table {selectedTableForOverview.table_number} Orders</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedTableForOverview.capacity} Seater • {selectedTableForOverview.is_occupied ? 'Occupied' : 'Available'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        playClickSound()
                        setShowTableOrderDetails(false)
                        setSelectedTableForOverview(null)
                      }}
                      className="p-2 rounded-xl bg-white hover:bg-gray-100 transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    {orders.filter(o => o.table_id === selectedTableForOverview.id && ['pending', 'preparing', 'ready'].includes(o.status)).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-lg font-semibold text-gray-500 mb-4">No active orders for this table</p>
                        <button
                          onClick={() => {
                            playClickSound()
                            setAdminOrderTable(selectedTableForOverview)
                            setAdminOrderCart([])
                            setAdminOrderCustomerName('')
                            setAdminOrderCustomerMobile('')
                            setShowAdminOrderModal(true)
                            setShowTableOrderDetails(false)
                          }}
                          className="inline-flex items-center gap-2 bg-[#6B3E26] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
                        >
                          <Plus className="w-5 h-5" />
                          Take New Order
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders
                          .filter(o => o.table_id === selectedTableForOverview.id && ['pending', 'preparing', 'ready'].includes(o.status))
                          .map((order) => (
                            <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900">Order {formatOrderId(order.id)}</h4>
                                  <p className="text-sm text-gray-600">
                                    {new Date(order.created_at).toLocaleString()} • {order.customer_name || 'Guest'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    order.status === 'paid' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                    order.status === 'ready' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                    order.status === 'preparing' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                    order.status === 'pending' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {order.status}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      playClickSound()
                                      handleGenerateBill(order)
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                      order.is_printed
                                        ? 'bg-white border-2 border-[#9A572D] text-[#9A572D] hover:bg-[#F5F0E8]'
                                        : 'bg-[#6B3E26] text-white hover:bg-[#9A572D]'
                                    }`}
                                  >
                                    {order.is_printed ? 'Printed' : 'Print Bill'}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {order.order_items?.map((item: any) => (
                                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      {getFoodTypeIcon(item.dishes?.food_type)}
                                      <div>
                                        <p className="font-semibold text-gray-900">{item.dishes?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                                      </div>
                                    </div>
                                    <p className="font-bold text-gray-900">₹{((item.dishes?.price || item.price || 0) * item.quantity).toFixed(2)}</p>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                <p className="text-sm text-gray-600">Total: {order.order_items?.length || 0} items</p>
                                <p className="text-xl font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Admin Order Modal - Global */}
        {showAdminOrderModal && adminOrderTable && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  {adminOrderStep === 'dishes' && (
                    <div>
                      {/* Header */}
                      <div className="mb-3 sm:mb-6 bg-[#F5F5DC] rounded-2xl p-3 sm:p-4 border-2 border-[#9A572D]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                              Table {adminOrderTable.table_number}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-900">{adminOrderTable.capacity} seats</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                playClickSound()
                                setShowAdminOrderModal(false)
                                setAdminOrderTable(null)
                                setAdminOrderCart([])
                                setAdminOrderStep('dishes')
                                setAdminSelectedDishTypes({})
                              }}
                              className="flex items-center gap-1 bg-white text-[#6B3E26] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-[#FAEBD7] transition-all duration-300 border-2 border-[#9A572D] text-xs sm:text-sm"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                              Close
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Customer Name</label>
                            <input
                              type="text"
                              value={adminOrderCustomerName}
                              onChange={(e) => setAdminOrderCustomerName(e.target.value)}
                              className="w-full px-2 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6B3E26] focus:border-transparent text-xs sm:text-sm"
                              placeholder="Enter customer name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                            <input
                              type="text"
                              value={adminOrderCustomerMobile}
                              onChange={(e) => setAdminOrderCustomerMobile(e.target.value)}
                              className="w-full px-2 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6B3E26] focus:border-transparent text-xs sm:text-sm"
                              placeholder="Enter mobile number"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3 px-2 sm:px-4">
                        {['all', ...Array.from(new Set(dishes.map(d => d.category)))].map((category) => (
                          <button
                            key={category}
                            onClick={() => { playClickSound(); setAdminOrderCategory(category) }}
                            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                              adminOrderCategory === category
                                ? 'bg-[#6B3E26] text-white shadow-lg'
                                : 'bg-white text-gray-900 hover:bg-[#F5F5DC] border-2 border-amber-200'
                            }`}
                          >
                            {category === 'all' ? 'All' : category}
                          </button>
                        ))}
                      </div>

                      {/* Food Type Filter */}
                      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 px-2 sm:px-4">
                        <button
                          onClick={() => { playClickSound(); setAdminOrderFoodType('all') }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            adminOrderFoodType === 'all'
                              ? 'bg-[#6B3E26] text-white shadow-lg'
                              : 'bg-white text-gray-900 hover:bg-[#F5F5DC] border-2 border-amber-200'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => { playClickSound(); setAdminOrderFoodType('veg') }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            adminOrderFoodType === 'veg'
                              ? 'bg-amber-900 text-white shadow-lg'
                              : 'bg-white text-gray-900 hover:bg-amber-50 border-2 border-amber-200'
                          }`}
                        >
                          <div className="w-3 h-3 flex items-center justify-center border-2 border-amber-600 bg-amber-50 rounded-sm">
                            <div className="w-1.5 h-1.5 bg-amber-900 rounded-full"></div>
                          </div>
                          Veg
                        </button>
                        <button
                          onClick={() => { playClickSound(); setAdminOrderFoodType('nonveg') }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            adminOrderFoodType === 'nonveg'
                              ? 'bg-amber-900 text-white shadow-lg'
                              : 'bg-white text-gray-900 hover:bg-amber-50 border-2 border-amber-200'
                          }`}
                        >
                          <div className="w-3 h-3 flex items-center justify-center border-2 border-amber-600 bg-amber-50 rounded-sm">
                            <div className="w-1.5 h-1.5 bg-amber-900 rounded-full"></div>
                          </div>
                          Non-Veg
                        </button>
                      </div>

                      {/* Dishes List */}
                      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-20 sm:mb-8 px-2 sm:px-4">
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
                              {dishes
                                .filter(d => d.is_available)
                                .filter(d => adminOrderCategory === 'all' || d.category === adminOrderCategory)
                                .filter(d => adminOrderFoodType === 'all' || d.food_type === adminOrderFoodType)
                                .map((dish) => (
                                <tr key={dish.id} className="hover:bg-[#F5F5DC] transition-colors">
                                  <td className="px-2 sm:px-3 py-2">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        {getFoodTypeIcon(dish.food_type)}
                                        <h3 className="font-bold text-gray-900 text-sm">{dish.name}</h3>
                                        {dish.offer && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                            {dish.offer}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-900">{dish.category}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-right">
                                    <p className="font-bold text-gray-900 text-sm">₹{dish.price.toFixed(2)}</p>
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-center">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto ${
                                      dish.is_available 
                                        ? 'bg-[#6B3E26] text-white' 
                                        : 'bg-amber-900 text-white'
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
                                        value={adminSelectedDishTypes[dish.id] || 'Normal'}
                                        onChange={(e) => setAdminSelectedDishTypes({...adminSelectedDishTypes, [dish.id]: e.target.value})}
                                        className="text-xs border border-amber-300 rounded px-1 py-1 bg-white"
                                      >
                                        {dishTypes.map(type => (
                                          <option key={type} value={type}>{type}</option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => { playClickSound(); adminAddToCart(dish, adminSelectedDishTypes[dish.id] || 'Normal') }}
                                        disabled={!dish.is_available}
                                        className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 text-xs border-2 ${
                                          !dish.is_available
                                            ? 'bg-amber-300 text-gray-900 border-amber-300 cursor-not-allowed'
                                            : adminOrderCart.some(item => item.dish_id === dish.id && item.dish_type === (adminSelectedDishTypes[dish.id] || 'Normal'))
                                              ? 'bg-white text-gray-900 border-amber-900 hover:bg-amber-100'
                                              : 'bg-[#6B3E26] text-white border-[#6B3E26] hover:bg-[#9A572D]'
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
                      {adminOrderCart.length > 0 && (
                        <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-[#9A572D] p-2 sm:p-4 z-50">
                          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
                            <div className="text-center sm:text-left">
                              <p className="text-xs text-gray-900">{adminOrderCart.length} items</p>
                              <p className="text-base sm:text-xl font-bold text-gray-900">
                                ₹{adminGetCartTotal().toFixed(2)}
                              </p>
                            </div>
                            <button
                              onClick={() => { playClickSound(); setAdminOrderStep('cart') }}
                              className="flex items-center gap-1 sm:gap-2 bg-[#6B3E26] text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 w-full sm:w-auto justify-center text-xs sm:text-sm"
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-5 sm:h-5" />
                              <span className="hidden sm:inline">View Cart</span>
                              <span className="sm:hidden">Cart</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mobile Cart Button */}
                      {adminOrderCart.length > 0 && (
                        <button
                          onClick={() => { playClickSound(); setAdminOrderStep('cart') }}
                          className="sm:hidden fixed bottom-20 right-4 bg-[#6B3E26] text-white p-4 rounded-full shadow-2xl hover:bg-[#9A572D] transition-all duration-300 z-50"
                        >
                          <ShoppingCart className="w-6 h-6" />
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                            {adminOrderCart.length}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {adminOrderStep === 'cart' && (
                    <div>
                      {/* Header */}
                      <div className="mb-3 sm:mb-6 bg-[#F5F5DC] rounded-2xl p-3 sm:p-4 border-2 border-[#9A572D]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                              Order Review - Table {adminOrderTable.table_number}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-900">{adminOrderTable.capacity} seats</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { playClickSound(); setAdminOrderStep('dishes') }}
                              className="flex items-center gap-1 bg-white text-[#6B3E26] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-[#FAEBD7] transition-all duration-300 border-2 border-[#9A572D] text-xs sm:text-sm"
                            >
                              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                              Back
                            </button>
                            <button
                              onClick={() => {
                                playClickSound()
                                setShowAdminOrderModal(false)
                                setAdminOrderTable(null)
                                setAdminOrderCart([])
                                setAdminOrderStep('dishes')
                                setAdminSelectedDishTypes({})
                              }}
                              className="flex items-center gap-1 bg-white text-[#6B3E26] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-[#FAEBD7] transition-all duration-300 border-2 border-[#9A572D] text-xs sm:text-sm"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                              Close
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Cart Items */}
                      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4 p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Order Items</h3>
                        {adminOrderCart.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">Your cart is empty</p>
                        ) : (
                          <div className="space-y-3">
                            {adminOrderCart.map((item, index) => {
                              const dish = dishes.find(d => d.id === item.dish_id)
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    {getFoodTypeIcon(dish?.food_type)}
                                    <div>
                                      <p className="font-semibold text-gray-900">{item.name}</p>
                                      <p className="text-xs text-gray-600">{item.dish_type || 'Normal'} • ₹{item.price}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => adminUpdateCartItemQuantity(index, item.quantity - 1)}
                                      className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold w-8 text-center">{item.quantity}</span>
                                    <button
                                      onClick={() => adminUpdateCartItemQuantity(index, item.quantity + 1)}
                                      className="w-8 h-8 rounded-lg bg-[#6B3E26] text-white hover:bg-[#9A572D] flex items-center justify-center"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => adminRemoveFromCart(index)}
                                      className="w-8 h-8 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center justify-center ml-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Total and Submit */}
                      {adminOrderCart.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-xl p-4">
                          <div className="flex justify-between items-center text-xl font-bold mb-4">
                            <span>Total:</span>
                            <span>₹{adminGetCartTotal().toFixed(2)}</span>
                          </div>
                          <button
                            onClick={handleAdminSubmitOrder}
                            disabled={adminOrderSubmitting}
                            className="w-full px-6 py-3 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {adminOrderSubmitting ? 'Submitting...' : 'Submit Order to Kitchen'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

        {/* Occupied Table Order Modal */}
        {showOccupiedTableOrderModal && selectedOccupiedTableOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
              {/* Header */}
              <div className="bg-[#6B3E26] text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Table {tables.find(t => t.id === selectedOccupiedTableOrder.table_id)?.table_number} - Active Order</h2>
                    <p className="text-sm opacity-90 mt-1">Order ID: {formatOrderId(selectedOccupiedTableOrder.id)}</p>
                  </div>
                  <button
                    onClick={() => { playClickSound(); setShowOccupiedTableOrderModal(false); setSelectedOccupiedTableOrder(null) }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Order Details */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600"><strong>Customer:</strong> {selectedOccupiedTableOrder.customer_name || 'Walk-in'}</p>
                  <p className="text-sm text-gray-600"><strong>Mobile:</strong> {selectedOccupiedTableOrder.customer_mobile || 'N/A'}</p>
                  <p className="text-sm text-gray-600"><strong>Status:</strong> <span className="font-semibold text-[#6B3E26]">{selectedOccupiedTableOrder.status}</span></p>
                </div>

                {/* Order Items */}
                <div className="bg-[#F5F5DC] rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-[#6B3E26] mb-3">Order Items</h3>
                  {selectedOccupiedTableOrder.order_items && selectedOccupiedTableOrder.order_items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOccupiedTableOrder.order_items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center bg-white p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getFoodTypeIcon(item.dish?.food_type)}
                              <span className="font-semibold text-gray-900">{item.dish?.name || 'Unknown'}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.dish_type && <span className="mr-2">({item.dish_type})</span>}
                              Qty: {item.quantity}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#6B3E26]">₹{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-4">No items in this order</p>
                  )}
                </div>

                {/* Total */}
                <div className="bg-gray-100 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total Amount:</span>
                    <span className="text-[#6B3E26]">₹{selectedOccupiedTableOrder.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleRepeatOrder}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#9A572D] text-white rounded-xl font-semibold hover:bg-[#6B3E26] transition-all duration-300"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Repeat Order
                  </button>
                  <button
                    onClick={handlePrintOrder}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                  >
                    <Printer className="w-5 h-5" />
                    Print Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <>
            <div className="mb-6 animate-fade-in bg-gradient-to-br from-[#F5F5DC] to-[#E8E4C9] p-6 rounded-2xl">
              <h1 className="text-3xl font-bold text-[#6B3E26]">Point of Sale</h1>
              <p className="text-gray-600 mt-2">Manage tables and take orders</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#6B3E26]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Today's Revenue</p>
                  <p className="text-2xl font-bold text-[#6B3E26]">₹12,450</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#9A572D]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Today's Orders</p>
                  <p className="text-2xl font-bold text-[#9A572D]">48</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#D4A574]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Occupied Tables</p>
                  <p className="text-2xl font-bold text-[#D4A574]">{tables.filter(t => t.is_occupied).length}/{tables.length}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl shadow-lg p-6 border-l-4 border-[#E8B478]">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Kitchen Queue</p>
                  <p className="text-2xl font-bold text-[#E8B478]">{orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}</p>
                </div>
              </div>
            </div>

            {/* Table Status Buttons */}
            <div className="bg-white shadow-2xl border-t-2 border-gray-200 p-2 fixed bottom-0 left-0 right-0 z-40 lg:static lg:mb-6 lg:p-4 lg:rounded-xl">
              <div className="grid grid-cols-4 gap-1 lg:gap-2">
                <button
                  onClick={() => { playClickSound() }}
                  className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg bg-[#6B3E26] text-white hover:bg-[#5D3A1A] transition-all"
                >
                  <Users className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-xs font-semibold lg:text-sm">Active</span>
                  <span className="text-xs font-bold lg:text-sm">{tables.filter(t => t.is_occupied).length}</span>
                </button>
                <button
                  onClick={() => { playClickSound() }}
                  className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg bg-[#9A572D] text-white hover:bg-[#6B3E26] transition-all"
                >
                  <Utensils className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-xs font-semibold lg:text-sm">Occupied</span>
                  <span className="text-xs font-bold lg:text-sm">{tables.filter(t => t.is_occupied).length}</span>
                </button>
                <button
                  onClick={() => { playClickSound() }}
                  className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg bg-[#D4AA7D] text-white hover:bg-[#9A572D] transition-all"
                >
                  <Users className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-xs font-semibold lg:text-sm">Total</span>
                  <span className="text-xs font-bold lg:text-sm">{tables.length}</span>
                </button>
                <button
                  onClick={() => { playClickSound() }}
                  className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg bg-[#C9A66B] text-white hover:bg-[#B8956A] transition-all"
                >
                  <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-xs font-semibold lg:text-sm">Available</span>
                  <span className="text-xs font-bold lg:text-sm">{tables.filter(t => !t.is_occupied).length}</span>
                </button>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Tables Status</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      onClick={() => {
                        if (table.is_occupied) {
                          handleOccupiedTableClick(table)
                        } else {
                          playClickSound()
                          setAdminOrderTable(table)
                          setAdminOrderCart([])
                          setAdminOrderCustomerName('')
                          setAdminOrderCustomerMobile('')
                          setShowAdminOrderModal(true)
                        }
                      }}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg
                        ${table.is_occupied
                          ? 'bg-[#E8D4C4] border-[#C97B7B]'
                          : 'bg-[#F5F5DC] border-[#D4A574]'
                        }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          T{table.table_number}
                        </div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">
                          {table.capacity} Seater
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-full inline-block
                          ${table.is_occupied ? 'bg-[#C97B7B] text-white' : 'bg-[#D4A574] text-white'}
                        `}>
                          {table.is_occupied ? 'Occupied' : 'Available'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tables Status Legend */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#D4A574] rounded"></div>
                  <span className="text-sm font-semibold text-gray-700">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#C97B7B] rounded"></div>
                  <span className="text-sm font-semibold text-gray-700">Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#E8B478] rounded"></div>
                  <span className="text-sm font-semibold text-gray-700">Reserved</span>
                </div>
              </div>
            </div>

            {/* Waitlist Section */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Waitlist</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-500 text-center py-8">No customers in waitlist</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders Management</h2>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">All Orders</h3>
              <button
                onClick={() => { playClickSound(); fetchData() }}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F5DC]">
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
                  {orders.map((order, index) => (
                    <>
                      <tr 
                        key={`${order.id}-${index}`} 
                        className="hover:bg-amber-50 transition-colors cursor-pointer md:cursor-default"
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {order.tables?.is_master ? `Table ${order.tables?.table_number || '-'} (M)` : `Table ${order.tables?.table_number || '-'}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatOrderId(order.id)}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer_name || 'Guest'}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.users?.name || 'Unknown'}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'paid' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                            order.status === 'ready' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                            order.status === 'preparing' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                            order.status === 'pending' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Array.isArray(order.order_items) ? order.order_items.length : 0} items
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              playClickSound()
                              handleGenerateBill(order)
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-300 ${
                              order.is_printed
                                ? 'bg-white border-2 border-[#9A572D] text-[#9A572D] hover:bg-[#F5F0E8]'
                                : 'bg-[#6B3E26] text-white hover:bg-[#9A572D]'
                            }`}
                          >
                            {order.is_printed ? 'Printed' : 'Print Bill'}
                          </button>
                        </td>
                      </tr>
                      {/* Mobile expanded details */}
                      {expandedOrderId === order.id && (
                        <tr className="md:hidden bg-amber-50">
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
                                  order.status === 'paid' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                  order.status === 'ready' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                  order.status === 'preparing' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                  order.status === 'pending' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Items:</span>
                                <span className="font-semibold text-gray-900">{Array.isArray(order.order_items) ? order.order_items.length : 0} items</span>
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
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Dishes</h3>
              <button
                onClick={() => { playClickSound(); handleAddDish() }}
                className="flex items-center bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Dish
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F5DC]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Offer</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dishes.map((dish) => (
                    <React.Fragment key={dish.id}>
                      <tr 
                        className="hover:bg-amber-50 transition-colors cursor-pointer md:cursor-default"
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
                          {dish.offer ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              {dish.offer}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              playClickSound()
                              handleToggleDishAvailability(dish)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                              dish.is_available ? 'bg-[#F5F5DC] text-[#9A572D] border-2 border-[#9A572D]' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {dish.is_available ? 'Available' : 'Unavailable'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              playClickSound()
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
                        <tr className="md:hidden bg-amber-50">
                          <td colSpan={3} className="px-6 py-4">
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
                                <span className="text-gray-600">Offer:</span>
                                {dish.offer ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                    {dish.offer}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Status:</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    playClickSound()
                                    handleToggleDishAvailability(dish)
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                                    dish.is_available ? 'bg-[#F5F5DC] text-[#9A572D] border-2 border-[#9A572D]' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {dish.is_available ? 'Available' : 'Unavailable'}
                                </button>
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

        {activeTab === 'offers' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Offers Management</h2>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Offers</h3>
                <button
                  onClick={() => { playClickSound(); handleAddOffer() }}
                  className="flex items-center bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Offer
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Discount</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Applicable Dishes</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Min Order</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Valid Until</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-amber-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{offer.title}</td>
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-600 max-w-xs">{offer.description || '-'}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{offer.discount_percent}% OFF</td>
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-600 max-w-xs">
                          {offer.applicable_dishes && offer.applicable_dishes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {offer.applicable_dishes.slice(0, 3).map((dishId) => {
                                const dish = dishes.find(d => d.id === dishId)
                                return dish ? (
                                  <span key={dishId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    {dish.name}
                                  </span>
                                ) : null
                              })}
                              {offer.applicable_dishes.length > 3 && (
                                <span className="text-xs text-gray-500">+{offer.applicable_dishes.length - 3} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">All dishes</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{offer.min_order_value || 0}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(offer.end_date).toLocaleDateString()}</td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => { playClickSound(); handleToggleOfferStatus(offer) }}
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                              offer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {offer.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { playClickSound(); handleEditOffer(offer) }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { playClickSound(); handleDeleteOffer(offer.id) }}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Offer Modal */}
            {showOfferModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingOffer ? 'Edit Offer' : 'Add New Offer'}
                    </h3>
                    <button
                      onClick={() => { playClickSound(); setShowOfferModal(false); setEditingOffer(null); setOfferForm({
                        title: '',
                        description: '',
                        discount_percent: '',
                        min_order_value: '',
                        max_discount: '',
                        start_date: '',
                        end_date: '',
                        is_active: true,
                        is_promotional: false,
                        applicable_dishes: []
                      }) }}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <form onSubmit={handleOfferSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Offer Title *</label>
                      <input
                        type="text"
                        required
                        value={offerForm.title}
                        onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                        placeholder="e.g., Weekend Special"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={offerForm.description}
                        onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                        rows={3}
                        placeholder="Offer description..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Discount Percentage *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          value={offerForm.discount_percent}
                          onChange={(e) => setOfferForm({ ...offerForm, discount_percent: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                          placeholder="e.g., 20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Min Order Value</label>
                        <input
                          type="number"
                          min="0"
                          value={offerForm.min_order_value}
                          onChange={(e) => setOfferForm({ ...offerForm, min_order_value: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                          placeholder="e.g., 500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Max Discount</label>
                      <input
                        type="number"
                        min="0"
                        value={offerForm.max_discount}
                        onChange={(e) => setOfferForm({ ...offerForm, max_discount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Start Date *</label>
                        <input
                          type="date"
                          required
                          value={offerForm.start_date}
                          onChange={(e) => setOfferForm({ ...offerForm, start_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">End Date *</label>
                        <input
                          type="date"
                          required
                          value={offerForm.end_date}
                          onChange={(e) => setOfferForm({ ...offerForm, end_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Applicable Dishes</label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {dishes.length === 0 ? (
                          <p className="text-gray-500 text-sm">No dishes available</p>
                        ) : (
                          dishes.map((dish) => (
                            <label key={dish.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 px-2 rounded">
                              <input
                                type="checkbox"
                                checked={offerForm.applicable_dishes.includes(dish.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setOfferForm({
                                      ...offerForm,
                                      applicable_dishes: [...offerForm.applicable_dishes, dish.id]
                                    })
                                  } else {
                                    setOfferForm({
                                      ...offerForm,
                                      applicable_dishes: offerForm.applicable_dishes.filter(id => id !== dish.id)
                                    })
                                  }
                                }}
                                className="w-4 h-4 text-[#FFD700] rounded focus:ring-[#FFD700]"
                              />
                              <span className="text-sm text-gray-700">{dish.name}</span>
                              <span className="text-xs text-gray-500 ml-auto">₹{dish.price}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {offerForm.applicable_dishes.length > 0
                          ? `${offerForm.applicable_dishes.length} dish(es) selected`
                          : 'Leave empty to apply to all dishes'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={offerForm.is_active}
                          onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                          className="w-4 h-4 text-[#FFD700] rounded focus:ring-[#FFD700]"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={offerForm.is_promotional}
                          onChange={(e) => setOfferForm({ ...offerForm, is_promotional: e.target.checked })}
                          className="w-4 h-4 text-[#FFD700] rounded focus:ring-[#FFD700]"
                        />
                        <span className="text-sm font-medium text-gray-700">Promotional</span>
                      </label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => { playClickSound(); setShowOfferModal(false); setEditingOffer(null); setOfferForm({
                          title: '',
                          description: '',
                          discount_percent: '',
                          min_order_value: '',
                          max_discount: '',
                          start_date: '',
                          end_date: '',
                          is_active: true,
                          is_promotional: false,
                          applicable_dishes: []
                        }) }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-lg font-semibold hover:bg-[#8B4513] transition-colors"
                      >
                        {editingOffer ? 'Update Offer' : 'Create Offer'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'tables' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Table Management</h2>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Tables</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => { playClickSound(); setShowMasterTableModal(true) }}
                    className="flex items-center bg-[#9A572D] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Create Master Table
                  </button>
                  <button
                    onClick={handleAddTable}
                    className="flex items-center bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Table
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Table Number</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Capacity</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Master Table</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Pre-booking</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tables.map((table) => (
                      <React.Fragment key={table.id}>
                        <tr 
                          className="hover:bg-amber-50 transition-colors cursor-pointer md:cursor-default"
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setExpandedTableId(expandedTableId === table.id ? null : table.id)
                            }
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Table {table.table_number}{table.is_master ? ' (M)' : ''}</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">{table.capacity} seats</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              table.is_occupied ? 'bg-red-100 text-red-800' : 'bg-[#F5F5DC] text-[#9A572D]'
                            }`}>
                              {table.is_occupied ? 'Occupied' : 'Available'}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              table.is_master ? 'bg-purple-100 text-purple-800' : table.master_table_id ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {table.is_master ? '✓ Master' : table.master_table_id ? 'Child Table' : 'Standard'}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            {table.is_prebooked ? (
                              <div className="flex flex-col">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 flex items-center gap-1">
                                  <CalendarCheck className="w-3 h-3" />
                                  Pre-booked
                                </span>
                                <span className="text-xs text-gray-600 mt-1">
                                  {table.prebooked_time && new Date(table.prebooked_time).toLocaleTimeString()}
                                </span>
                                {table.prebooked_by && (
                                  <span className="text-xs text-gray-500">
                                    by {table.prebooked_by}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                                Available
                              </span>
                            )}
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
                                table.is_prebooked ? handleCancelPrebook(table.id) : handlePrebookTable(table)
                              }}
                              className={`transition-colors ${
                                table.is_prebooked ? 'text-orange-600 hover:text-orange-800' : 'text-purple-600 hover:text-purple-800'
                              }`}
                              title={table.is_prebooked ? 'Cancel Pre-booking' : 'Pre-book Table'}
                            >
                              {table.is_prebooked ? 'Cancel' : 'Pre-book'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTable(table)
                              }}
                              className="text-[#6B3E26] hover:text-[#9A572D] transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            {(table.is_occupied || table.is_master) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReleaseTable(table.id)
                                }}
                                className="text-[#6B3E26] hover:text-[#9A572D] transition-colors font-semibold"
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
                          <tr className="md:hidden bg-amber-50">
                            <td colSpan={2} className="px-6 py-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Table:</span>
                                  <span className="font-semibold text-gray-900">Table {table.table_number}{table.is_master ? ' (M)' : ''}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Capacity:</span>
                                  <span className="font-semibold text-gray-900">{table.capacity} seats</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Status:</span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    table.is_occupied ? 'bg-red-100 text-red-800' : 'bg-[#F5F5DC] text-[#9A572D]'
                                  }`}>
                                    {table.is_occupied ? 'Occupied' : 'Available'}
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
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewTableOrders(table.id)
                                    }}
                                    className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                                  >
                                    View Orders
                                  </button>
                                  {(table.is_occupied || table.is_master) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleReleaseTable(table.id)
                                      }}
                                      className="flex-1 py-2 px-3 bg-[#9A572D] text-white rounded-lg text-sm font-semibold"
                                    >
                                      Release
                                    </button>
                                  )}
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

        {activeTab === 'waiters' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Waiter Status</h2>
            <WaiterStatus />
          </>
        )}

        {activeTab === 'reports' && (
          <Reports orders={orders} payments={payments} dishes={dishes} tables={tables} />
        )}

        {activeTab === 'offline-billing' && (
          <>
            <div className="mb-6 animate-fade-in bg-gradient-to-br from-[#F5F5DC] to-[#E8E4C9] p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-[#6B3E26]">
                  Offline Orders
                </h1>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${isOnline ? 'bg-[#F5F5DC] text-[#9A572D]' : 'bg-red-100 text-red-800'}`}>
                    {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  {!isOnline && offlineOrders.length > 0 && (
                    <button
                      onClick={syncOfflineOrders}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all"
                    >
                      Sync Orders ({offlineOrders.length})
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Create and manage orders offline. Orders will automatically sync to the database when internet is available.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu Section */}
              <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Menu Items</h2>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none"
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                  />
                </div>
                
                {dishes.length === 0 ? (
                  <div className="text-center py-12">
                    <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {isOnline ? 'Loading menu items...' : 'No menu items available offline. Please go online to load menu items.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {dishes
                      .filter(d => d.is_available)
                      .filter(d => d.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) || d.category.toLowerCase().includes(menuSearchTerm.toLowerCase()))
                      .map((dish) => (
                      <div
                        key={dish.id}
                        className={`flex items-center gap-4 border-2 rounded-xl p-3 transition-all duration-300 ${
                          addedDishIds.has(dish.id)
                            ? 'bg-white border-[#9A572D] shadow-md'
                            : 'bg-[#F5F5DC] border-[#9A572D] hover:shadow-lg hover:scale-[1.02] cursor-pointer'
                        }`}
                      >
                        {/* Show image only when online */}
                        {isOnline && dish.image_url && (
                          <div className="w-16 h-16 bg-white rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        {!isOnline && (
                          <div className="w-16 h-16 bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
                            <Utensils className="w-8 h-8 text-green-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{dish.name}</h3>
                          <p className="text-xs text-gray-600 mb-1 truncate">{dish.category}</p>
                          <p className="text-lg font-bold text-[#6B3E26]">₹{dish.price.toFixed(2)}</p>
                        </div>
                        {!addedDishIds.has(dish.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(dish)
                            }}
                            className="bg-[#9A572D] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#5D3A13] transition-colors"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const item = offlineCart.find(i => i.dish_id === dish.id)
                                if (item && item.quantity > 1) {
                                  updateCartQuantity(item.id, item.quantity - 1)
                                } else {
                                  removeFromCart(item?.id || dish.id)
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-white border-2 border-[#9A572D] text-[#9A572D] hover:bg-[#F5F5DC] transition-colors text-sm font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold text-sm">
                              {offlineCart.find(i => i.dish_id === dish.id)?.quantity || 0}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(dish)
                              }}
                              className="w-8 h-8 rounded-full bg-[#9A572D] text-white hover:bg-[#5D3A13] transition-colors text-sm font-bold"
                            >
                              +
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const item = offlineCart.find(i => i.dish_id === dish.id)
                                if (item) {
                                  removeFromCart(item.id)
                                }
                              }}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Section */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 animate-fade-in h-fit">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Cart ({offlineCart.length} items)</h2>
                
                {/* Table Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Table</label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none"
                    disabled={tables.length === 0}
                  >
                    <option value="">
                      {tables.length === 0 ? 'No tables available' : 'Choose a table...'}
                    </option>
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        Table {table.table_number} (Capacity: {table.capacity})
                      </option>
                    ))}
                  </select>
                  {tables.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {isOnline ? 'Loading tables...' : 'No tables available offline. Please go online to load tables.'}
                    </p>
                  )}
                </div>

                {/* Customer Name */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none"
                  />
                </div>

                {/* Customer Mobile */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number (Optional)</label>
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="Enter mobile number"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none"
                  />
                </div>

                {/* Cart Items */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Cart Items</h3>
                  {offlineCart.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No items in cart</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {offlineCart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                            <p className="text-sm text-[#6B3E26]">₹{item.price.toFixed(2)} x {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full bg-white border-2 border-[#9A572D] text-[#9A572D] hover:bg-[#F5F5DC] transition-colors text-sm font-bold"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-white border-2 border-[#9A572D] text-[#9A572D] hover:bg-[#F5F5DC] transition-colors text-sm font-bold"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="mb-4 p-3 bg-[#F5F5DC] rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total:</span>
                    <span className="text-xl font-bold text-[#9A572D]">₹{getCartTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Create Order Button */}
                <button
                  onClick={createOfflineOrder}
                  disabled={offlineCart.length === 0 || !selectedTable}
                  className="w-full bg-[#9A572D] text-white py-3 rounded-xl font-semibold hover:bg-[#5D3A13] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Order
                </button>
              </div>
            </div>

            {/* Offline Orders List */}
            <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Offline Orders ({offlineOrders.length})</h2>
              {offlineOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No offline orders pending</p>
              ) : (
                <div className="space-y-4">
                  {offlineOrders.map((order, index) => (
                    <div key={`${order.id}-${index}`} className={`border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all ${orderAnimation === order.id ? 'animate-pulse bg-green-100' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">Order OFF-{order.id}</p>
                          <p className="text-sm text-gray-600">
                            Table: {tables.find(t => t.id === order.table_id)?.table_number || 'N/A'} • 
                            Customer: {order.customer_name || 'Guest'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#6B3E26]">₹{order.total_amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{order.order_items?.length} items</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => printOfflineBill(order)}
                          className="flex-1 bg-[#6B3E26] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#9A572D] transition-all"
                        >
                          Print Bill
                        </button>
                        <button
                          onClick={() => deleteOfflineOrder(order.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'online-orders' && (
          <div className="relative h-[calc(100vh-200px)] overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
            {/* Animated background gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '4s', animationDuration: '10s' }}></div>
            </div>

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDMwIEwgNjAgMzAgTSAzMCAwIEwgMzAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg5OSwgMTAyLCAyNDEsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-60"></div>

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-purple-400/40 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 8}s`,
                    animationDuration: `${10 + Math.random() * 8}s`
                  }}
                ></div>
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 py-6">
              {/* Premium badge */}
              <div className="mb-6 animate-fade-in-down" style={{ animationDelay: '0s' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 rounded-full">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <span className="text-purple-700 text-xs font-semibold tracking-wide uppercase">Coming Soon</span>
                </div>
              </div>

              {/* Main animated icon with glow */}
              <div className="relative mb-6 animate-scale-in" style={{ animationDelay: '0.5s' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-3xl blur-2xl opacity-60 animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl border border-white/20">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                {/* Decorative rings */}
                <div className="absolute -inset-3 border border-purple-300/30 rounded-3xl animate-spin-slow"></div>
                <div className="absolute -inset-6 border border-indigo-300/20 rounded-3xl animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
              </div>

              {/* Animated title with letter-by-letter effect */}
              <div className="text-center mb-4">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-800 mb-3 tracking-tight" style={{ textShadow: '0 2px 20px rgba(168, 85, 247, 0.15)' }}>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '1s' }}>C</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '1.2s' }}>O</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '1.4s' }}>M</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '1.6s' }}>I</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '1.8s' }}>N</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '2s' }}>G</span>
                  <span className="inline-block animate-letter-drop bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent" style={{ animationDelay: '2.2s' }}> &nbsp;</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '2.4s' }}>S</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '2.6s' }}>O</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '2.8s' }}>O</span>
                  <span className="inline-block animate-letter-drop" style={{ animationDelay: '3s' }}>N</span>
                </h2>
                <div className="flex items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '3.2s' }}>
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-400"></div>
                  <p className="text-base md:text-lg font-semibold text-purple-700 tracking-wide">
                    Online orders
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-400"></div>
                </div>
              </div>

              {/* Feature cards with premium design */}
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="group bg-white/80 backdrop-blur-xl border border-purple-200 rounded-2xl p-4 transform hover:scale-[1.02] hover:border-purple-400 transition-all duration-500 shadow-lg hover:shadow-xl animate-slide-in-left" style={{ animationDelay: '3.6s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-800 mb-0.5">Digital Payment Integration</p>
                      <p className="text-gray-600 text-xs">UPI, Card, and Wallet support</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="group bg-white/80 backdrop-blur-xl border border-purple-200 rounded-2xl p-4 transform hover:scale-[1.02] hover:border-purple-400 transition-all duration-500 shadow-lg hover:shadow-xl animate-slide-in-right" style={{ animationDelay: '4s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-800 mb-0.5">Instant Invoice Generation</p>
                      <p className="text-gray-600 text-xs">Generate and send invoices instantly</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="group bg-white/80 backdrop-blur-xl border border-purple-200 rounded-2xl p-4 transform hover:scale-[1.02] hover:border-purple-400 transition-all duration-500 shadow-lg hover:shadow-xl animate-slide-in-left" style={{ animationDelay: '4.4s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-800 mb-0.5">Customer Portal</p>
                      <p className="text-gray-600 text-xs">Self-service billing for customers</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom message with animated indicator */}
              <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: '4.8s' }}>
                <p className="text-gray-600 text-xs font-medium mb-3">
                  We're crafting something extraordinary for you
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.5s' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.5s' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.5s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Reservations</h1>
                <p className="text-gray-600 mt-2">Manage table reservations and bookings</p>
              </div>
              <button
                onClick={handleAddReservation}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Reservation
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#6B3E26]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Total Reservations</p>
                    <p className="text-2xl font-bold text-[#6B3E26]">{reservations.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-[#6B3E26]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#D4A574]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Today's Reservations</p>
                    <p className="text-2xl font-bold text-[#D4A574]">{reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-[#D4A574]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#E8B478]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Confirmed</p>
                    <p className="text-2xl font-bold text-[#E8B478]">{reservations.filter(r => r.status === 'confirmed').length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-[#E8B478]" />
                </div>
              </div>
            </div>

            {/* Reservations List */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-xl font-bold text-gray-900">All Reservations</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Table</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Guests</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reservations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <Calendar className="w-12 h-12 mx-auto mb-4 text-[#6B3E26]" />
                          <p className="text-lg font-semibold mb-2">No reservations yet</p>
                          <p className="text-sm">Click "New Reservation" to create your first reservation</p>
                        </td>
                      </tr>
                    ) : (
                      reservations.map((reservation) => (
                        <tr key={reservation.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{reservation.customer_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{reservation.customer_mobile}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">Table {tables.find(t => t.id === reservation.table_id)?.table_number || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{new Date(reservation.date).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{reservation.time}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{reservation.guests}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              reservation.status === 'confirmed' ? 'bg-[#D4A574] text-white' :
                              reservation.status === 'pending' ? 'bg-[#E8B478] text-white' :
                              'bg-[#C97B7B] text-white'
                            }`}>
                              {reservation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditReservation(reservation)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReservation(reservation.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reservation Modal */}
            {showReservationModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingReservation ? 'Edit Reservation' : 'New Reservation'}
                    </h3>
                    <button
                      onClick={() => { playClickSound(); setShowReservationModal(false) }}
                      className="p-2 rounded-xl bg-white hover:bg-gray-100 transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                      <input
                        type="text"
                        value={reservationForm.customer_name}
                        onChange={(e) => setReservationForm({ ...reservationForm, customer_name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                      <input
                        type="tel"
                        value={reservationForm.customer_mobile}
                        onChange={(e) => setReservationForm({ ...reservationForm, customer_mobile: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter mobile number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Table</label>
                      <select
                        value={reservationForm.table_id}
                        onChange={(e) => setReservationForm({ ...reservationForm, table_id: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      >
                        <option value="">Select a table</option>
                        {tables.map((table) => (
                          <option key={table.id} value={table.id}>
                            Table {table.table_number} ({table.capacity} seats)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={reservationForm.date}
                        onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
                      <input
                        type="time"
                        value={reservationForm.time}
                        onChange={(e) => setReservationForm({ ...reservationForm, time: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Guests</label>
                      <input
                        type="number"
                        value={reservationForm.guests}
                        onChange={(e) => setReservationForm({ ...reservationForm, guests: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter number of guests"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Special Requests (Optional)</label>
                      <textarea
                        value={reservationForm.special_requests}
                        onChange={(e) => setReservationForm({ ...reservationForm, special_requests: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        rows={3}
                        placeholder="Any special requests..."
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowReservationModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveReservation}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingReservation ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Rooms</h1>
                <p className="text-gray-600 mt-2">Manage hotel rooms and their status</p>
              </div>
              <button
                onClick={handleAddRoom}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add Room
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#6B3E26]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Total Rooms</p>
                    <p className="text-2xl font-bold text-[#6B3E26]">{rooms.length}</p>
                  </div>
                  <LayoutDashboard className="w-8 h-8 text-[#6B3E26]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#D4A574]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Available</p>
                    <p className="text-2xl font-bold text-[#D4A574]">{rooms.filter(r => r.status === 'available').length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-[#D4A574]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#C97B7B]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Occupied</p>
                    <p className="text-2xl font-bold text-[#C97B7B]">{rooms.filter(r => r.status === 'occupied').length}</p>
                  </div>
                  <Users className="w-8 h-8 text-[#C97B7B]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#E8B478]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Maintenance</p>
                    <p className="text-2xl font-bold text-[#E8B478]">{rooms.filter(r => r.status === 'maintenance').length}</p>
                  </div>
                  <HelpCircle className="w-8 h-8 text-[#E8B478]" />
                </div>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-xl font-bold text-gray-900">All Rooms</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rooms.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-[#6B3E26]" />
                      <p className="text-lg font-semibold text-gray-700 mb-2">No rooms yet</p>
                      <p className="text-sm text-gray-500">Click "Add Room" to create your first room</p>
                    </div>
                  ) : (
                    rooms.map((room) => (
                      <div
                        key={room.id}
                        className={`rounded-xl p-4 border-2 transition-all duration-300 hover:shadow-lg
                          ${room.status === 'available' ? 'bg-[#F5F5DC] border-[#D4A574]' :
                            room.status === 'occupied' ? 'bg-[#F5F5DC] border-[#C97B7B]' :
                            'bg-[#F5F5DC] border-[#E8B478]'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">Room {room.room_number}</h4>
                            <p className="text-sm text-gray-700">{room.room_type}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            room.status === 'available' ? 'bg-[#D4A574] text-white' :
                            room.status === 'occupied' ? 'bg-[#C97B7B] text-white' :
                            'bg-[#E8B478] text-white'
                          }`}>
                            {room.status}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-700 mb-3">
                          <p>Floor: {room.floor}</p>
                          <p>Capacity: {room.capacity} guests</p>
                          <p>₹{room.price_per_night}/night</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditRoom(room)}
                            className="flex-1 px-3 py-1.5 bg-[#6B3E26] text-white rounded-lg text-sm font-semibold hover:bg-[#9A572D] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="px-3 py-1.5 bg-[#C97B7B] text-white rounded-lg text-sm font-semibold hover:bg-[#A0522D] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Room Modal */}
            {showRoomModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingRoom ? 'Edit Room' : 'Add Room'}
                    </h3>
                    <button
                      onClick={() => { playClickSound(); setShowRoomModal(false) }}
                      className="p-2 rounded-xl bg-white hover:bg-gray-100 transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Room Number</label>
                      <input
                        type="text"
                        value={roomForm.room_number}
                        onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="e.g., 101"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Room Type</label>
                      <select
                        value={roomForm.room_type}
                        onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      >
                        <option value="">Select type</option>
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Suite">Suite</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Penthouse">Penthouse</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Floor</label>
                      <input
                        type="number"
                        value={roomForm.floor}
                        onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="e.g., 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (Guests)</label>
                      <input
                        type="number"
                        value={roomForm.capacity}
                        onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="e.g., 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Price per Night (₹)</label>
                      <input
                        type="number"
                        value={roomForm.price_per_night}
                        onChange={(e) => setRoomForm({ ...roomForm, price_per_night: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="e.g., 2500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={roomForm.status}
                        onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Amenities (Optional)</label>
                      <textarea
                        value={roomForm.amenities}
                        onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        rows={3}
                        placeholder="e.g., AC, WiFi, TV, Mini Bar"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowRoomModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveRoom}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingRoom ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Bookings</h1>
                <p className="text-gray-600 mt-2">Manage room bookings and check-ins</p>
              </div>
              <button
                onClick={handleAddBooking}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Booking
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#6B3E26]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Total Bookings</p>
                    <p className="text-2xl font-bold text-[#6B3E26]">{bookings.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-[#6B3E26]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#D4A574]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Active</p>
                    <p className="text-2xl font-bold text-[#D4A574]">{bookings.filter(b => b.status === 'active').length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-[#D4A574]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#C97B7B]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Checked Out</p>
                    <p className="text-2xl font-bold text-[#C97B7B]">{bookings.filter(b => b.status === 'checked_out').length}</p>
                  </div>
                  <LogOut className="w-8 h-8 text-[#C97B7B]" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#E8B478]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Revenue</p>
                    <p className="text-2xl font-bold text-[#E8B478]">₹{bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0).toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-[#E8B478]" />
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-xl font-bold text-gray-900">All Bookings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Room</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Guests</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <Calendar className="w-12 h-12 mx-auto mb-4 text-[#6B3E26]" />
                          <p className="text-lg font-semibold mb-2">No bookings yet</p>
                          <p className="text-sm">Click "New Booking" to create your first booking</p>
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{booking.customer_name}</div>
                            <div className="text-xs text-gray-600">{booking.customer_mobile}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">Room {rooms.find(r => r.id === booking.room_id)?.room_number || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{new Date(booking.check_in).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{new Date(booking.check_out).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{booking.guests}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-[#6B3E26]">₹{booking.total_amount?.toLocaleString() || '0'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              booking.status === 'active' ? 'bg-[#D4A574] text-white' :
                              booking.status === 'checked_out' ? 'bg-[#C97B7B] text-white' :
                              'bg-[#E8B478] text-white'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditBooking(booking)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Booking Modal */}
            {showBookingModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingBooking ? 'Edit Booking' : 'New Booking'}
                    </h3>
                    <button
                      onClick={() => { playClickSound(); setShowBookingModal(false) }}
                      className="p-2 rounded-xl bg-white hover:bg-gray-100 transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                      <input
                        type="text"
                        value={bookingForm.customer_name}
                        onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                      <input
                        type="tel"
                        value={bookingForm.customer_mobile}
                        onChange={(e) => setBookingForm({ ...bookingForm, customer_mobile: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter mobile number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Room</label>
                      <select
                        value={bookingForm.room_id}
                        onChange={(e) => setBookingForm({ ...bookingForm, room_id: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      >
                        <option value="">Select a room</option>
                        {rooms.filter(r => r.status === 'available').map((room) => (
                          <option key={room.id} value={room.id}>
                            Room {room.room_number} ({room.room_type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Check In</label>
                        <input
                          type="date"
                          value={bookingForm.check_in}
                          onChange={(e) => setBookingForm({ ...bookingForm, check_in: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Check Out</label>
                        <input
                          type="date"
                          value={bookingForm.check_out}
                          onChange={(e) => setBookingForm({ ...bookingForm, check_out: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Guests</label>
                        <input
                          type="number"
                          value={bookingForm.guests}
                          onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                          placeholder="Number of guests"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total Amount (₹)</label>
                        <input
                          type="number"
                          value={bookingForm.total_amount}
                          onChange={(e) => setBookingForm({ ...bookingForm, total_amount: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                          placeholder="Total amount"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={bookingForm.status}
                        onChange={(e) => setBookingForm({ ...bookingForm, status: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="active">Active</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowBookingModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBooking}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingBooking ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Kitchen Display</h1>
              <p className="text-gray-600 mt-2">View and manage kitchen orders in real-time</p>
            </div>

            {/* Kitchen Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Pending Orders */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-[#E8B478]">
                  <h3 className="text-lg font-bold text-white">Pending Orders ({orders.filter(o => o.status === 'pending').length})</h3>
                </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {orders.filter(o => o.status === 'pending').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg font-semibold">No pending orders</p>
                    </div>
                  ) : (
                    orders.filter(o => o.status === 'pending').map((order) => (
                      <div key={order.id} className="border-2 border-[#E8B478] rounded-xl p-4 bg-[#F5F5DC]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">Table {order.tables?.table_number || 'N/A'}</h4>
                            <p className="text-sm text-gray-600">{formatOrderId(order.id)}</p>
                          </div>
                          <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="font-semibold">{item.dishes?.name} x{item.quantity}</span>
                              {getFoodTypeIcon(item.dishes?.food_type)}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              playClickSound()
                              fetch(`/api/orders/${order.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'preparing' })
                              }).then(() => fetchData())
                            }}
                            className="flex-1 px-3 py-2 bg-[#6B3E26] text-white rounded-lg text-sm font-semibold hover:bg-[#9A572D] transition-colors"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Preparing Orders */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-[#9A572D]">
                  <h3 className="text-lg font-bold text-white">Preparing ({orders.filter(o => o.status === 'preparing').length})</h3>
                </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {orders.filter(o => o.status === 'preparing').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg font-semibold">No orders being prepared</p>
                    </div>
                  ) : (
                    orders.filter(o => o.status === 'preparing').map((order) => (
                      <div key={order.id} className="border-2 border-[#9A572D] rounded-xl p-4 bg-[#F5F5DC]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">Table {order.tables?.table_number || 'N/A'}</h4>
                            <p className="text-sm text-gray-600">{formatOrderId(order.id)}</p>
                          </div>
                          <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="font-semibold">{item.dishes?.name} x{item.quantity}</span>
                              {getFoodTypeIcon(item.dishes?.food_type)}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              playClickSound()
                              fetch(`/api/orders/${order.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'ready' })
                              }).then(() => fetchData())
                            }}
                            className="flex-1 px-3 py-2 bg-[#D4A574] text-white rounded-lg text-sm font-semibold hover:bg-[#9A572D] transition-colors"
                          >
                            Mark Ready
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Ready Orders */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-[#D4A574]">
                <h3 className="text-lg font-bold text-white">Ready for Serving ({orders.filter(o => o.status === 'ready').length})</h3>
              </div>
              <div className="p-4">
                {orders.filter(o => o.status === 'ready').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg font-semibold">No orders ready</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.filter(o => o.status === 'ready').map((order) => (
                      <div key={order.id} className="border-2 border-[#D4A574] rounded-xl p-4 bg-[#F5F5DC]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">Table {order.tables?.table_number || 'N/A'}</h4>
                            <p className="text-sm text-gray-600">{formatOrderId(order.id)}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="font-semibold">{item.dishes?.name} x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Customers</h1>
                <p className="text-gray-600 mt-2">Manage customer profiles and preferences</p>
              </div>
              <button
                onClick={handleAddCustomer}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-xl font-bold text-gray-900">All Customers ({customers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 text-[#6B3E26]" />
                          <p className="text-lg font-semibold mb-2">No customers yet</p>
                          <p className="text-sm">Click "Add Customer" to create your first customer</p>
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{customer.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{customer.mobile}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{customer.email || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{customer.address || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditCustomer(customer)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Modal */}
            {showCustomerModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                    </h3>
                    <button
                      onClick={() => { playClickSound(); setShowCustomerModal(false) }}
                      className="p-2 rounded-xl bg-white hover:bg-gray-100 transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile</label>
                      <input
                        type="tel"
                        value={customerForm.mobile}
                        onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter mobile number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Optional)</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address (Optional)</label>
                      <textarea
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        rows={2}
                        placeholder="Enter address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Preferences (Optional)</label>
                      <textarea
                        value={customerForm.preferences}
                        onChange={(e) => setCustomerForm({ ...customerForm, preferences: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        rows={2}
                        placeholder="Any preferences..."
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowCustomerModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCustomer}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingCustomer ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Inventory</h1>
                <p className="text-gray-600 mt-2">Ingredients, recipe costing, purchase orders, and waste tracking</p>
              </div>
              <button
                onClick={handleAddInventory}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-xl font-bold text-gray-900">All Items ({inventory.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[#6B3E26]" />
                          <p className="text-lg font-semibold mb-2">No inventory items yet</p>
                          <p className="text-sm">Click "Add Item" to create your first inventory item</p>
                        </td>
                      </tr>
                    ) : (
                      inventory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{item.item_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{item.category}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{item.quantity} {item.unit}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">₹{item.unit_price}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              item.quantity <= item.minimum_stock ? 'bg-[#C97B7B] text-white' : 'bg-[#D4A574] text-white'
                            }`}>
                              {item.quantity <= item.minimum_stock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditInventory(item)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteInventory(item.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Modal */}
            {showInventoryModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingInventory ? 'Edit Item' : 'Add Item'}
                    </h3>
                    <button
                      onClick={() => { playClickSound(); setShowInventoryModal(false) }}
                      className="p-2 rounded-xl bg-white hover:bg-gray-100 transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                      <input
                        type="text"
                        value={inventoryForm.item_name}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, item_name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter item name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <input
                        type="text"
                        value={inventoryForm.category}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="e.g., Vegetables, Spices"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                        <input
                          type="number"
                          value={inventoryForm.quantity}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                          placeholder="Quantity"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                        <input
                          type="text"
                          value={inventoryForm.unit}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                          placeholder="e.g., kg, L, pcs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={inventoryForm.unit_price}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, unit_price: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                          placeholder="Price per unit"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Min Stock</label>
                        <input
                          type="number"
                          value={inventoryForm.minimum_stock}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, minimum_stock: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                          placeholder="Minimum stock level"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier (Optional)</label>
                      <input
                        type="text"
                        value={inventoryForm.supplier}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, supplier: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Supplier name"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowInventoryModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveInventory}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingInventory ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Delivery</h1>
                <p className="text-gray-600 mt-2">Assign drivers, track deliveries, and manage zones</p>
              </div>
              <button
                onClick={handleAddDelivery}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Delivery
              </button>
            </div>

            {/* Delivery Tabs */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setDeliverySubTab('active')}
                  className={`px-4 py-2 font-semibold transition-colors ${deliverySubTab === 'active' ? 'text-[#6B3E26] border-b-2 border-[#6B3E26]' : 'text-gray-600 hover:text-[#6B3E26]'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setDeliverySubTab('history')}
                  className={`px-4 py-2 font-semibold transition-colors ${deliverySubTab === 'history' ? 'text-[#6B3E26] border-b-2 border-[#6B3E26]' : 'text-gray-600 hover:text-[#6B3E26]'}`}
                >
                  History
                </button>
                <button
                  onClick={() => setDeliverySubTab('zones')}
                  className={`px-4 py-2 font-semibold transition-colors ${deliverySubTab === 'zones' ? 'text-[#6B3E26] border-b-2 border-[#6B3E26]' : 'text-gray-600 hover:text-[#6B3E26]'}`}
                >
                  Zones
                </button>
              </div>
            </div>

            {/* Delivery Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-lg font-bold text-[#6B3E26]">
                  {deliverySubTab === 'active' ? 'Active Deliveries' : deliverySubTab === 'history' ? 'Delivery History' : 'Delivery Zones'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Fee</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deliveries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          No deliveries found
                        </td>
                      </tr>
                    ) : (
                      deliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{delivery.order_id || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{delivery.customer_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{delivery.mobile}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 max-w-xs truncate">{delivery.address}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{delivery.driver_id || 'Unassigned'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              delivery.status === 'delivered' ? 'bg-[#D4A574] text-white' :
                              delivery.status === 'in_transit' ? 'bg-[#9B8BB5] text-white' :
                              delivery.status === 'assigned' ? 'bg-[#E8B478] text-white' :
                              delivery.status === 'cancelled' ? 'bg-[#C97B7B] text-white' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {delivery.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">₹{delivery.delivery_fee || '0'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditDelivery(delivery)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDelivery(delivery.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery Modal */}
            {showDeliveryModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                    <h3 className="text-xl font-bold text-[#6B3E26]">
                      {editingDelivery ? 'Edit Delivery' : 'New Delivery'}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name *</label>
                        <input
                          type="text"
                          value={deliveryForm.customer_name}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, customer_name: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile *</label>
                        <input
                          type="tel"
                          value={deliveryForm.mobile}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, mobile: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
                      <textarea
                        value={deliveryForm.address}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, address: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Order ID</label>
                        <input
                          type="text"
                          value={deliveryForm.order_id}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, order_id: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Driver ID</label>
                        <input
                          type="text"
                          value={deliveryForm.driver_id}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, driver_id: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                        <select
                          value={deliveryForm.status}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, status: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        >
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="in_transit">In Transit</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Fee</label>
                        <input
                          type="number"
                          value={deliveryForm.delivery_fee}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_fee: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                      <textarea
                        value={deliveryForm.notes}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowDeliveryModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDelivery}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingDelivery ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Team</h1>
                <p className="text-gray-600 mt-2">Manage staff members and their roles</p>
              </div>
              <button
                onClick={handleAddTeam}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            </div>

            {/* Team Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-xl font-bold text-gray-900">Team Members ({team.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Salary</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {team.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 text-[#6B3E26]" />
                          <p className="text-lg font-semibold mb-2">No team members yet</p>
                          <p className="text-sm">Click "Add Member" to add your first team member</p>
                        </td>
                      </tr>
                    ) : (
                      team.map((member) => (
                        <tr key={member.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{member.role}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{member.mobile}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{member.department}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">₹{member.salary?.toLocaleString() || '0'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditTeam(member)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(member.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Team Modal */}
            {showTeamModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingTeam ? 'Edit Member' : 'Add Member'}
                    </h3>
                    <button
                      onClick={() => { playClickSound(); setShowTeamModal(false) }}
                      className="p-2 rounded-xl bg-white hover:bg-gray-100 transition-all duration-300"
                    >
                      <X className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                      <input
                        type="text"
                        value={teamForm.role}
                        onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="e.g., Waiter, Chef"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile</label>
                      <input
                        type="tel"
                        value={teamForm.mobile}
                        onChange={(e) => setTeamForm({ ...teamForm, mobile: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter mobile number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Optional)</label>
                      <input
                        type="email"
                        value={teamForm.email}
                        onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        value={teamForm.department}
                        onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="e.g., Kitchen, Front Desk"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Salary (₹)</label>
                      <input
                        type="number"
                        value={teamForm.salary}
                        onChange={(e) => setTeamForm({ ...teamForm, salary: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Enter salary"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowTeamModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTeam}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingTeam ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounting' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Accounting</h1>
                <p className="text-gray-600 mt-2">Financial reports, expenses, and tax management</p>
              </div>
              <button
                onClick={handleAddTransaction}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </div>

            {/* Balance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-[#D4A574]">
                      ₹{transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#D4A574] bg-opacity-20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-[#D4A574]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-[#C97B7B]">
                      ₹{transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#C97B7B] bg-opacity-20 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-[#C97B7B]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Net Balance</p>
                    <p className="text-2xl font-bold text-[#6B3E26]">
                      ₹{(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0) - 
                          transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#6B3E26] bg-opacity-20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[#6B3E26]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setAccountingFilter('all')}
                  className={`px-4 py-2 font-semibold transition-colors ${accountingFilter === 'all' ? 'text-[#6B3E26] border-b-2 border-[#6B3E26]' : 'text-gray-600 hover:text-[#6B3E26]'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setAccountingFilter('income')}
                  className={`px-4 py-2 font-semibold transition-colors ${accountingFilter === 'income' ? 'text-[#6B3E26] border-b-2 border-[#6B3E26]' : 'text-gray-600 hover:text-[#6B3E26]'}`}
                >
                  Income
                </button>
                <button
                  onClick={() => setAccountingFilter('expense')}
                  className={`px-4 py-2 font-semibold transition-colors ${accountingFilter === 'expense' ? 'text-[#6B3E26] border-b-2 border-[#6B3E26]' : 'text-gray-600 hover:text-[#6B3E26]'}`}
                >
                  Expenses
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-lg font-bold text-[#6B3E26]">Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.filter(t => accountingFilter === 'all' || t.type === accountingFilter).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => accountingFilter === 'all' || t.type === accountingFilter).map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{transaction.date?.split('T')[0] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              transaction.type === 'income' ? 'bg-[#D4A574] text-white' : 'bg-[#C97B7B] text-white'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{transaction.category}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 max-w-xs truncate">{transaction.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-semibold ${transaction.type === 'income' ? 'text-[#D4A574]' : 'text-[#C97B7B]'}`}>
                              {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount?.toLocaleString() || '0'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{transaction.reference || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditTransaction(transaction)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction Modal */}
            {showTransactionModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                    <h3 className="text-xl font-bold text-[#6B3E26]">
                      {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                        <input
                          type="date"
                          value={transactionForm.date}
                          onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
                        <select
                          value={transactionForm.type}
                          onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                        <input
                          type="text"
                          value={transactionForm.category}
                          onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                          placeholder="e.g., Sales, Rent, Supplies"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount *</label>
                        <input
                          type="number"
                          value={transactionForm.amount}
                          onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Reference</label>
                      <input
                        type="text"
                        value={transactionForm.reference}
                        onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        placeholder="Invoice number, receipt, etc."
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowTransactionModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTransaction}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingTransaction ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Marketing</h1>
                <p className="text-gray-600 mt-2">Promotions, campaigns, and loyalty programs</p>
              </div>
              <button
                onClick={handleAddCampaign}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </div>

            {/* Campaign Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Active Campaigns</p>
                    <p className="text-2xl font-bold text-[#D4A574]">
                      {campaigns.filter(c => c.status === 'active').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#D4A574] bg-opacity-20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[#D4A574]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-[#6B3E26]">
                      ₹{campaigns.reduce((sum, c) => sum + (c.budget || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#6B3E26] bg-opacity-20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-[#6B3E26]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-[#9B8BB5]">
                      {campaigns.filter(c => c.status === 'completed').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#9B8BB5] bg-opacity-20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#9B8BB5]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-lg font-bold text-[#6B3E26]">Campaigns</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Budget</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No campaigns found
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-[#F5F5DC] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{campaign.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              campaign.type === 'promotion' ? 'bg-[#D4A574] text-white' :
                              campaign.type === 'loyalty' ? 'bg-[#9B8BB5] text-white' :
                              'bg-[#E8B478] text-white'
                            }`}>
                              {campaign.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{campaign.start_date?.split('T')[0] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{campaign.end_date?.split('T')[0] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">₹{campaign.budget?.toLocaleString() || '0'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              campaign.status === 'active' ? 'bg-[#D4A574] text-white' :
                              campaign.status === 'paused' ? 'bg-[#E8B478] text-white' :
                              campaign.status === 'completed' ? 'bg-[#9B8BB5] text-white' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditCampaign(campaign)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign Modal */}
            {showCampaignModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                    <h3 className="text-xl font-bold text-[#6B3E26]">
                      {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Name *</label>
                      <input
                        type="text"
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
                        <select
                          value={campaignForm.type}
                          onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        >
                          <option value="promotion">Promotion</option>
                          <option value="loyalty">Loyalty</option>
                          <option value="referral">Referral</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                        <select
                          value={campaignForm.status}
                          onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={campaignForm.start_date}
                          onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={campaignForm.end_date}
                          onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Budget</label>
                      <input
                        type="number"
                        value={campaignForm.budget}
                        onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={campaignForm.description}
                        onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowCampaignModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCampaign}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingCampaign ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Operations</h1>
                <p className="text-gray-600 mt-2">Shift management, tasks, and performance monitoring</p>
              </div>
              <button
                onClick={handleAddShift}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Shift
              </button>
            </div>

            {/* Shift Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Scheduled</p>
                    <p className="text-2xl font-bold text-[#9B8BB5]">
                      {shifts.filter(s => s.status === 'scheduled').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#9B8BB5] bg-opacity-20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#9B8BB5]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-[#E8B478]">
                      {shifts.filter(s => s.status === 'in_progress').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#E8B478] bg-opacity-20 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-[#E8B478]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-[#D4A574]">
                      {shifts.filter(s => s.status === 'completed').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#D4A574] bg-opacity-20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#D4A574]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Shifts Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-lg font-bold text-[#6B3E26]">Shifts</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Start Time</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">End Time</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {shifts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No shifts found
                        </td>
                      </tr>
                    ) : (
                      shifts.map((shift) => {
                        const staffMember = team.find(t => t.id === shift.staff_id)
                        const duration = shift.start_time && shift.end_time 
                          ? `${Math.round((new Date(`2000-01-01 ${shift.end_time}`).getTime() - new Date(`2000-01-01 ${shift.start_time}`).getTime()) / 3600000)}h`
                          : 'N/A'
                        return (
                          <tr key={shift.id} className="hover:bg-[#F5F5DC] transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{shift.date?.split('T')[0] || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{staffMember?.name || shift.staff_id || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{shift.start_time || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{shift.end_time || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{duration}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                shift.status === 'completed' ? 'bg-[#D4A574] text-white' :
                                shift.status === 'in_progress' ? 'bg-[#E8B478] text-white' :
                                shift.status === 'scheduled' ? 'bg-[#9B8BB5] text-white' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {shift.status?.replace('_', ' ') || 'Scheduled'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditShift(shift)}
                                  className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteShift(shift.id)}
                                  className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shift Modal */}
            {showShiftModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                    <h3 className="text-xl font-bold text-[#6B3E26]">
                      {editingShift ? 'Edit Shift' : 'New Shift'}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                        <input
                          type="date"
                          value={shiftForm.date}
                          onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Member *</label>
                        <select
                          value={shiftForm.staff_id}
                          onChange={(e) => setShiftForm({ ...shiftForm, staff_id: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        >
                          <option value="">Select Staff</option>
                          {team.map((member) => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time *</label>
                        <input
                          type="time"
                          value={shiftForm.start_time}
                          onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                        <input
                          type="time"
                          value={shiftForm.end_time}
                          onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={shiftForm.status}
                        onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                      <textarea
                        value={shiftForm.notes}
                        onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowShiftModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveShift}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingShift ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Attendance</h1>
                <p className="text-gray-600 mt-2">Track staff attendance and working hours</p>
              </div>
              <button
                onClick={handleAddAttendance}
                className="flex items-center gap-2 bg-[#6B3E26] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Record
              </button>
            </div>

            {/* Attendance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-[#D4A574]">
                      {attendanceRecords.filter(a => a.status === 'present').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#D4A574] bg-opacity-20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#D4A574]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-[#C97B7B]">
                      {attendanceRecords.filter(a => a.status === 'absent').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#C97B7B] bg-opacity-20 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-[#C97B7B]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Late</p>
                    <p className="text-2xl font-bold text-[#E8B478]">
                      {attendanceRecords.filter(a => a.status === 'late').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#E8B478] bg-opacity-20 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-[#E8B478]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Half-day</p>
                    <p className="text-2xl font-bold text-[#9B8BB5]">
                      {attendanceRecords.filter(a => a.status === 'half_day').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#9B8BB5] bg-opacity-20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#9B8BB5]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                <h3 className="text-lg font-bold text-[#6B3E26]">Attendance Records</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F5DC]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Working Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#6B3E26] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No attendance records found
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((attendance) => {
                        const staffMember = team.find(t => t.id === attendance.staff_id)
                        const workingHours = attendance.check_in && attendance.check_out
                          ? `${Math.round((new Date(`2000-01-01 ${attendance.check_out}`).getTime() - new Date(`2000-01-01 ${attendance.check_in}`).getTime()) / 3600000)}h`
                          : 'N/A'
                        return (
                          <tr key={attendance.id} className="hover:bg-[#F5F5DC] transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{attendance.date?.split('T')[0] || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{staffMember?.name || attendance.staff_id || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{attendance.check_in || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{attendance.check_out || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{workingHours}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                attendance.status === 'present' ? 'bg-[#D4A574] text-white' :
                                attendance.status === 'absent' ? 'bg-[#C97B7B] text-white' :
                                attendance.status === 'late' ? 'bg-[#E8B478] text-white' :
                                attendance.status === 'half_day' ? 'bg-[#9B8BB5] text-white' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {attendance.status?.replace('_', '-') || 'Present'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAttendance(attendance)}
                                  className="p-2 rounded-lg bg-[#F5F5DC] text-[#6B3E26] hover:bg-[#DEB887] transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAttendance(attendance.id)}
                                  className="p-2 rounded-lg bg-[#F5F5DC] text-[#C97B7B] hover:bg-[#DEB887] transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance Modal */}
            {showAttendanceModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 bg-[#F5F5DC]">
                    <h3 className="text-xl font-bold text-[#6B3E26]">
                      {editingAttendance ? 'Edit Attendance' : 'New Attendance Record'}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                        <input
                          type="date"
                          value={attendanceForm.date}
                          onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Member *</label>
                        <select
                          value={attendanceForm.staff_id}
                          onChange={(e) => setAttendanceForm({ ...attendanceForm, staff_id: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        >
                          <option value="">Select Staff</option>
                          {team.map((member) => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Check In Time</label>
                        <input
                          type="time"
                          value={attendanceForm.check_in}
                          onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Check Out Time</label>
                        <input
                          type="time"
                          value={attendanceForm.check_out}
                          onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={attendanceForm.status}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="half_day">Half-day</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                      <textarea
                        value={attendanceForm.notes}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { playClickSound(); setShowAttendanceModal(false) }}
                        className="flex-1 px-4 py-2 border-2 border-[#6B3E26] text-[#6B3E26] rounded-xl font-semibold hover:bg-[#F5F5DC] transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveAttendance}
                        className="flex-1 px-4 py-2 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                      >
                        {editingAttendance ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[#6B3E26] pt-5">Settings</h1>
              <p className="text-gray-600 mt-2">Configure hotel settings, taxes, and printer preferences</p>
            </div>

            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Hotel Logo</h3>
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 bg-[#F5F5DC] rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Hotel Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No logo</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-2">Recommended: Square image, max 2MB</p>
                  </div>
                </div>
              </div>

              {/* Hotel Information */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Hotel Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Hotel Name *</label>
                    <input
                      type="text"
                      value={hotelSettings.hotel_name}
                      onChange={(e) => setHotelSettings({ ...hotelSettings, hotel_name: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={hotelSettings.phone}
                      onChange={(e) => setHotelSettings({ ...hotelSettings, phone: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={hotelSettings.email}
                      onChange={(e) => setHotelSettings({ ...hotelSettings, email: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">GSTIN</label>
                    <input
                      type="text"
                      value={hotelSettings.gstin}
                      onChange={(e) => setHotelSettings({ ...hotelSettings, gstin: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      placeholder="GST Identification Number"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
                  <textarea
                    value={hotelSettings.address}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Tax Configuration */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Tax Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">CGST Rate (%)</label>
                    <input
                      type="number"
                      value={hotelSettings.tax_rates.cgst}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        tax_rates: { ...hotelSettings.tax_rates, cgst: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">SGST Rate (%)</label>
                    <input
                      type="number"
                      value={hotelSettings.tax_rates.sgst}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        tax_rates: { ...hotelSettings.tax_rates, sgst: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Printer Settings */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Printer Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Printer Type</label>
                    <select
                      value={hotelSettings.printer_settings.printer_type}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        printer_settings: { ...hotelSettings.printer_settings, printer_type: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    >
                      <option value="thermal_58mm">Thermal Printer (58mm)</option>
                      <option value="thermal_80mm">Thermal Printer (80mm)</option>
                      <option value="standard">Standard Printer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Paper Size</label>
                    <select
                      value={hotelSettings.printer_settings.paper_size}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        printer_settings: { ...hotelSettings.printer_settings, paper_size: e.target.value }
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                    >
                      <option value="58mm">58mm</option>
                      <option value="80mm">80mm</option>
                      <option value="a4">A4</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hotelSettings.printer_settings.auto_print}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        printer_settings: { ...hotelSettings.printer_settings, auto_print: e.target.checked }
                      })}
                      className="w-5 h-5 accent-[#6B3E26]"
                    />
                    <span className="text-sm text-gray-700">Enable automatic bill printing</span>
                  </label>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Notification Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hotelSettings.notification_settings.new_orders}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        notification_settings: { ...hotelSettings.notification_settings, new_orders: e.target.checked }
                      })}
                      className="w-5 h-5 accent-[#6B3E26]"
                    />
                    <span className="text-sm text-gray-700">New order notifications</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hotelSettings.notification_settings.low_inventory}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        notification_settings: { ...hotelSettings.notification_settings, low_inventory: e.target.checked }
                      })}
                      className="w-5 h-5 accent-[#6B3E26]"
                    />
                    <span className="text-sm text-gray-700">Low inventory alerts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hotelSettings.notification_settings.staff_changes}
                      onChange={(e) => setHotelSettings({
                        ...hotelSettings,
                        notification_settings: { ...hotelSettings.notification_settings, staff_changes: e.target.checked }
                      })}
                      className="w-5 h-5 accent-[#6B3E26]"
                    />
                    <span className="text-sm text-gray-700">Staff change notifications</span>
                  </label>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Theme Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hotelSettings.theme_settings.primary_color}
                        onChange={(e) => setHotelSettings({
                          ...hotelSettings,
                          theme_settings: { ...hotelSettings.theme_settings, primary_color: e.target.value }
                        })}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={hotelSettings.theme_settings.primary_color}
                        onChange={(e) => setHotelSettings({
                          ...hotelSettings,
                          theme_settings: { ...hotelSettings.theme_settings, primary_color: e.target.value }
                        })}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hotelSettings.theme_settings.secondary_color}
                        onChange={(e) => setHotelSettings({
                          ...hotelSettings,
                          theme_settings: { ...hotelSettings.theme_settings, secondary_color: e.target.value }
                        })}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={hotelSettings.theme_settings.secondary_color}
                        onChange={(e) => setHotelSettings({
                          ...hotelSettings,
                          theme_settings: { ...hotelSettings.theme_settings, secondary_color: e.target.value }
                        })}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Settings */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Currency Settings</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                  <select
                    value={hotelSettings.currency}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, currency: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#6B3E26] focus:outline-none transition-colors"
                  >
                    <option value="INR">Indian Rupee (₹)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="GBP">British Pound (£)</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="px-8 py-3 bg-[#6B3E26] text-white rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300 transform hover:scale-105"
                >
                  Save All Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Custom animations */}
      <style jsx>{`
              @keyframes letter-drop {
                0% {
                  opacity: 0;
                  transform: translateY(-60px) scale(2.5);
                  filter: blur(10px);
                }
                40% {
                  opacity: 1;
                  transform: translateY(0) scale(1.3);
                  filter: blur(0);
                }
                60% {
                  transform: translateY(-5px) scale(1.1);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                  filter: blur(0);
                }
              }

              @keyframes fade-in-down {
                0% {
                  opacity: 0;
                  transform: translateY(-30px);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              @keyframes fade-in-up {
                0% {
                  opacity: 0;
                  transform: translateY(30px);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              @keyframes scale-in {
                0% {
                  opacity: 0;
                  transform: scale(0.5);
                }
                50% {
                  transform: scale(1.1);
                }
                100% {
                  opacity: 1;
                  transform: scale(1);
                }
              }

              @keyframes slide-in-left {
                0% {
                  opacity: 0;
                  transform: translateX(-60px);
                }
                100% {
                  opacity: 1;
                  transform: translateX(0);
                }
              }

              @keyframes slide-in-right {
                0% {
                  opacity: 0;
                  transform: translateX(60px);
                }
                100% {
                  opacity: 1;
                  transform: translateX(0);
                }
              }

              @keyframes spin-slow {
                0% {
                  transform: rotate(0deg);
                }
                100% {
                  transform: rotate(360deg);
                }
              }

              @keyframes float {
                0%, 100% {
                  transform: translateY(0) translateX(0);
                  opacity: 0.3;
                }
                50% {
                  transform: translateY(-20px) translateX(10px);
                  opacity: 0.6;
                }
              }

              .animate-letter-drop {
                animation: letter-drop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                opacity: 0;
              }

              .animate-fade-in-down {
                animation: fade-in-down 1.2s ease-out forwards;
                opacity: 0;
              }

              .animate-fade-in-up {
                animation: fade-in-up 1.2s ease-out forwards;
                opacity: 0;
              }

              .animate-scale-in {
                animation: scale-in 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                opacity: 0;
              }

              .animate-slide-in-left {
                animation: slide-in-left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                opacity: 0;
              }

              .animate-slide-in-right {
                animation: slide-in-right 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                opacity: 0;
              }

              .animate-spin-slow {
                animation: spin-slow 30s linear infinite;
              }

              .animate-float {
                animation: float 12s ease-in-out infinite;
              }
            `}</style>

        {/* Floating Cart Button */}
        {activeTab === 'offline-billing' && offlineCart.length > 0 && (
          <button
            onClick={() => setShowCartModal(true)}
            className="fixed bottom-8 right-8 bg-amber-600 hover:bg-amber-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 z-40"
          >
            <div className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {offlineCart.length}
              </span>
            </div>
            <span className="font-semibold">₹{getCartTotal().toFixed(2)}</span>
          </button>
        )}

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-700">Cart</h2>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
              {offlineCart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                offlineCart.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between bg-gray-50 rounded-lg p-3 transition-all duration-300 ${cartAnimation ? 'animate-bounce' : ''}`}>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                      <p className="text-sm text-[#6B3E26]">₹{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-white border-2 border-[#9A572D] text-[#9A572D] hover:bg-[#F5F5DC] transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-[#F5F5DC] text-[#9A572D] hover:bg-[#9A572D] hover:text-white transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Details */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Table Number</label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none"
                >
                  <option value="">Select Table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table {table.table_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none"
                />
              </div>
            </div>

            {/* Total and Create Bill */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-[#6B3E26]">₹{getCartTotal().toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  setShowCartModal(false)
                  handleCreateBill()
                }}
                disabled={offlineCart.length === 0 || !selectedTable}
                className="w-full bg-[#9A572D] text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {showBillPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-[#6B3E26]">
              Bill Preview
            </h2>
            
            {/* Bill Details */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Table:</span>
                  <span className="font-semibold">
                    {selectedTable ? `Table ${tables.find(t => t.id === selectedTable)?.table_number || 'N/A'}` : 'No table selected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Waiter:</span>
                  <span className="font-semibold">{user?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold">{customerName || 'Guest'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              {offlineCart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items in cart</p>
              ) : (
                offlineCart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                    </div>
                    <span className="font-bold text-[#6B3E26]">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Discount Section */}
            <div className="bg-amber-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Discount</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setBillDiscountType('amount')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    billDiscountType === 'amount'
                      ? 'bg-[#9A572D] text-white'
                      : 'bg-white text-gray-700 border-2 border-[#9A572D]'
                  }`}
                >
                  Amount
                </button>
                <button
                  onClick={() => setBillDiscountType('percentage')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    billDiscountType === 'percentage'
                      ? 'bg-[#9A572D] text-white'
                      : 'bg-white text-gray-700 border-2 border-[#9A572D]'
                  }`}
                >
                  Percentage
                </button>
              </div>
              {billDiscountType === 'amount' ? (
                <input
                  type="number"
                  placeholder="Enter discount amount (₹)"
                  value={billDiscountAmount}
                  onChange={(e) => setBillDiscountAmount(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-[#9A572D] rounded-xl focus:border-[#9A572D] focus:outline-none"
                />
              ) : (
                <input
                  type="number"
                  placeholder="Enter discount percentage (%)"
                  value={billDiscountPercentage}
                  onChange={(e) => setBillDiscountPercentage(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-[#9A572D] rounded-xl focus:border-[#9A572D] focus:outline-none"
                />
              )}
            </div>

            {/* Payment Type Section */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Payment Type</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { playClickSound(); setBillPaymentType('cash') }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    billPaymentType === 'cash'
                      ? 'bg-[#9A572D] text-white'
                      : 'bg-white text-gray-700 border-2 border-[#9A572D]'
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => { playClickSound(); setBillPaymentType('upi') }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    billPaymentType === 'upi'
                      ? 'bg-[#9A572D] text-white'
                      : 'bg-white text-gray-700 border-2 border-[#9A572D]'
                  }`}
                >
                  UPI
                </button>
                <button
                  onClick={() => { playClickSound(); setBillPaymentType('card') }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    billPaymentType === 'card'
                      ? 'bg-[#9A572D] text-white'
                      : 'bg-white text-gray-700 border-2 border-[#9A572D]'
                  }`}
                >
                  Card
                </button>
              </div>
            </div>

            {/* Tax Rates */}
            <div className="bg-purple-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Tax Rates (%)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">CGST Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cgstRate}
                    onChange={(e) => setCgstRate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">SGST Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sgstRate}
                    onChange={(e) => setSgstRate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Subtotal:</span>
                <span className="font-bold text-[#6B3E26]">₹{getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Discount:</span>
                <span className="font-bold text-red-600">
                  -₹{(getCartTotal() - calculateTaxes().discountedAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">CGST ({cgstRate}%):</span>
                <span className="font-bold text-[#6B3E26]">₹{calculateTaxes().cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">SGST ({sgstRate}%):</span>
                <span className="font-bold text-[#6B3E26]">₹{calculateTaxes().sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold border-t border-gray-200 pt-2">
                <span>Grand Total:</span>
                <span className="text-[#6B3E26]">₹{calculateBillTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBillPreview(false)
                  setBillDiscountAmount('')
                  setBillDiscountPercentage('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintBill}
                className="flex-1 bg-[#6B3E26] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#9A572D] transition-all"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal for viewingBill */}
      {viewingBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#6B3E26] to-[#8B5A2B] p-6 rounded-t-2xl">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-1">DHOLE PATIL KHANAWAL</h2>
                <p className="text-[#F5F5DC] text-sm font-semibold">VEG & NON-VEG</p>
                <div className="mt-2 text-[#F5F5DC] text-xs space-y-1">
                  <p>Sangamner</p>
                  <p>PHONE: +91 98765 43210</p>
                  <p>GSTIN: 29ABCDE1234F1Z5</p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Bill Info */}
              <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-bold text-gray-900">Bill No</p>
                    <p className="text-sm text-gray-600">Table: {viewingBill.tables?.table_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatOrderId(viewingBill.id)}</p>
                    <p className="text-sm text-gray-600">{new Date(viewingBill.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-bold text-gray-900">Waiter</p>
                    <p className="text-sm text-gray-600">{viewingBill.users?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{viewingBill.customer_name || 'Guest'}</p>
                    <p className="text-sm text-gray-600">{new Date(viewingBill.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900">Status</p>
                    <p className="text-sm text-gray-600">{viewingBill.status}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      viewingBill.status === 'paid' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                      viewingBill.status === 'ready' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                      viewingBill.status === 'preparing' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingBill.status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900">Payment Type</p>
                    <p className="text-sm text-gray-600 capitalize">{billPaymentType || 'Not specified'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      billPaymentType === 'cash' ? 'bg-green-100 text-green-700' :
                      billPaymentType === 'upi' ? 'bg-purple-100 text-purple-700' :
                      billPaymentType === 'card' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {billPaymentType ? billPaymentType.toUpperCase() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pb-2 border-b border-gray-200">
                  <span className="flex-1">Item</span>
                  <span className="w-24 text-center">Qty</span>
                  <span className="w-20 text-right">Amount</span>
                  {isEditingBill && <span className="w-12 text-center">Action</span>}
                </div>
                {(!viewingBill.order_items || viewingBill.order_items.length === 0) ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">No items in this order</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupOrderItems(viewingBill.order_items).map((item, index) => (
                      <div key={`${item.dish_id}-${index}`} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div className="flex-1 flex items-center gap-2">
                          {getFoodTypeIcon(item.dishes?.food_type)}
                          <p className="font-semibold text-gray-900">{item.dishes?.name || item.dish?.name}</p>
                        </div>
                        {isEditingBill ? (
                          <>
                            <div className="w-24 text-center flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleUpdateBillItem(item.id, Math.max(1, item.quantity - 1))}
                                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-4 h-4 text-gray-700" />
                              </button>
                              <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateBillItem(item.id, item.quantity + 1)}
                                className="w-7 h-7 rounded-full bg-[#6B3E26] hover:bg-[#9A572D] flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                            </div>
                            <span className="w-20 text-right font-bold text-gray-900 text-sm">₹{((item.dishes?.price || item.dish?.price || item.price || 0) * item.quantity).toFixed(2)}</span>
                            <div className="w-12 text-center">
                              <button
                                onClick={() => { playClickSound(); handleRemoveBillItem(item.id) }}
                                className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="w-24 text-center text-sm text-gray-600">{item.quantity}x</span>
                            <span className="w-20 text-right font-bold text-gray-900 text-sm">₹{((item.dishes?.price || item.dish?.price || item.price || 0) * item.quantity).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">Subtotal</span>
                    <span className="text-xl font-bold text-gray-900">
                      ₹{calculateBillSubtotal().toFixed(2)}
                    </span>
                  </div>

                  {/* Discount Section */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-700">Discount</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBillDiscountType('amount')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            billDiscountType === 'amount'
                              ? 'bg-[#9A572D] text-white'
                              : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                        >
                          Amount (₹)
                        </button>
                        <button
                          onClick={() => setBillDiscountType('percentage')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            billDiscountType === 'percentage'
                              ? 'bg-[#9A572D] text-white'
                              : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                        >
                          Percentage (%)
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      placeholder={billDiscountType === 'amount' ? 'Enter discount amount' : 'Enter discount percentage'}
                      value={billDiscountType === 'amount' ? billDiscountAmount : billDiscountPercentage}
                      onChange={(e) => billDiscountType === 'amount' ? setBillDiscountAmount(e.target.value) : setBillDiscountPercentage(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-[#9A572D] focus:outline-none"
                    />
                    {calculateBillDiscount() > 0 && (
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Discount:</span>
                        <span className="font-bold text-red-600">-₹{calculateBillDiscount().toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Type Section */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="font-bold text-gray-700 block mb-3">Payment Type</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { playClickSound(); setBillPaymentType('cash') }}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                          billPaymentType === 'cash'
                            ? 'bg-[#9A572D] text-white'
                            : 'bg-white text-gray-700 border-2 border-gray-300'
                        }`}
                      >
                        Cash
                      </button>
                      <button
                        onClick={() => { playClickSound(); setBillPaymentType('upi') }}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                          billPaymentType === 'upi'
                            ? 'bg-[#9A572D] text-white'
                            : 'bg-white text-gray-700 border-2 border-gray-300'
                        }`}
                      >
                        UPI
                      </button>
                      <button
                        onClick={() => { playClickSound(); setBillPaymentType('card') }}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                          billPaymentType === 'card'
                            ? 'bg-[#9A572D] text-white'
                            : 'bg-white text-gray-700 border-2 border-gray-300'
                        }`}
                      >
                        Card
                      </button>
                    </div>
                  </div>

                  {/* Tax Section */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="font-bold text-gray-700 block mb-3">Taxes</span>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">CGST (%):</span>
                        <input
                          type="number"
                          value={billCGST}
                          onChange={(e) => setBillCGST(e.target.value)}
                          className="w-20 px-3 py-1 border-2 border-gray-300 rounded-lg focus:border-[#9A572D] focus:outline-none text-center"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">SGST (%):</span>
                        <input
                          type="number"
                          value={billSGST}
                          onChange={(e) => setBillSGST(e.target.value)}
                          className="w-20 px-3 py-1 border-2 border-gray-300 rounded-lg focus:border-[#9A572D] focus:outline-none text-center"
                        />
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">CGST:</span>
                          <span className="font-semibold text-gray-900">₹{calculateBillTax(calculateBillSubtotal() - calculateBillDiscount(), billCGST).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">SGST:</span>
                          <span className="font-semibold text-gray-900">₹{calculateBillTax(calculateBillSubtotal() - calculateBillDiscount(), billSGST).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                    <span className="text-xl font-bold text-gray-700">GRAND TOTAL</span>
                    <span className="text-3xl font-bold text-[#6B3E26]">
                      ₹{calculateBillGrandTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500 mb-2">Thank you for dining with us!</p>
                <p className="text-xs text-gray-400">Visit us again soon</p>
                <p className="text-xs text-gray-400 mt-2 font-semibold">Developed by onethynk techmedia</p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {!isEditingBill ? (
                  <>
                    <button
                      onClick={() => { playClickSound(); setIsEditingBill(true) }}
                      className="w-full flex items-center justify-center gap-2 bg-gray-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-300"
                    >
                      <Edit className="w-5 h-5" />
                      Edit Bill
                    </button>
                    <button
                      onClick={handlePrintPreviewBill}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        viewingBill.is_printed
                          ? 'bg-white border-2 border-[#9A572D] text-[#9A572D] hover:bg-[#F5F0E8]'
                          : 'bg-[#6B3E26] text-white hover:bg-[#9A572D]'
                      }`}
                    >
                      <Printer className="w-5 h-5" />
                      {viewingBill.is_printed ? 'Printed' : 'Print Bill'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { playClickSound(); handleSaveBillEdits() }}
                      className="w-full flex items-center justify-center gap-2 bg-[#6B3E26] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#9A572D] transition-all duration-300"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingBill(false)}
                      className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
                    >
                      Cancel Edit
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewingBill(null)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-book Modal */}
      {showPrebookModal && selectedTableForPrebook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-6 text-[#6B3E26]">
              Pre-book Table {selectedTableForPrebook.table_number}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Booking Time</label>
                <input
                  type="datetime-local"
                  value={prebookTime}
                  onChange={(e) => setPrebookTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name (optional)</label>
                <input
                  type="text"
                  value={prebookCustomer}
                  onChange={(e) => setPrebookCustomer(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter customer name"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowPrebookModal(false)
                  setSelectedTableForPrebook(null)
                  setPrebookTime('')
                  setPrebookCustomer('')
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrebook}
                className="flex-1 px-6 py-3 bg-[#6B3E26] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Confirm Pre-book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dish Modal */}
      {showDishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-[#6B3E26]">
              {editingDish ? 'Edit Dish' : 'Add New Dish'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dish Name</label>
                <input
                  type="text"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter dish name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Marathi Name (for KOT)</label>
                <input
                  type="text"
                  value={dishForm.marathi_name}
                  onChange={(e) => setDishForm({ ...dishForm, marathi_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter dish name in Marathi (e.g., बटर चिकन)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter price"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={dishForm.category}
                  onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select category</option>
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Food Type</label>
                <select
                  value={dishForm.food_type}
                  onChange={(e) => setDishForm({ ...dishForm, food_type: e.target.value as 'veg' | 'nonveg' | 'custom' | 'parcel' })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors bg-white"
                >
                  <option value="veg">Veg</option>
                  <option value="nonveg">Non-Veg</option>
                  <option value="custom">Custom</option>
                  <option value="parcel">Parcel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image (optional, max 1MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 1024 * 1024) {
                        alert('Image size must be less than 1MB')
                        e.target.value = ''
                        return
                      }
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setDishForm({ ...dishForm, image_url: reader.result as string })
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
                />
                {dishForm.image_url && (
                  <div className="mt-2">
                    <img src={dishForm.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={dishForm.is_available}
                  onChange={(e) => setDishForm({ ...dishForm, is_available: e.target.checked })}
                  className="w-5 h-5 text-[#6B3E26] rounded focus:ring-green-500"
                />
                <label htmlFor="isAvailable" className="text-sm font-semibold text-gray-700">Available</label>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Offer (Optional)</label>
                <select
                  value={dishForm.offer}
                  onChange={(e) => {
                    const selectedOffer = offers.find(o => `${o.discount_percent}% OFF` === e.target.value)
                    setDishForm({
                      ...dishForm,
                      offer: e.target.value,
                      offer_discount: selectedOffer ? selectedOffer.discount_percent.toString() : ''
                    })
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors bg-white"
                >
                  <option value="">No offer</option>
                  {offers.filter(o => o.is_active).map(offer => (
                    <option key={offer.id} value={`${offer.discount_percent}% OFF`}>
                      {offer.title} - {offer.discount_percent}% OFF
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Or Custom Offer Text</label>
                <input
                  type="text"
                  value={dishForm.offer}
                  onChange={(e) => setDishForm({ ...dishForm, offer: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="e.g., 20% OFF"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Offer Discount (%)</label>
                <input
                  type="number"
                  value={dishForm.offer_discount}
                  onChange={(e) => setDishForm({ ...dishForm, offer_discount: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="e.g., 20"
                  min="0"
                  max="100"
                />
              </div>
              {dishForm.offer && (
                <button
                  type="button"
                  onClick={() => setDishForm({ ...dishForm, offer: '', offer_discount: '' })}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors"
                >
                  Remove Offer
                </button>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowDishModal(false)
                  setEditingDish(null)
                  setDishForm({
                    name: '',
                    marathi_name: '',
                    description: '',
                    price: '',
                    category: '',
                    image_url: '',
                    food_type: 'veg',
                    is_available: true,
                    offer: '',
                    offer_discount: ''
                  })
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDish}
                className="flex-1 px-6 py-3 bg-[#6B3E26] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
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
            <h2 className="text-2xl font-bold mb-6 text-[#6B3E26]">
              {editingTable ? 'Edit Table' : 'Add New Table'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Table Number</label>
                <input
                  type="number"
                  value={tableForm.table_number}
                  onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter table number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
                <input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-gray-400"
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
                className="flex-1 px-6 py-3 bg-[#6B3E26] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {editingTable ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Table Modal */}
      {showMasterTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-[#6B3E26]">Create Master Table</h2>
            <p className="text-gray-600 mb-4">Select 2 or more tables to combine into a master table. The first selected table will become the master.</p>
            {selectedTablesForMaster.length > 0 && (
              <div className="mb-4 p-3 bg-[#F5F5DC] rounded-lg">
                <p className="font-semibold text-[#6B3E26]">
                  Master Table: Table {tables.find(t => t.id === selectedTablesForMaster[0])?.table_number}
                </p>
              </div>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tables.filter(t => !t.is_master && !t.master_table_id).map(table => (
                <label
                  key={table.id}
                  className={`flex items-center p-3 border-2 rounded-xl transition-colors ${
                    table.is_occupied
                      ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60'
                      : 'border-gray-200 hover:border-[#9A572D] cursor-pointer'
                  }`}
                >
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
                    disabled={table.is_occupied}
                    className="w-5 h-5 text-[#9A572D] rounded focus:ring-[#9A572D]"
                  />
                  <span className={`ml-3 font-semibold ${table.is_occupied ? 'text-red-600' : 'text-gray-900'}`}>
                    Table {table.table_number}
                  </span>
                  <span className="ml-3 text-gray-500">(Capacity: {table.capacity})</span>
                  {table.is_occupied && (
                    <span className="ml-3 px-2 py-1 bg-red-600 text-white text-xs rounded-full font-bold">Occupied</span>
                  )}
                  {!table.is_occupied && selectedTablesForMaster.length > 0 && selectedTablesForMaster[0] === table.id && (
                    <span className="ml-3 px-2 py-1 bg-[#9A572D] text-white text-xs rounded-full">Master</span>
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
                className="flex-1 px-6 py-3 bg-[#9A572D] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Create Master Table
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
              <h2 className="text-2xl font-bold text-[#6B3E26]">
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
                {selectedTableOrders.map((order, index) => (
                  <div key={`${order.id}-${index}`} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-[#F5F5DC] flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">Order #{formatOrderId(order.id)}</p>
                        <p className="text-sm text-gray-600">Waiter: {order.users?.name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'paid' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                        order.status === 'ready' ? 'bg-[#F5F5DC] text-[#9A572D]' :
                        order.status === 'preparing' ? 'bg-[#F5F5DC] text-[#9A572D]' :
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
                          {(() => {
                            // Group items by dish_id and dish_type
                            const groupedItems = (order.order_items || []).reduce((acc: any[], item: any) => {
                              const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
                              if (existing) {
                                existing.quantity += item.quantity
                                existing.total_price += (item.price * item.quantity)
                              } else {
                                acc.push({
                                  ...item,
                                  quantity: item.quantity,
                                  total_price: (item.price * item.quantity)
                                })
                              }
                              return acc
                            }, [])
                            return groupedItems.map((item: any, index: number) => (
                              <tr key={`${item.dish_id}-${item.dish_type}-${index}`} className="hover:bg-amber-50">
                                <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {getFoodTypeIcon(item.dishes?.food_type)}
                                    <span>{item.dishes?.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 font-bold">
                                  {item.quantity}x
                                  {item.dish_type && (
                                    <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                      {item.dish_type}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">₹{item.total_price.toFixed(2)}</td>
                              </tr>
                            ))
                          })()}
                        </tbody>
                      </table>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700">Total Amount:</span>
                        <span className="text-2xl font-bold text-[#6B3E26]">
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

      {/* Billing Modal */}
      {selectedOrderForBilling && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in">
          <div id="bill-modal" className="bg-[#F5F5DC] rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto text-center">
            <div className="flex justify-between items-center mb-6 no-print">
              <h2 className="text-2xl font-bold text-green-700">
                Print Bill
              </h2>
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-[#9A572D] rounded-xl p-6 bg-white shadow-lg">
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-[#9A572D]">
                <h1 className="text-3xl font-bold text-[#9A572D] mb-1 uppercase">
                  DHOLE PATIL KHANAWAL
                </h1>
                <p className="text-sm font-semibold text-gray-700 mb-1 uppercase">VEG & NON-VEG</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Sangamner</p>
                  <p>PHONE: +91 98765 43210</p>
                  <p>GSTIN: 29ABCDE1234F1Z5</p>
                </div>
                <p className="text-sm font-bold text-green-700 mt-3 border-t border-dashed border-[#9A572D] pt-2 uppercase">BILL / INVOICE</p>
              </div>

              {/* Print-only header with hotel details */}
              <div className="print-only text-center mb-2 pb-2 border-b border-gray-300">
                <h1 className="text-lg font-bold text-black mb-1 uppercase tracking-wide">DHOLE PATIL KHANAWAL</h1>
                <p className="text-sm font-semibold text-black mb-1">Restaurant & Bar</p>
                <p className="text-sm text-black mb-1">123, Main Street, City, State - 123456</p>
                <p className="text-sm text-black mb-1">Phone: +91 98765 43210</p>
                <p className="text-sm text-black mb-1">GSTIN: 29ABCDE1234F1Z5</p>
                <p className="text-sm font-bold text-black mt-2 border-t border-dashed border-gray-300 pt-2 uppercase">BILL / INVOICE</p>
              </div>

              {/* Print-only order details */}
              <div className="print-only mb-2 pb-2 border-b border-gray-300">
                <div className="flex justify-between text-sm text-black font-bold">
                  <span>Bill No: {formatOrderId(selectedOrderForBilling.id)}</span>
                  <span>Date: {new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm text-black mt-1 font-bold">
                  <span>Time: {new Date(selectedOrderForBilling.created_at).toLocaleTimeString()}</span>
                  <span>Table: {selectedOrderForBilling.tables?.table_number}</span>
                </div>
                <div className="flex justify-between text-sm text-black mt-1 font-bold">
                  <span>Waiter: {selectedOrderForBilling.users?.name}</span>
                  <span>Customer: {selectedOrderForBilling.customer_name || 'Guest'}</span>
                </div>
                <div className="flex justify-between text-sm text-black mt-1 font-bold">
                  <span>Payment: {billPaymentType === 'cash' ? 'CASH' : 'ONLINE'}</span>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#F5F5DC] rounded-xl no-print border border-[#9A572D]">
                <div>
                  <p className="text-sm font-semibold text-green-800">Bill No</p>
                  <p className="text-lg font-bold text-green-900">{formatOrderId(selectedOrderForBilling.id)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Date</p>
                  <p className="text-lg font-bold text-green-900">{new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Table</p>
                  <p className="text-lg font-bold text-green-900">Table {selectedOrderForBilling.tables?.table_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Waiter</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBilling.users?.name}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <table className="w-full">
                  <thead className="bg-[#6B3E26]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase w-1/2">Item</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white uppercase w-16">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-white uppercase w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-100">
                    {(() => {
                      // Group items by dish_id and dish_type
                      const groupedItems = (selectedOrderForBilling.order_items || []).reduce((acc: any[], item: any) => {
                        const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
                        if (existing) {
                          existing.quantity += item.quantity
                          existing.total_price += (item.price * item.quantity)
                        } else {
                          acc.push({
                            ...item,
                            quantity: item.quantity,
                            total_price: (item.price * item.quantity)
                          })
                        }
                        return acc
                      }, [])
                      return groupedItems.map((item: any, index: number) => (
                        <tr key={`${item.dish_id}-${item.dish_type}-${index}`}>
                          <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              {getFoodTypeIcon(item.dishes?.food_type)}
                              <span className="truncate">{item.dishes?.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-center text-gray-600 font-bold">{item.quantity}x</td>
                          <td className="px-3 py-2 text-sm text-right font-bold text-green-700">₹{item.total_price.toFixed(2)}</td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Print-only items table */}
              <div className="print-only mb-2">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-sm font-bold text-black uppercase">Item</th>
                      <th className="text-center text-sm font-bold text-black uppercase">Qty</th>
                      <th className="text-right text-sm font-bold text-black uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group items by dish_id and dish_type
                      const groupedItems = (selectedOrderForBilling.order_items || []).reduce((acc: any[], item: any) => {
                        const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
                        if (existing) {
                          existing.quantity += item.quantity
                          existing.total_price += (item.price * item.quantity)
                        } else {
                          acc.push({
                            ...item,
                            quantity: item.quantity,
                            total_price: (item.price * item.quantity)
                          })
                        }
                        return acc
                      }, [])
                      return groupedItems.map((item: any, index: number) => (
                        <tr key={`${item.dish_id}-${item.dish_type}-${index}`}>
                          <td className="text-sm text-black font-bold">{item.dishes?.name}</td>
                          <td className="text-sm text-center text-black font-bold">{item.quantity}x</td>
                          <td className="text-sm text-right text-black font-bold">{item.total_price.toFixed(2)}</td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Discount Section (no-print) */}
              <div className="mb-6 p-4 bg-[#F5F5DC] rounded-xl no-print border border-[#9A572D]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                  <label className="text-sm font-semibold text-green-800">Discount Type:</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setDiscountType('amount')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        discountType === 'amount'
                          ? 'bg-[#6B3E26] text-white shadow-md'
                          : 'bg-white text-green-700 border-2 border-[#9A572D] hover:border-green-500'
                      }`}
                    >
                      Amount (₹)
                    </button>
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        discountType === 'percentage'
                          ? 'bg-[#6B3E26] text-white shadow-md'
                          : 'bg-white text-green-700 border-2 border-[#9A572D] hover:border-green-500'
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
                      className="flex-1 px-3 py-2 border-2 border-[#9A572D] rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-green-400 text-sm"
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
                      className="flex-1 px-3 py-2 border-2 border-[#9A572D] rounded-xl focus:border-[#9A572D] focus:outline-none transition-colors placeholder-green-400 text-sm"
                      placeholder="Enter discount percentage"
                    />
                  )}
                </div>
              </div>

              {/* Order Details (for screen view) */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-[#F5F5DC] rounded-xl no-print border border-[#9A572D]">
                <div>
                  <p className="text-sm font-semibold text-green-800">Table</p>
                  <p className="text-lg font-bold text-green-900">Table {selectedOrderForBilling.tables?.table_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Waiter</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBilling.users?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Customer</p>
                  <p className="text-lg font-bold text-green-900">{selectedOrderForBilling.customer_name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Date</p>
                  <p className="text-lg font-bold text-green-900">{new Date(selectedOrderForBilling.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t-2 border-[#9A572D] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-700">Subtotal</span>
                  <span className="text-xl font-bold text-green-900">₹{selectedOrderForBilling.total_amount.toFixed(2)}</span>
                </div>
                {calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-700">
                      Discount ({discountType === 'amount' ? '₹' : '%'}{discountType === 'amount' ? discountAmount : discountPercentage})
                    </span>
                    <span className="text-xl font-bold text-red-600">
                      -₹{calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t-2 border-[#9A572D] pt-3">
                  <span className="text-xl font-bold text-green-900">GRAND TOTAL</span>
                  <span className="text-3xl font-bold text-green-700">
                    ₹{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Print-only totals */}
              <div className="print-only mb-2 pb-2 border-t border-dashed border-black">
                <div className="flex justify-between text-sm text-black mt-2 font-bold">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrderForBilling.total_amount.toFixed(2)}</span>
                </div>
                {calculateDiscountValue(selectedOrderForBilling.total_amount) > 0 && (
                  <div className="flex justify-between text-sm text-black mt-1 font-bold">
                    <span>Discount ({discountType === 'amount' ? '₹' : '%'}{discountType === 'amount' ? discountAmount : discountPercentage}):</span>
                    <span>-₹{calculateDiscountValue(selectedOrderForBilling.total_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-black mt-2 pt-2 border-t border-dashed border-black">
                  <span>GRAND TOTAL:</span>
                  <span>₹{calculateFinalAmount(selectedOrderForBilling.total_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Thank You Message (print only) */}
              <div className="text-center print-only mt-4">
                <div className="border-t-2 border-dashed border-black mt-6 pt-4">
                  <p className="text-base font-bold text-black uppercase">Thank You for Dining With Us!</p>
                  <p className="text-sm text-black mt-1 uppercase">Visit Us Again</p>
                  <div className="border-t border-dashed border-black mt-3 pt-3">
                    <p className="text-sm text-black uppercase">Developed by onethynk techmedia</p>
                  </div>
                </div>
                <div className="mt-6">
                  &nbsp;
                </div>
              </div>
            </div>

            {/* Payment Type Selection */}
            <div className="mt-6 p-4 bg-white border-2 border-[#9A572D] rounded-xl no-print">
              <label className="block text-sm font-bold text-[#6B3E26] mb-3 uppercase">Payment Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setBillPaymentType('cash')}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                    billPaymentType === 'cash'
                      ? 'bg-[#6B3E26] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => setBillPaymentType('upi')}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                    billPaymentType === 'upi'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  UPI
                </button>
              </div>
            </div>

            <div className="flex gap-3 no-print mt-6">
              <button
                onClick={() => setSelectedOrderForBilling(null)}
                className="flex-1 px-6 py-3 border-2 border-[#9A572D] text-green-700 rounded-xl font-semibold hover:bg-amber-50 transition-all duration-300"
              >
                Close
              </button>
              <button
                onClick={handleThermalPrint}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  selectedOrderForBilling.is_printed
                    ? 'bg-white border-2 border-[#