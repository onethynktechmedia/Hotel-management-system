/**
 * Create Enhanced Menu Image Placeholders
 * This script creates better, more representative placeholder images for Maharashtrian food
 * Run this to generate enhanced placeholder images before adding real photos
 */

const fs = require('fs')
const path = require('path')

const menuItems = [
  {
    filename: 'chicken-handi-half.jpg',
    name: 'Chicken Handi',
    marathi: 'चिकन हंडी',
    color: '#8B4513',
    bgColor: '#FFE4C4',
    icon: '🍗',
    description: 'Traditional handi curry'
  },
  {
    filename: 'chicken-handi-full.jpg',
    name: 'Chicken Handi',
    marathi: 'चिकन हंडी',
    color: '#8B4513',
    bgColor: '#FFE4C4',
    icon: '🍗',
    description: 'Full handi portion'
  },
  {
    filename: 'chicken-thali.jpg',
    name: 'Chicken Thali',
    marathi: 'चिकन थाळी',
    color: '#CD5C5C',
    bgColor: '#FFF8DC',
    icon: '🍽️',
    description: 'Complete meal'
  },
  {
    filename: 'mutton-thali.jpg',
    name: 'Mutton Thali',
    marathi: 'मटण थाळी',
    color: '#8B0000',
    bgColor: '#FFF8DC',
    icon: '🍽️',
    description: 'Mutton complete meal'
  },
  {
    filename: 'egg-curry-fry.jpg',
    name: 'Egg Curry',
    marathi: 'अंडाकरी',
    color: '#FFA500',
    bgColor: '#FFDAB9',
    icon: '🥚',
    description: 'Spicy egg curry'
  },
  {
    filename: 'bombay-duck-curry.jpg',
    name: 'Bombay Duck',
    marathi: 'बॉम्बील',
    color: '#2F4F4F',
    bgColor: '#E0FFFF',
    icon: '🐟',
    description: 'Bombil curry'
  },
  {
    filename: 'boiled-egg.jpg',
    name: 'Boiled Egg',
    marathi: 'बॉईल अंडे',
    color: '#FFFFFF',
    bgColor: '#FFF5EE',
    icon: '🥚',
    description: 'Simple boiled eggs'
  },
  {
    filename: 'omelette.jpg',
    name: 'Omelette',
    marathi: 'ऑम्लेट',
    color: '#FFD700',
    bgColor: '#FFFACD',
    icon: '🍳',
    description: 'Fluffy omelette'
  },
  {
    filename: 'chicken-fry.jpg',
    name: 'Chicken Fry',
    marathi: 'चिकन फ्राय',
    color: '#8B4513',
    bgColor: '#FFE4B5',
    icon: '🍗',
    description: 'Crispy fried chicken'
  },
  {
    filename: 'boiled-egg-fry.jpg',
    name: 'Egg Fry',
    marathi: 'अंडे फ्राय',
    color: '#FFA500',
    bgColor: '#FFE4B5',
    icon: '🥚',
    description: 'Fried boiled eggs'
  },
  {
    filename: 'dry-fish-plate.jpg',
    name: 'Dry Fish',
    marathi: 'सुकट मासे',
    color: '#708090',
    bgColor: '#F0F8FF',
    icon: '🐟',
    description: 'Crispy dry fish'
  },
  {
    filename: 'chicken-biryani.jpg',
    name: 'Chicken Biryani',
    marathi: 'चिकन बिर्याणी',
    color: '#FFD700',
    bgColor: '#FFF8DC',
    icon: '🍚',
    description: 'Aromatic biryani'
  },
  {
    filename: 'shev-bhaji-thali.jpg',
    name: 'Shev Bhaji',
    marathi: 'शेव भाजी',
    color: '#228B22',
    bgColor: '#F0FFF0',
    icon: '🥗',
    description: 'Vegetarian thali'
  },
  {
    filename: 'vangi-masala.jpg',
    name: 'Vangi Masala',
    marathi: 'वांगी मसाला',
    color: '#800080',
    bgColor: '#E6E6FA',
    icon: '🍆',
    description: 'Brinjal curry'
  },
  {
    filename: 'paneer-masala.jpg',
    name: 'Paneer Masala',
    marathi: 'पनीर मसाला',
    color: '#FFA500',
    bgColor: '#FFF8DC',
    icon: '🧀',
    description: 'Rich paneer curry'
  },
  {
    filename: 'drumstick-curry.jpg',
    name: 'Drumstick',
    marathi: 'शेवगा भाजी',
    color: '#556B2F',
    bgColor: '#F5F5DC',
    icon: '🥬',
    description: 'Drumstick vegetable'
  },
  {
    filename: 'pithla.jpg',
    name: 'Pithla',
    marathi: 'पिठले',
    color: '#DAA520',
    bgColor: '#FFFACD',
    icon: '🥘',
    description: 'Besan curry'
  },
  {
    filename: 'zhirak.jpg',
    name: 'Zhirak',
    marathi: 'झिरक',
    color: '#556B2F',
    bgColor: '#F5F5DC',
    icon: '🥬',
    description: 'Dry vegetable'
  },
  {
    filename: 'thecha.jpg',
    name: 'Thecha',
    marathi: 'ठेचा',
    color: '#32CD32',
    bgColor: '#90EE90',
    icon: '🌶️',
    description: 'Spicy chutney'
  },
  {
    filename: 'plain-rice-full.jpg',
    name: 'Plain Rice',
    marathi: 'साधा राईस',
    color: '#F5F5DC',
    bgColor: '#FFFFF0',
    icon: '🍚',
    description: 'Steamed rice'
  },
  {
    filename: 'plain-rice-half.jpg',
    name: 'Plain Rice',
    marathi: 'साधा राईस',
    color: '#F5F5DC',
    bgColor: '#FFFFF0',
    icon: '🍚',
    description: 'Half portion rice'
  },
  {
    filename: 'jeera-rice-full.jpg',
    name: 'Jeera Rice',
    marathi: 'जिरा राईस',
    color: '#F5F5DC',
    bgColor: '#FFFFF0',
    icon: '🍚',
    description: 'Cumin rice'
  },
  {
    filename: 'jeera-rice-half.jpg',
    name: 'Jeera Rice',
    marathi: 'जिरा राईस',
    color: '#F5F5DC',
    bgColor: '#FFFFF0',
    icon: '🍚',
    description: 'Cumin rice half'
  },
  {
    filename: 'bhakri.jpg',
    name: 'Bhakri',
    marathi: 'भाकरी',
    color: '#D2691E',
    bgColor: '#FFE4C4',
    icon: '🫓',
    description: 'Jowar bread'
  },
  {
    filename: 'chapati.jpg',
    name: 'Chapati',
    marathi: 'चपाती',
    color: '#D2691E',
    bgColor: '#FFE4C4',
    icon: '🫓',
    description: 'Wheat roti'
  },
  {
    filename: 'plain-papad.jpg',
    name: 'Papad',
    marathi: 'पापड',
    color: '#CD853F',
    bgColor: '#FFF8DC',
    icon: '🔘',
    description: 'Crispy papad'
  },
  {
    filename: 'masala-papad.jpg',
    name: 'Masala Papad',
    marathi: 'मसाला पापड',
    color: '#CD853F',
    bgColor: '#FFF8DC',
    icon: '🔘',
    description: 'Spicy papad'
  },
  {
    filename: 'cooking-service.jpg',
    name: 'Cooking Service',
    marathi: 'शिजण सेवा',
    color: '#6B3E26',
    bgColor: '#F5DEB3',
    icon: '👨‍🍳',
    description: 'Special cooking'
  }
]

const publicDir = path.join(__dirname, '../public/images')

// Create images directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
  console.log('📁 Created images directory')
}

console.log('🖼️  Creating enhanced menu image placeholders...')
console.log('🎨 Design: Maharashtrian food-themed SVG placeholders')
console.log('')

let created = 0
let skipped = 0

menuItems.forEach((item) => {
  const filepath = path.join(publicDir, item.filename)

  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipped (exists): ${item.filename}`)
    skipped++
    return
  }

  // Create enhanced SVG placeholder with food theme
  const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with gradient -->
  <defs>
    <linearGradient id="grad${item.filename.replace('.', '_')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${item.bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${item.color};stop-opacity:0.3" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#grad${item.filename.replace('.', '_')})"/>
  
  <!-- Decorative border -->
  <rect x="10" y="10" width="380" height="280" fill="none" stroke="${item.color}" stroke-width="4" rx="10" ry="10"/>
  
  <!-- Central icon circle -->
  <circle cx="200" cy="130" r="60" fill="${item.color}" opacity="0.2"/>
  <circle cx="200" cy="130" r="50" fill="${item.color}" opacity="0.3"/>
  
  <!-- Food icon (emoji) -->
  <text x="200" y="145" text-anchor="middle" font-size="48">${item.icon}</text>
  
  <!-- Item name -->
  <text x="200" y="215" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${item.color}">
    ${item.name}
  </text>
  
  <!-- Marathi name -->
  <text x="200" y="245" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${item.color}" opacity="0.8">
    ${item.marathi}
  </text>
  
  <!-- Description -->
  <text x="200" y="270" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${item.color}" opacity="0.6">
    ${item.description}
  </text>
  
  <!-- Restaurant branding -->
  <text x="200" y="290" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="${item.color}" opacity="0.5">
    ढोले पाटील खानावळ
  </text>
</svg>`.trim()

  fs.writeFileSync(filepath, svg)
  console.log(`✅ Created: ${item.filename} - ${item.name} (${item.marathi})`)
  created++
})

console.log('\n' + '='.repeat(70))
console.log('📊 Enhanced Image Creation Summary:')
console.log('='.repeat(70))
console.log(`✅ Created: ${created} enhanced images`)
console.log(`⏭️  Skipped: ${skipped} images`)
console.log(`📋 Total: ${menuItems.length} images`)
console.log('='.repeat(70))
console.log('\n🎨 Design Features:')
console.log('   • Gradient backgrounds matching food colors')
console.log('   • Food emojis as icons')
console.log('   • Bilingual text (English + Marathi)')
console.log('   • Decorative borders')
console.log('   • Restaurant branding in Marathi')
console.log('   • Descriptive subtitles')
console.log('\n💡 Note: These are enhanced SVG placeholders.')
console.log('   Replace with real food photos for production use.')
console.log('📁 Images saved to: public/images/')
console.log('\n✨ Enhanced image creation complete!')
