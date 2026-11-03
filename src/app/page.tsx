'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowDown, Image as ImageIcon, MessageCircle, Star, Search } from 'lucide-react'
import { playClickSound } from '@/lib/sound-effects'
import GoogleTranslate from '@/components/GoogleTranslate'
import { Dish } from '@/types'

export default function Home() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedFoodType, setSelectedFoodType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchDishes()
  }, [])

  const fetchDishes = async () => {
    try {
      const response = await fetch('/api/dishes')
      const data = await response.json()

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
    const searchMatch = searchQuery === '' ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dish.marathi_name && dish.marathi_name.toLowerCase().includes(searchQuery.toLowerCase()))
    return categoryMatch && foodTypeMatch && searchMatch
  }) || []

  const handleImageError = (dishId: string) => {
    setImageErrors(prev => new Set(prev).add(dishId))
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

  return (
    <div className="min-h-screen bg-[#8B4513]">
      {/* Hero Section with Video Background */}
      <div className="relative h-screen w-full overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 bg-black/60">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            poster="/images/chicken-handi-half.jpg"
          >
            <source src="/food-background.mp4" type="video/mp4" />
            {/* Fallback if video doesn't load */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D]"></div>
          </video>
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"></div>
        </div>

        {/* Content Overlay - Centered like Zomato */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          {/* Restaurant Name */}
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-2 tracking-tight">
            Dhole Patil Khanawal
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            ढोले पाटील खानावळ
          </h2>
          <p className="text-xl md:text-2xl text-white mb-2 font-light">
            Maharashtra's #1
          </p>
          <p className="text-2xl md:text-3xl text-white mb-8 font-bold">
            Restaurant & Bar
          </p>
          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl leading-relaxed">
            Experience authentic Maharashtrian cuisine at Dhole Patil Khanawal
          </p>

          {/* Instagram & WhatsApp Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all min-w-[200px] justify-center shadow-2xl"
            >
              <ImageIcon className="w-8 h-8" />
              <div className="text-left">
                <div className="text-xs font-light">Follow us on</div>
                <div className="text-lg font-bold">Instagram</div>
              </div>
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all min-w-[200px] justify-center shadow-2xl"
            >
              <MessageCircle className="w-8 h-8" />
              <div className="text-left">
                <div className="text-xs font-light">Chat on</div>
                <div className="text-lg font-bold">WhatsApp</div>
              </div>
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-white text-sm mb-2">Scroll down</p>
          <ArrowDown className="w-6 h-6 text-white mx-auto animate-bounce" />
        </div>

        {/* Google Translate */}
        <div className="absolute top-4 right-4">
          <GoogleTranslate variant="white" />
        </div>
      </div>

      {/* Full Menu Section - Simple & Professional */}
      <div className="min-h-screen bg-[#8B4513] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Menu Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Our Menu</h2>
            <p className="text-lg text-[#F5F5DC]">Experience the taste of Maharashtra</p>
          </div>

          {/* Search Bar */}
          <div className="w-full max-w-3xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent bg-white text-gray-800 text-base placeholder-gray-400"
              />
            </div>
          </div>

          {/* Modern Filter Section */}
          <div className="mb-8">
            {/* Food Type Segmented Control */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-gray-100 rounded-full p-1 shadow-inner">
                <button
                  onClick={() => { playClickSound(); setSelectedFoodType('all') }}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    selectedFoodType === 'all'
                      ? 'bg-white text-gray-800 shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { playClickSound(); setSelectedFoodType('veg') }}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                    selectedFoodType === 'veg'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  Veg
                </button>
                <button
                  onClick={() => { playClickSound(); setSelectedFoodType('nonveg') }}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                    selectedFoodType === 'nonveg'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                  Non-Veg
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Category Pills */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 snap-x">
              {categories.map((category, index) => {
                const categoryIcons: { [key: string]: string } = {
                  'all': '🍽️',
                  'non-veg': '🍗',
                  'veg': '🥗',
                  'rice & biryani': '🍚',
                  'thali': '🍱',
                  'roti & bread': '🫓',
                  'starters & sides': '🥘',
                  'special cooking service': '👨‍🍳'
                }
                const icon = categoryIcons[category] || '🍽️'
                const count = dishes?.filter(d => d.category === category).length || 0

                return (
                  <button
                    key={category}
                    onClick={() => { playClickSound(); setSelectedCategory(category) }}
                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 snap-start ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-[#5D3A1A] shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="capitalize">{category.replace(/&/g, '& ')}</span>
                    {count > 0 && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        selectedCategory === category
                          ? 'bg-[#5D3A1A] text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6 text-center">
            <p className="text-gray-300 text-sm">
              Showing {filteredDishes.length} {filteredDishes.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          {/* Menu Grid */}
          {loading ? (
            <div className="text-center py-20">
              <p className="text-white text-lg">Loading menu...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredDishes.map(dish => (
                <div key={dish.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  {/* Image Container */}
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    <img
                      src={imageErrors.has(dish.id) || !dish.image_url ? '/images/cooking-service.jpg' : dish.image_url}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(dish.id)}
                      loading="lazy"
                    />

                    {!dish.is_available && (
                      <div className="absolute top-2 right-2">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      {getFoodTypeIcon(dish.food_type, 'small')}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-base font-bold text-gray-800 line-clamp-2 mb-1">{dish.name}</h3>
                    {dish.marathi_name && (
                      <p className="text-sm text-gray-600 line-clamp-1 mb-2">{dish.marathi_name}</p>
                    )}

                    {/* Star Rating */}
                    {dish.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(dish.rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : i < dish.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-yellow-400 text-xs font-semibold ml-1">{dish.rating}</span>
                      </div>
                    )}

                    {/* Offer Badge - Zomato Style */}
                    {dish.offer && (
                      <div className="mb-2">
                        <div className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                          <span className="animate-pulse">⚡</span>
                          <span>{dish.offer}</span>
                        </div>
                      </div>
                    )}

                    {/* Price with Discount */}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {dish.category.charAt(0).toUpperCase() + dish.category.slice(1)}
                      </span>
                      <div className="flex items-center gap-2">
                        {dish.offer_discount && (
                          <span className="text-sm text-gray-400 line-through">
                            ₹{Math.round(dish.price / (1 - dish.offer_discount / 100))}
                          </span>
                        )}
                        <span className="text-lg font-bold text-[#8B4513]">
                          ₹{dish.price.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredDishes.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-white text-xl font-semibold mb-2">No dishes found</p>
              <p className="text-gray-300">Try adjusting your filters or search query</p>
            </div>
          )}

          {/* Social Media Links Section */}
          <div className="mt-12 mb-8">
            <div className="bg-white rounded-xl p-6 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Connect With Us</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors bg-gray-100 px-6 py-3 rounded-lg hover:bg-purple-50 w-full sm:w-auto justify-center"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="font-semibold">Instagram</span>
                </a>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors bg-gray-100 px-6 py-3 rounded-lg hover:bg-green-50 w-full sm:w-auto justify-center"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-semibold">WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#5D3A1A] text-white py-12 border-t border-[#FFD700]/30">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <img src="/logo.png" alt="Dhole Patil Khanawal" className="w-20 h-20 rounded-full object-cover border-3 border-[#FFD700] mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">ढोले पाटील खानावळ</h3>
          <p className="text-[#F5F5DC] mb-6">Authentic Maharashtrian Cuisine</p>
          <div className="flex items-center justify-center gap-6 mb-6">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#F5F5DC] hover:text-[#FFD700] transition-colors"
            >
              <ImageIcon className="w-6 h-6" />
              <span>Instagram</span>
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#F5F5DC] hover:text-[#FFD700] transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span>WhatsApp</span>
            </a>
          </div>
          <p className="text-sm text-gray-400">© 2024 Dhole Patil Khanawal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
