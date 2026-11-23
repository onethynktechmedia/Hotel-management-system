'use client'

import { Star } from 'lucide-react'

interface RatingBreakdownProps {
  rating: number
  totalRatings: number
  distribution?: {
    five: number
    four: number
    three: number
    two: number
    one: number
  }
}

export default function RatingBreakdown({
  rating,
  totalRatings,
  distribution = { five: 70, four: 20, three: 7, two: 2, one: 1 }
}: RatingBreakdownProps) {
  const getRatingColor = (rating: number) => {
    if (rating >= 4.0) return 'bg-green-600'
    if (rating >= 3.5) return 'bg-green-500'
    if (rating >= 3.0) return 'bg-yellow-500'
    if (rating >= 2.0) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getBarColor = (stars: number) => {
    if (stars >= 4) return 'bg-green-500'
    if (stars === 3) return 'bg-yellow-500'
    if (stars === 2) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      {/* Overall Rating Display */}
      <div className="flex items-center gap-6 mb-6">
        <div
          className={`flex items-center justify-center w-20 h-20 rounded-2xl text-white font-bold text-3xl shadow-lg ${getRatingColor(rating)}`}
        >
          {rating.toFixed(1)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.floor(rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-gray-600 text-sm">
            {totalRatings.toLocaleString()} {totalRatings === 1 ? 'rating' : 'ratings'}
          </p>
        </div>
      </div>

      {/* Rating Breakdown Bars */}
      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map((stars) => {
          const percentage = distribution[
            stars === 5 ? 'five' :
            stars === 4 ? 'four' :
            stars === 3 ? 'three' :
            stars === 2 ? 'two' : 'one'
          ]

          return (
            <div key={stars} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-12 text-sm font-medium text-gray-700">
                <span>{stars}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              </div>
              <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(stars)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-12 text-right text-sm text-gray-500">
                {percentage}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Rating Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {distribution.five + distribution.four}%
            </div>
            <div className="text-xs text-gray-500">Excellent</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {distribution.three}%
            </div>
            <div className="text-xs text-gray-500">Good</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {distribution.two + distribution.one}%
            </div>
            <div className="text-xs text-gray-500">Poor</div>
          </div>
        </div>
      </div>
    </div>
  )
}
