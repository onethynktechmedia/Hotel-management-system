'use client'

import { useState } from 'react'

export default function AddSampleRatings() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const addSampleRatings = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Fetch all dishes
      const dishesResponse = await fetch('/api/dishes')
      const dishes = await dishesResponse.json()

      if (!Array.isArray(dishes)) {
        throw new Error('Failed to fetch dishes')
      }

      // Add random ratings for each dish
      let totalRatingsAdded = 0

      for (const dish of dishes) {
        const numRatings = Math.floor(Math.random() * 30) + 10 // 10-40 ratings per dish

        for (let i = 0; i < numRatings; i++) {
          const rating = Math.floor(Math.random() * 3) + 3 // 3-5 stars

          try {
            await fetch('/api/ratings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dish_id: dish.id,
                rating
              })
            })
            totalRatingsAdded++
          } catch (error) {
            console.error(`Error adding rating for ${dish.name}:`, error)
          }
        }
      }

      setMessage(`✅ Successfully added ${totalRatingsAdded} sample ratings to ${dishes.length} dishes!`)
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Error adding sample ratings. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Add Sample Ratings</h1>
          <p className="text-gray-600 mb-6">
            This will add random ratings (3-5 stars) to all dishes in your menu.
            This is useful for testing the rating UI.
          </p>

          <button
            onClick={addSampleRatings}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-[#5D3A1A] font-bold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding Ratings...' : 'Add Sample Ratings'}
          </button>

          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Note</h3>
            <p className="text-sm text-yellow-700">
              This will add sample data to your database. Use this only for testing purposes.
              To remove these ratings, you'll need to delete them from the Supabase dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
