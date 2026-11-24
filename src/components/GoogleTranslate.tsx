'use client'

import { useEffect, useState, useRef, useId } from 'react'
import { Languages, X } from 'lucide-react'

interface GoogleTranslateProps {
  variant?: 'brown' | 'white'
}

interface Language {
  code: string
  name: string
  nativeName: string
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
]

// Shared registry so every mounted instance gets its own translate element
const translateContainers = new Set<string>()

const getCurrentLangFromCookie = (): string => {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([^;]+)/)
  return match ? match[1] : 'en'
}

const setGoogtransCookie = (langCode: string) => {
  const domain = window.location.hostname
  const isLocalHost = domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain) || domain.endsWith('.local')

  // Host-only cookie always works (including localhost / IP addresses)
  document.cookie = `googtrans=/en/${langCode}; path=/; max-age=31536000`

  // Domain cookie only for real domains
  if (!isLocalHost) {
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}; max-age=31536000`
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${domain}; max-age=31536000`
  }
}

export default function GoogleTranslate({ variant = 'brown' }: GoogleTranslateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerId = `google_translate_element_${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  useEffect(() => {
    // Restore currently active language from cookie
    const langTimer = setTimeout(() => setSelectedLang(getCurrentLangFromCookie()), 0)

    translateContainers.add(containerId)

    const initTranslateElements = () => {
      if (typeof window === 'undefined' || !window.google?.translate) return
      translateContainers.forEach((id) => {
        const el = document.getElementById(id)
        if (el && !el.dataset.gtInitialized) {
          el.dataset.gtInitialized = '1'
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: languages.map(l => l.code).join(','),
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, id)
        }
      })
    }

    // Load Google Translate script
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      window.googleTranslateElementInit = initTranslateElements
      const script = document.createElement('script')
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    } else {
      window.googleTranslateElementInit = initTranslateElements
    }

    // Check if already loaded
    if (typeof window !== 'undefined' && window.google && window.google.translate) {
      initTranslateElements()
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      clearTimeout(langTimer)
      document.removeEventListener('mousedown', handleClickOutside)
      translateContainers.delete(containerId)
    }
  }, [containerId])

  const handleLanguageChange = (langCode: string) => {
    setSelectedLang(langCode)
    setIsOpen(false)

    // Set the googtrans cookie first so the reload picks up the new language
    setGoogtransCookie(langCode)

    // Also drive the Google Translate widget if it is available
    if (typeof window !== 'undefined' && window.google && window.google.translate) {
      const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement
      if (selectElement && selectElement.value !== langCode) {
        selectElement.value = langCode
        selectElement.dispatchEvent(new Event('change'))
      }
    }

    // Reload after a short delay so the cookie-based translation is applied
    setTimeout(() => {
      window.location.reload()
    }, 400)
  }

  const buttonBg = variant === 'brown' ? 'bg-white/10 hover:bg-white/20' : 'bg-[#F5F5DC] hover:bg-[#DEB887]'
  const buttonText = variant === 'brown' ? 'text-white' : 'text-[#6B3E26]'

  const selectedLanguage = languages.find(l => l.code === selectedLang)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${buttonBg} px-3 py-2 rounded-lg transition-all ${buttonText}`}
      >
        <Languages className="w-4 h-4" />
        <span className="text-sm font-medium">{selectedLanguage?.nativeName || 'Translate'}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[220px] p-3 max-h-[400px] overflow-y-auto">
          <div className="flex justify-between items-center mb-3 gap-2 pb-2 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Select Language</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
                  selectedLang === language.code
                    ? 'bg-[#6B3E26] text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs text-gray-500">({language.name})</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Hidden Google Translate element */}
      <div id={containerId} className="hidden"></div>
    </div>
  )
}
