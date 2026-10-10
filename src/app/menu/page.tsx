'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dish } from '@/types'
import { Menu as MenuIcon, X } from 'lucide-react'
import { playClickSound } from '@/lib/sound-effects'
import GoogleTranslate from '@/components/GoogleTranslate'

export default function MenuPage() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedFoodType, setSelectedFoodType] = useState<string>('all')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchDishes()
  }, [])

  const fetchDishes = async () => {
    try {
      const response = await fetch('/api/dishes')
      const data = await response.json()
      
      // Check if data is an array before setting
      if (Array.isArray(data)) {
        setDishes(data)
      } else {
        console.error('Invalid data format:', data)
        setDishes([])
      }
    } catch (error) {
      console.error('Error fetching dishes:', error)
      setDishes([])
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(dishes?.map(dish => dish.category) || []))]
  const filteredDishes = dishes?.filter(dish => {
    const categoryMatch = selectedCategory === 'all' || dish.category === selectedCategory
    const foodTypeMatch = selectedFoodType === 'all' || dish.food_type === selectedFoodType
    return categoryMatch && foodTypeMatch
  }) || []

  const handleImageError = (dishId: string) => {
    setImageErrors(prev => new Set(prev).add(dishId))
  }

  const getPlaceholderImage = (category: string) => {
    const categoryImages: { [key: string]: string } = {
      'starter': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&h=300&fit=crop',
      'starters': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&h=300&fit=crop',
      'main course': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
      'dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      'desserts': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      'beverage': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
      'bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
      'sides': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    }
    return categoryImages[category.toLowerCase()] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'
  }

  const getFoodTypeIcon = (foodType?: string, size: 'small' | 'large' = 'small') => {
    const sizeClass = size === 'small' ? 'w-5 h-5' : 'w-6 h-6'
    const dotSize = size === 'small' ? 'w-2.5 h-2.5' : 'w-3 h-3'

    if (foodType === 'veg') {
      return (
        <div className={`${sizeClass} flex items-center justify-center border-2 border-green-600 bg-green-50 rounded-sm`}>
          <div className={`${dotSize} bg-green-600 rounded-full`}></div>
        </div>
      )
    } else if (foodType === 'nonveg') {
      return (
        <div className={`${sizeClass} flex items-center justify-center border-2 border-red-600 bg-red-50 rounded-sm`}>
          <div className={`${dotSize} bg-red-600 rounded-full`}></div>
        </div>
      )
    } else if (foodType === 'custom' || foodType === 'parcel') {
      return (
        <div className={`${sizeClass} flex items-center justify-center border-2 border-blue-600 bg-blue-50 rounded-sm`}>
          <span className="text-xs font-bold text-blue-600">C</span>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center px-4">
        <div className="text-xl text-[#5D3A1A]">Loading menu...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Dhole Patil Hotel Logo" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div className="flex flex-col">
                <Link href="/" className="text-xl font-bold text-[#5D3A1A] leading-tight">
                  Dhole Patil
                </Link>
                <p className="text-sm text-gray-600 leading-tight font-semibold">Khanawal</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <GoogleTranslate variant="white" />
              <Link href="/" onClick={() => playClickSound()} className="text-gray-700 hover:text-[#5D3A1A] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Home
              </Link>
              <Link href="/menu" className="text-[#5D3A1A] px-3 py-2 rounded-md text-sm font-medium">
                Menu
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <GoogleTranslate variant="white" />
              <button
                onClick={() => { playClickSound(); setIsMobileMenuOpen(!isMobileMenuOpen) }}
                className="p-2 rounded-lg text-gray-700 hover:text-[#5D3A1A] hover:bg-[#F5F5DC] transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-3 space-y-2">
              <Link
                href="/"
                onClick={() => { playClickSound(); setIsMobileMenuOpen(false) }}
                className="block text-gray-700 hover:text-[#5D3A1A] hover:bg-[#F5F5DC] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/menu"
                onClick={() => { playClickSound(); setIsMobileMenuOpen(false) }}
                className="block text-[#5D3A1A] bg-[#F5F5DC] px-3 py-2 rounded-md text-sm font-medium"
              >
                Menu
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Menu</h1>
          <p className="text-xl text-gray-600">Menu Management</p>
        </div>

        {/* Food Type Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={() => { playClickSound(); setSelectedFoodType('all') }}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              selectedFoodType === 'all'
                ? 'bg-[#5D3A1A] text-white scale-105 shadow-md'
                : 'bg-white text-gray-700 hover:bg-[#F5F5DC]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { playClickSound(); setSelectedFoodType('veg') }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              selectedFoodType === 'veg'
                ? 'bg-green-600 text-white scale-105 shadow-md'
                : 'bg-white text-green-700 hover:bg-green-50'
            }`}
          >
            <div className="w-4 h-4 flex items-center justify-center border-2 border-green-600 bg-green-50 rounded-sm">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            </div>
            VEG
          </button>
          <button
            onClick={() => { playClickSound(); setSelectedFoodType('nonveg') }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              selectedFoodType === 'nonveg'
                ? 'bg-red-600 text-white scale-105 shadow-md'
                : 'bg-white text-red-700 hover:bg-red-50'
            }`}
          >
            <div className="w-4 h-4 flex items-center justify-center border-2 border-red-600 bg-red-50 rounded-sm">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            </div>
            NON-VEG
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => { playClickSound(); setSelectedCategory(category) }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#5D3A1A] text-white'
                  : 'bg-white text-gray-700 hover:bg-[#F5F5DC]'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDishes.map(dish => (
            <div key={dish.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-40 sm:h-48 md:h-56 overflow-hidden bg-gray-100">
                <img 
                  src={imageErrors.has(dish.id) || !dish.image_url ? getPlaceholderImage(dish.category) : dish.image_url}
                  alt={dish.name}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(dish.id)}
                  loading="lazy"
                />
                {!dish.is_available && (
                  <div className="absolute top-2 right-2">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getFoodTypeIcon(dish.food_type)}
                      <h3 className="text-sm sm:text-base md:text-xl font-bold text-gray-900 line-clamp-1">{dish.name}</h3>
                    </div>
                  </div>
                  <span className="text-sm sm:text-base md:text-2xl font-bold text-[#5D3A1A]">
                    ₹{dish.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#8B4513] mb-1">
                  {dish.category.charAt(0).toUpperCase() + dish.category.slice(1)}
                </p>
                {dish.description && (
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{dish.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredDishes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No data found</p>
          </div>
        )}
      </main>
    </div>
  )
}
