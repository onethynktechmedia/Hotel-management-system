'use client'

import { useEffect, useState } from 'react'
import { Languages } from 'lucide-react'

interface GoogleTranslateProps {
  variant?: 'brown' | 'white'
}

declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: any;
        InlineLayout: {
          SIMPLE: string;
          VERTICAL: string;
          HORIZONTAL: string;
        };
      };
    };
    googleTranslateElementInit: () => void;
  }
}

export default function GoogleTranslate({ variant = 'brown' }: GoogleTranslateProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  useEffect(() => {
    // Load Google Translate script if not already loaded
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const script = document.createElement('script')
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    // Initialize function
    window.googleTranslateElementInit = () => {
      if (typeof window !== 'undefined' && window.google && window.google.translate) {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,hi,mr',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element')
        setIsScriptLoaded(true)
      }
    }

    // Check if already loaded
    if (typeof window !== 'undefined' && window.google && window.google.translate) {
      window.googleTranslateElementInit()
    }

    return () => {
      // Cleanup if needed
    }
  }, [])

  const buttonBg = variant === 'brown' ? 'bg-white/10 hover:bg-white/20' : 'bg-[#F5F5DC] hover:bg-[#DEB887]'
  const buttonText = variant === 'brown' ? 'text-white' : 'text-[#5D3A1A]'

  return (
    <div className="relative group">
      <button className={`flex items-center gap-2 ${buttonBg} px-3 py-2 rounded-lg transition-all ${buttonText}`}>
        <Languages className="w-4 h-4" />
        <span className="text-sm font-medium">Translate</span>
      </button>
      <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px] p-2">
        <div id="google_translate_element" className="goog-te-combo"></div>
      </div>
    </div>
  )
}
