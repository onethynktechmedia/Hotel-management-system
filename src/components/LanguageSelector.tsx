'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Languages } from 'lucide-react'

interface LanguageSelectorProps {
  variant?: 'brown' | 'white'
}

export default function LanguageSelector({ variant = 'brown' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage()

  const languages = [
    { code: 'en' as const, name: 'English' },
    { code: 'mr' as const, name: 'Marathi' },
    { code: 'hi' as const, name: 'Hindi' },
  ]

  const buttonBg = variant === 'brown' ? 'bg-white/10 hover:bg-white/20' : 'bg-[#F5F5DC] hover:bg-[#DEB887]'
  const buttonText = variant === 'brown' ? 'text-white' : 'text-[#5D3A1A]'

  return (
    <div className="relative group">
      <button className={`flex items-center gap-2 ${buttonBg} px-3 py-2 rounded-lg transition-all ${buttonText}`}>
        <Languages className="w-4 h-4" />
        <span className="text-sm font-medium">{language.toUpperCase()}</span>
      </button>
      <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`w-full text-left px-4 py-2 text-sm font-medium transition-all hover:bg-gray-100 ${
              language === lang.code ? 'bg-gray-100 text-[#8B4513]' : 'text-gray-700'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  )
}
