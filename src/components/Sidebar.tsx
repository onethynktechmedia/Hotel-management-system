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
  PieChart,
  CreditCard,
  Receipt
} from 'lucide-react'
import { playClickSound } from '@/lib/sound-effects'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: any) => void
  user: any
}

export default function Sidebar({ activeTab, setActiveTab, user }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const menuItems: { id: 'overview' | 'orders' | 'dishes' | 'tables' | 'waiters' | 'reports' | 'offline-billing' | 'online-orders', label: string, icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'dishes', label: 'Menu Management', icon: Utensils },
    { id: 'tables', label: 'Table Management', icon: Table },
    { id: 'waiters', label: 'Waiter Status', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'offline-billing', label: 'Offline Billing', icon: Receipt },
    { id: 'online-orders', label: 'Online Orders', icon: CreditCard },
  ]

  const handleLogout = () => {
    playClickSound()
    // Clear all cookies
    document.cookie = 'hotel_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'hotel_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Clear localStorage
    localStorage.clear()
    
    // Redirect to main page
    router.push('/')
  }

  const handleTabChange = (tabId: string) => {
    playClickSound()
    setActiveTab(tabId as any)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => { playClickSound(); setIsMobileMenuOpen(!isMobileMenuOpen) }}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#5D3A1A] text-white p-3 rounded-xl shadow-lg hover:bg-[#8B4513] transition-all duration-300"
        style={{ left: isMobileMenuOpen ? '280px' : '16px' }}
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => { playClickSound(); setIsMobileMenuOpen(false) }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white shadow-2xl z-40 transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          w-72 flex flex-col`}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-[#5D3A1A]">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Dhole Patil Hotel Logo" className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#5D3A1A] leading-tight">
                Dhole Patil
              </h1>
              <p className="text-base text-gray-600 leading-tight font-semibold">Khanawal</p>
              <p className="text-sm text-gray-500 leading-tight">Management Dashboard</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 mx-4 mt-4 bg-[#F5F5DC] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5D3A1A] rounded-full flex items-center justify-center text-white font-bold">
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
                        ? 'bg-[#5D3A1A] text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:bg-[#F5F5DC] hover:shadow-md'
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
        <div className="p-4 border-t border-[#5D3A1A]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#8B4513] text-white rounded-xl font-semibold hover:bg-[#A0522D] transition-all duration-300 transform hover:scale-105"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
