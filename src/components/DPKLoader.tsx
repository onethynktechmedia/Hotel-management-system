'use client'

import { useEffect, useState } from 'react'

interface DPKLoaderProps {
  onComplete?: () => void
  duration?: number
}

export default function DPKLoader({ onComplete, duration = 3000 }: DPKLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 1
      })
    }, duration / 100)

    const timeout = setTimeout(() => {
      setIsVisible(false)
      if (onComplete) onComplete()
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [duration, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#6B3E26] via-[#9A572D] to-[#D4AA7D] z-[9999] flex items-center justify-center">
      <div className="relative w-full max-w-2xl px-4">
        {/* Logo Container with 3D Effect */}
        <div className="relative flex flex-col items-center justify-center mb-8">
          {/* Glowing Effect */}
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse"></div>

          {/* Logo */}
          <div className="relative z-10 w-40 h-40 lg:w-56 lg:h-56">
            <div className="relative w-full h-full">
              {/* Rotating Ring */}
              <div className="absolute inset-0 border-4 border-white/30 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-white/20 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
              <div className="absolute inset-4 border-4 border-white/10 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>

              {/* Logo Image */}
              <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-500">
                <img
                  src="/logo.png"
                  alt="Dhole Patil Khanawal"
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Hotel Name */}
          <h1 className="relative z-10 mt-6 text-3xl lg:text-4xl font-bold text-white text-center drop-shadow-lg">
            Dhole Patil Khanawal
          </h1>
          <p className="relative z-10 mt-2 text-lg lg:text-xl text-white/90 text-center font-medium">
            Restaurant & Bar
          </p>
        </div>

        {/* Waiter Serving Animation */}
        <div className="relative h-32 lg:h-40 mb-8">
          {/* Table */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 lg:w-64 h-4 bg-white/20 rounded-lg"></div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-40 lg:w-56 h-24 lg:h-28 bg-white/30 rounded-t-lg flex items-center justify-center">
            {/* Plate with food */}
            <div className="relative w-16 h-16 lg:w-20 lg:h-20">
              <div className="absolute inset-0 bg-white/80 rounded-full shadow-lg transform rotate-12"></div>
              <div className="absolute inset-2 bg-amber-200 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-amber-600 rounded-full animate-bounce"></div>
            </div>
          </div>

          {/* Waiter */}
          <div className="absolute bottom-20 lg:bottom-24 left-1/2 transform -translate-x-1/2 animate-serve">
            <div className="relative">
              {/* Waiter Body */}
              <div className="w-12 h-16 lg:w-16 lg:h-20 bg-white/90 rounded-t-lg rounded-b-sm shadow-xl">
                {/* Head */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-10 h-10 lg:w-12 lg:h-12 bg-amber-200 rounded-full">
                  {/* Cap */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 lg:w-10 lg:h-5 bg-[#6B3E26] rounded-t-full"></div>
                </div>
                {/* Uniform details */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-[#6B3E26] rounded"></div>
              </div>

              {/* Tray with food */}
              <div className="absolute -right-8 top-2 w-8 h-8 lg:w-10 lg:h-10 bg-white/90 rounded-lg shadow-lg transform rotate-12 animate-tray">
                <div className="absolute inset-1 bg-amber-200 rounded"></div>
              </div>

              {/* Arm */}
              <div className="absolute -right-6 top-4 w-6 h-2 bg-amber-200 rounded-full transform rotate-45"></div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="relative mt-4 text-center">
          <p className="text-white/90 text-lg font-medium animate-pulse">
            Loading your experience...
          </p>
          <p className="text-white/70 text-sm mt-1">
            {progress}%
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes serve {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-10px);
          }
        }

        @keyframes tray {
          0%, 100% {
            transform: rotate(12deg);
          }
          50% {
            transform: rotate(18deg);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-serve {
          animation: serve 2s ease-in-out infinite;
        }

        .animate-tray {
          animation: tray 1s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  )
}
