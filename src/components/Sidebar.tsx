'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Utensils, 
  Table, 
  TrendingUp, 
  Users, 
  Bell, 
  LogOut, 
  Menu,
  X,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react'

interface SidebarProps {
  activeTab: 'overview' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports'
  setActiveTab: (tab: 'overview' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports') => void
  user: any
  onLogout: () => void
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const menuItems: { id: 'overview' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports', label: string, icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'dishes', label: 'Menu Management', icon: Utensils },
    { id: 'tables', label: 'Table Management', icon: Table },
    { id: 'waiters', label: 'Waiter Status', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ]

  const handleTabChange = (tabId: 'overview' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports') => {
    setActiveTab(tabId)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        style={{ left: isMobileMenuOpen ? '280px' : '16px' }}
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-white to-green-50 shadow-2xl z-40 transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          w-72 flex flex-col`}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-green-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Hotel Admin
          </h1>
          <p className="text-sm text-gray-600 mt-1">Management Dashboard</p>
        </div>

        {/* User Info */}
        <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-600 capitalize">{user?.role || 'Administrator'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                      ${activeTab === item.id
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:bg-green-100 hover:shadow-md'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-green-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
