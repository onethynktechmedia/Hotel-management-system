'use client'

import RatingBadge from '@/components/RatingBadge'
import RatingBreakdown from '@/components/RatingBreakdown'

export default function RatingsDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Professional Rating UI</h1>
          <p className="text-gray-600">Zomato-style rating components with modern design</p>
        </div>

        {/* Rating Badges Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Rating Badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Small Size */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Small Size</h3>
              <div className="space-y-4">
                <RatingBadge rating={4.5} totalRatings={1234} size="small" />
                <RatingBadge rating={3.8} totalRatings={567} size="small" />
                <RatingBadge rating={2.5} totalRatings={89} size="small" />
              </div>
            </div>

            {/* Medium Size */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Medium Size</h3>
              <div className="space-y-4">
                <RatingBadge rating={4.8} totalRatings={5678} size="medium" />
                <RatingBadge rating={4.2} totalRatings={2345} size="medium" />
                <RatingBadge rating={3.5} totalRatings={456} size="medium" />
              </div>
            </div>

            {/* Large Size */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Large Size</h3>
              <div className="space-y-4">
                <RatingBadge rating={4.9} totalRatings={12345} size="large" />
                <RatingBadge rating={4.3} totalRatings={7890} size="large" />
                <RatingBadge rating={3.7} totalRatings={1234} size="large" />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Rating */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Interactive Rating</h2>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <p className="text-gray-600 mb-4">Click on the stars to rate:</p>
            <RatingBadge
              rating={0}
              totalRatings={0}
              size="large"
              interactive={true}
              onRate={(rating) => console.log('Rated:', rating)}
              showInfo={true}
            />
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Rating Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RatingBreakdown rating={4.5} totalRatings={1234} />
            <RatingBreakdown rating={3.8} totalRatings={567} />
          </div>
        </div>

        {/* Color Variations */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Rating Color Variations</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
              <RatingBadge rating={4.8} totalRatings={1000} size="large" />
              <p className="text-sm text-gray-600 mt-2">Excellent (4.0+)</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
              <RatingBadge rating={3.7} totalRatings={800} size="large" />
              <p className="text-sm text-gray-600 mt-2">Good (3.5+)</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
              <RatingBadge rating={3.2} totalRatings={600} size="large" />
              <p className="text-sm text-gray-600 mt-2">Average (3.0+)</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
              <RatingBadge rating={2.5} totalRatings={400} size="large" />
              <p className="text-sm text-gray-600 mt-2">Poor (2.0+)</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
              <RatingBadge rating={1.5} totalRatings={200} size="large" />
              <p className="text-sm text-gray-600 mt-2">Very Poor (<2.0)</p>
            </div>
          </div>
        </div>

        {/* Full Card Example */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Menu Card Example</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Chicken Biryani', rating: 4.7, ratings: 2345, price: 350, image: '🍗' },
              { name: 'Paneer Tikka', rating: 4.5, ratings: 1876, price: 280, image: '🥘' },
              { name: 'Butter Chicken', rating: 4.8, ratings: 3456, price: 380, image: '🍛' }
            ].map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-8xl">
                  {item.image}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{item.name}</h3>
                  <RatingBadge
                    rating={item.rating}
                    totalRatings={item.ratings}
                    size="small"
                    interactive={true}
                    onRate={(rating) => console.log(`Rated ${item.name}:`, rating)}
                  />
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                      Non-Veg
                    </span>
                    <span className="text-lg font-bold text-[#8B4513]">
                      ₹{item.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
