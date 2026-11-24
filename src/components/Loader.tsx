'use client'

import { useEffect, useState } from 'react'

export default function Loader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Steady progress that reaches 100% in ~5 seconds.
    // The loader is hidden by the parent once real data has loaded
    // (and a minimum display time has passed).
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 100 / 25 // 200ms * 25 ticks = ~5s
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D] z-50">
      <div className="flex flex-col items-center space-y-8">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Dhole Patil Khanawal"
          className="w-56 h-56 md:w-80 md:h-80 object-contain drop-shadow-2xl"
        />

        {/* Loading Text */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider">
            Dhole Patil Khanawal
          </h1>
          <p className="text-white/80 text-sm md:text-base">
            Veg & Non Veg
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 md:w-80 space-y-2">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-white rounded-full transition-all duration-200 ease-out shadow-lg"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-center text-white/70 text-sm">
            {Math.min(Math.round(progress), 100)}%
          </p>
        </div>
      </div>
    </div>
  )
}
