'use client'

import { Star, Info } from 'lucide-react'
import { useState } from 'react'

interface RatingBadgeProps {
  rating: number
  totalRatings: number
  size?: 'small' | 'medium' | 'large'
  interactive?: boolean
  onRate?: (rating: number) => void
  userRating?: number
  showBreakdown?: boolean
  showInfo?: boolean
}

export default function RatingBadge({
  rating,
  totalRatings,
  size = 'medium',
  interactive = false,
  onRate,
  userRating,
  showBreakdown = false,
  showInfo = false
}: RatingBadgeProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  const sizeClasses = {
    small: {
      container: 'text-xs px-2 py-1',
      star: 'w-3 h-3',
      text: 'text-xs'
    },
    medium: {
      container: 'text-sm px-3 py-1.5',
      star: 'w-4 h-4',
      text: 'text-sm'
    },
    large: {
      container: 'text-base px-4 py-2',
      star: 'w-5 h-5',
      text: 'text-base'
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating === 0) return 'bg-gray-400'
    if (rating >= 4.0) return 'bg-green-600'
    if (rating >= 3.5) return 'bg-green-500'
    if (rating >= 3.0) return 'bg-yellow-500'
    if (rating >= 2.0) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const displayRating = hoverRating !== null ? hoverRating : (userRating !== undefined ? userRating : rating)

  const renderStars = () => {
    return [...Array(5)].map((_, i) => {
      const starValue = i + 1
      const isFilled = starValue <= Math.floor(displayRating)
      const isHalf = !isFilled && starValue < displayRating + 0.5

      return (
        <button
          key={i}
          onClick={() => interactive && onRate?.(starValue)}
          onMouseEnter={() => interactive && setHoverRating(starValue)}
          onMouseLeave={() => interactive && setHoverRating(null)}
          disabled={!interactive}
          className={`transition-all duration-300 ${
            interactive
              ? 'hover:scale-125 hover:rotate-12 cursor-pointer disabled:cursor-default active:scale-95'
              : 'cursor-default'
          }`}
          title={`${starValue} star${starValue > 1 ? 's' : ''}`}
        >
          <Star
            className={`${sizeClasses[size].star} ${
              isFilled
                ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm filter drop-shadow-lg'
                : isHalf
                ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm filter drop-shadow-lg'
                : 'text-gray-300'
            }`}
          />
        </button>
      )
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Rating Badge - Zomato Style */}
      {totalRatings > 0 ? (
        <div
          className={`flex items-center gap-1.5 rounded-lg font-bold text-white shadow-md ${getRatingColor(displayRating)} ${sizeClasses[size].container}`}
        >
          <Star className={`${sizeClasses[size].star} fill-white text-white`} />
          <span className={sizeClasses[size].text}>{displayRating.toFixed(1)}</span>
        </div>
      ) : (
        <div
          className={`flex items-center gap-1.5 rounded-lg font-bold text-gray-500 shadow-sm ${sizeClasses[size].container} bg-gray-100 border border-gray-300`}
        >
          <Star className={`${sizeClasses[size].star} text-gray-400`} />
          <span className={sizeClasses[size].text}>No ratings</span>
        </div>
      )}

      {/* Rating Count */}
      <div className={`text-gray-500 ${sizeClasses[size].text}`}>
        {totalRatings > 0 && (
          <span>({totalRatings.toLocaleString()})</span>
        )}
      </div>

      {/* Info Tooltip */}
      {showInfo && (
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Info className={`w-4 h-4 ${sizeClasses[size].text}`} />
          </button>
          {showTooltip && (
            <div className="absolute left-0 top-full mt-2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-50 w-48">
              <p className="font-medium mb-1">Rating Breakdown</p>
              <p className="text-gray-300">Based on {totalRatings} user reviews</p>
              <div className="absolute left-3 -top-1 w-2 h-2 bg-gray-800 transform rotate-45" />
            </div>
          )}
        </div>
      )}

      {/* Interactive Stars */}
      {interactive && (
        <div className="flex items-center gap-0.5">
          {renderStars()}
        </div>
      )}

      {/* Call to action for no ratings */}
      {interactive && totalRatings === 0 && (
        <span className={`text-xs text-gray-400 ${sizeClasses[size].text}`}>
          Be the first to rate!
        </span>
      )}

      {/* Rating Breakdown */}
      {showBreakdown && totalRatings > 0 && (
        <div className="flex flex-col gap-1 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-6">5★</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: '70%' }}
              />
            </div>
            <span className="text-gray-500">70%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6">4★</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full"
                style={{ width: '20%' }}
              />
            </div>
            <span className="text-gray-500">20%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6">3★</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full"
                style={{ width: '7%' }}
              />
            </div>
            <span className="text-gray-500">7%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6">2★</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full"
                style={{ width: '2%' }}
              />
            </div>
            <span className="text-gray-500">2%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6">1★</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-400 rounded-full"
                style={{ width: '1%' }}
              />
            </div>
            <span className="text-gray-500">1%</span>
          </div>
        </div>
      )}
    </div>
  )
}
