'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { playClickSound } from '@/lib/sound-effects'

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Dhole Patil Hotel Logo" className="w-10 h-10 rounded-full object-cover" />
              <h1 className="text-2xl font-bold text-[#5D3A1A]">
                Dhole Patil Khanawal
              </h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/menu" onClick={() => playClickSound()} className="bg-[#5D3A1A] text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-[#8B4513] transition-colors">
                View Menu
              </Link>
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => { playClickSound(); setIsMobileMenuOpen(!isMobileMenuOpen) }}
                className="p-2 rounded-lg text-gray-700 hover:text-[#5D3A1A] hover:bg-[#F5F5DC] transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-3 space-y-2">
              <Link
                href="/menu"
                onClick={() => { playClickSound(); setIsMobileMenuOpen(false) }}
                className="block bg-[#5D3A1A] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#8B4513] transition-colors"
              >
                View Menu
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-[#5D3A1A] rounded-2xl p-12 mb-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src="/logo.png" alt="Dhole Patil Hotel Logo" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10">
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6">
              Welcome to Dhole Patil Khanawal
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              Experience delicious food with our modern ordering system
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 text-[#5D3A1A]">Digital Menu</h3>
              <p className="text-gray-600 mb-4">Browse our delicious dishes with prices and descriptions</p>
              <Link href="/menu" onClick={() => playClickSound()} className="inline-block bg-[#5D3A1A] text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-[#8B4513] transition-colors">
                Explore Menu
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 text-[#5D3A1A]">Smart Kitchen</h3>
              <p className="text-gray-600">Real-time order tracking and kitchen management</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 text-[#5D3A1A]">Easy Billing</h3>
              <p className="text-gray-600">Seamless payment processing and order management</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/menu" onClick={() => playClickSound()} className="inline-block bg-white text-[#5D3A1A] px-8 py-4 rounded-lg text-lg font-medium hover:bg-[#F5F5DC] transition-colors shadow-md">
              View Our Menu
            </Link>
          </div>
      </main>
    </div>
  )
}
