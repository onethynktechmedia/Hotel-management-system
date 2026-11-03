'use client'

import { useEffect, useState } from 'react'

export default function Loader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D] z-50">
      <div className="flex flex-col items-center space-y-8">
        {/* 3D Rotating Logo */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white opacity-10 blur-3xl animate-pulse" />
          <div className="relative">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl border-2 border-white/20">
              <div className="relative">
                {/* 3D Rotation Animation */}
                <div className="animate-spin3d">
                  <img
                    src="/logo.png"
                    alt="Loading"
                    className="w-24 h-24 md:w-36 md:h-36 object-contain drop-shadow-2xl"
                  />
                </div>
                {/* Orbiting Ring */}
                <div className="absolute inset-0 border-4 border-white/30 rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-white/20 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider animate-fade-in-custom">
            Dhole Patil Khanawal
          </h1>
          <p className="text-white/80 text-sm md:text-base animate-fade-in-delayed">
            Restaurant & Bar
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 md:w-80 space-y-2">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-center text-white/70 text-sm">
            {Math.min(Math.round(progress), 100)}%
          </p>
        </div>

        {/* Loading Dots */}
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce-custom" />
          <div className="w-3 h-3 bg-white rounded-full animate-bounce-custom" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-white rounded-full animate-bounce-custom" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}
