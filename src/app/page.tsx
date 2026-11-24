'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import { playClickSound } from '@/lib/sound-effects'
import GoogleTranslate from '@/components/GoogleTranslate'
import RatingBadge from '@/components/RatingBadge'
import Loader from '@/components/Loader'
import { Dish } from '@/types'

export default function Home() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedFoodType, setSelectedFoodType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [dishRatings, setDishRatings] = useState<{ [key: string]: { averageRating: number; totalRatings: number } }>({})
  const [userRatings, setUserRatings] = useState<{ [key: string]: number }>({})
  const [minLoaderTimeDone, setMinLoaderTimeDone] = useState(false)

  useEffect(() => {
    fetchDishes()
    // Keep the branded loader visible for a minimum of ~5 seconds
    const timer = setTimeout(() => setMinLoaderTimeDone(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Load ratings for all dishes
    if (dishes.length > 0) {
      dishes.forEach(dish => {
        fetchDishRating(dish.id)
      })
    }
  }, [dishes])

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

  const fetchDishRating = async (dishId: string) => {
    try {
      const response = await fetch(`/api/ratings?dish_id=${dishId}`)
      const data = await response.json()
      setDishRatings(prev => ({
        ...prev,
        [dishId]: {
          averageRating: data.averageRating || 0,
          totalRatings: data.totalRatings || 0
        }
      }))
    } catch (error) {
      console.error('Error fetching rating:', error)
      // Set default 0 rating on error
      setDishRatings(prev => ({
        ...prev,
        [dishId]: {
          averageRating: 0,
          totalRatings: 0
        }
      }))
    }
  }

  const handleRating = async (dishId: string, rating: number) => {
    try {
      playClickSound()
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId, rating })
      })

      if (response.ok) {
        setUserRatings(prev => ({ ...prev, [dishId]: rating }))
        fetchDishRating(dishId) // Refresh the average rating
      }
    } catch (error) {
      console.error('Error saving rating:', error)
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
    <div className="min-h-screen bg-gray-100">
      {/* Full-screen loader while menu data loads (min ~5s, covers PWA shortcut launch) */}
      {(loading || !minLoaderTimeDone) && <Loader />}

      {/* Hero Section */}
      <div className="relative h-screen w-full overflow-hidden">
        {/* Hero Background Image */}
        <div className="absolute inset-0 bg-black/60">
          <img
            src="/images/chicken-thali.jpg"
            alt="Dhole Patil Khanawal - Chicken Thali"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"></div>
        </div>

        {/* Content Overlay - Centered like Zomato */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          {/* Restaurant Name - warm brown matching the logo */}
          <h1 className="text-6xl md:text-8xl font-bold text-[#D4A574] mb-2 tracking-tight drop-shadow-lg">
            Dhole Patil Khanawal
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold text-[#D4A574] mb-4 drop-shadow-lg">
            ढोले पाटील खानावळ
          </h2>
          <p className="text-xl md:text-2xl text-white mb-2 font-light">
            Maharashtra's #1
          </p>
          <p className="text-2xl md:text-3xl text-white mb-8 font-bold">
            Veg & Non Veg
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
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all min-w-[200px] justify-center shadow-2xl font-bold"
            >
              Instagram
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all min-w-[200px] justify-center shadow-2xl font-bold"
            >
              WhatsApp
            </a>
          </div>
        </div>



        {/* Google Translate */}
        <div className="absolute top-4 right-4">
          <GoogleTranslate variant="white" />
        </div>

        {/* Logo - top left corner */}
        <div className="absolute top-4 left-4">
          <img
            src="/dhole%20patil%20logo-03.png"
            alt="Dhole Patil Khanawal Logo"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-[#D4A574] shadow-lg bg-white/10 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Full Menu Section - Professional & Modern */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Menu Header */}
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3 tracking-tight">
              Our Menu
            </h2>
            <p className="text-lg text-gray-600 font-medium">
              Experience the authentic taste of Maharashtra
            </p>
          </div>

          {/* Search Bar - Modern Design */}
          <div className="w-full max-w-3xl mx-auto mb-8">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search for dishes, ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] bg-white text-gray-800 text-base placeholder-gray-400 shadow-sm hover:shadow-md transition-all duration-300"
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
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    selectedFoodType === 'veg'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Veg
                </button>
                <button
                  onClick={() => { playClickSound(); setSelectedFoodType('nonveg') }}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    selectedFoodType === 'nonveg'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Non-Veg
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Category Pills - Zomato Style */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 snap-x">
              {categories.map((category, index) => {
                const count = dishes?.filter(d => d.category === category).length || 0

                return (
                  <button
                    key={category}
                    onClick={() => { playClickSound(); setSelectedCategory(category) }}
                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg snap-start ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-[#5D3A1A] shadow-xl ring-2 ring-[#FFD700] ring-offset-2'
                        : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md border border-gray-200'
                    }`}
                  >
                    <span className="capitalize">{category.replace(/&/g, '& ')}</span>
                    {count > 0 && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
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

          {/* Results Count - Professional */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
              <p className="text-gray-700 text-sm font-medium">
                <span className="font-bold text-[#8B4513]">{filteredDishes.length}</span>
                <span className="ml-1">{filteredDishes.length === 1 ? 'item' : 'items'}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-500">Selected: {selectedCategory === 'all' ? 'All Categories' : selectedCategory}</span>
              </p>
            </div>
          </div>

          {/* Menu Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#FFD700] border-t-transparent mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading delicious dishes...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredDishes.map(dish => (
                <div
                  key={dish.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
                >
                  {/* Image Container with Zoom Effect */}
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    <img
                      src={imageErrors.has(dish.id) || !dish.image_url ? '/images/cooking-service.jpg' : dish.image_url}
                      alt={dish.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={() => handleImageError(dish.id)}
                      loading="lazy"
                    />

                    {/* Food Type Badge - Top Left */}
                    <div className="absolute top-2 left-2">
                      {getFoodTypeIcon(dish.food_type, 'small')}
                    </div>

                    {/* Offer Badge - Top Right */}
                    {dish.offer && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:shadow-xl transition-shadow">
                          <span>{dish.offer}</span>
                        </div>
                      </div>
                    )}

                    {/* Out of Stock Badge - Top Right (shows if no offer) */}
                    {!dish.is_available && !dish.offer && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          Out of Stock
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Dish Name */}
                    <h3 className="text-base font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-[#8B4513] transition-colors">
                      {dish.name}
                    </h3>
                    {dish.marathi_name && (
                      <p className="text-sm text-gray-600 line-clamp-1 mb-2">{dish.marathi_name}</p>
                    )}

                    {/* Professional Rating Badge - Zomato Style */}
                    <div className="mb-2">
                      <RatingBadge
                        rating={dishRatings[dish.id]?.averageRating || 0}
                        totalRatings={dishRatings[dish.id]?.totalRatings || 0}
                        size="small"
                        interactive={true}
                        onRate={(rating) => handleRating(dish.id, rating)}
                        userRating={userRatings[dish.id]}
                      />
                    </div>

                    {/* Price Section */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
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
              <p className="text-gray-800 text-xl font-semibold mb-2">No dishes found</p>
              <p className="text-gray-600">Try adjusting your filters or search query</p>
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
                  className="text-gray-700 hover:text-purple-600 transition-colors bg-gray-100 px-6 py-3 rounded-lg hover:bg-purple-50 w-full sm:w-auto justify-center font-semibold"
                >
                  Instagram
                </a>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-green-600 transition-colors bg-gray-100 px-6 py-3 rounded-lg hover:bg-green-50 w-full sm:w-auto justify-center font-semibold"
                >
                  WhatsApp
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
              className="text-[#F5F5DC] hover:text-[#FFD700] transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5F5DC] hover:text-[#FFD700] transition-colors"
            >
              WhatsApp
            </a>
          </div>
          <p className="text-sm text-gray-400">© 2024 Dhole Patil Khanawal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
