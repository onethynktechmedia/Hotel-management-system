'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dish } from '@/types'

export default function MenuPage() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDishes()
  }, [])

  const fetchDishes = async () => {
    try {
      const response = await fetch('/api/dishes')
      const data = await response.json()
      setDishes(data)
    } catch (error) {
      console.error('Error fetching dishes:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(dishes.map(dish => dish.category)))]
  const filteredDishes = selectedCategory === 'all' 
    ? dishes 
    : dishes.filter(dish => dish.category === selectedCategory)

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

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'starter': '🥗',
      'starters': '🥗',
      'main course': '🍛',
      'dessert': '🍮',
      'desserts': '🍮',
      'beverage': '🥤',
      'bread': '🫓',
      'sides': '🥗',
    }
    return icons[category.toLowerCase()] || '🍽️'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-xl">Loading menu...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-green-700">
                Hotel Management
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Home
              </Link>
              <Link href="/menu" className="text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Menu
              </Link>
              <Link href="/login" className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Our Menu</h1>
          <p className="text-xl text-gray-600">Explore our delicious dishes</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-green-100'
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
                  <h3 className="text-sm sm:text-base md:text-xl font-bold text-gray-900 line-clamp-1">{dish.name}</h3>
                  <span className="text-sm sm:text-base md:text-2xl font-bold text-green-600">
                    ₹{dish.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-green-600 mb-1 flex items-center gap-1">
                  <span>{getCategoryIcon(dish.category)}</span>
                  {dish.category}
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
            <p className="text-gray-500 text-lg">No dishes available in this category</p>
          </div>
        )}
      </main>
    </div>
  )
}
