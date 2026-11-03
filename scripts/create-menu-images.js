/**
 * Create Menu Image Placeholders
 * This script creates placeholder images for all menu items
 * Run this to generate placeholder images before adding real photos
 */

const fs = require('fs')
const path = require('path')

const imageSizes = {
  'chicken-handi-half.jpg': { width: 400, height: 300, color: '#8B4513', text: 'Chicken Handi' },
  'chicken-handi-full.jpg': { width: 400, height: 300, color: '#8B4513', text: 'Chicken Handi' },
  'chicken-thali.jpg': { width: 400, height: 300, color: '#A0522D', text: 'Chicken Thali' },
  'mutton-thali.jpg': { width: 400, height: 300, color: '#A0522D', text: 'Mutton Thali' },
  'egg-curry-fry.jpg': { width: 400, height: 300, color: '#FFA500', text: 'Egg Curry' },
  'bombay-duck-curry.jpg': { width: 400, height: 300, color: '#8B4513', text: 'Bombay Duck' },
  'boiled-egg.jpg': { width: 400, height: 300, color: '#FFFFFF', text: 'Boiled Egg' },
  'omelette.jpg': { width: 400, height: 300, color: '#FFA500', text: 'Omelette' },
  'chicken-fry.jpg': { width: 400, height: 300, color: '#8B4513', text: 'Chicken Fry' },
  'boiled-egg-fry.jpg': { width: 400, height: 300, color: '#FFA500', text: 'Egg Fry' },
  'dry-fish-plate.jpg': { width: 400, height: 300, color: '#8B4513', text: 'Dry Fish' },
  'chicken-biryani.jpg': { width: 400, height: 300, color: '#FFD700', text: 'Biryani' },
  'shev-bhaji-thali.jpg': { width: 400, height: 300, color: '#228B22', text: 'Shev Bhaji' },
  'vangi-masala.jpg': { width: 400, height: 300, color: '#800080', text: 'Vangi Masala' },
  'paneer-masala.jpg': { width: 400, height: 300, color: '#FFA500', text: 'Paneer Masala' },
  'drumstick-curry.jpg': { width: 400, height: 300, color: '#228B22', text: 'Drumstick' },
  'pithla.jpg': { width: 400, height: 300, color: '#DAA520', text: 'Pithla' },
  'zhirak.jpg': { width: 400, height: 300, color: '#556B2F', text: 'Zhirak' },
  'thecha.jpg': { width: 400, height: 300, color: '#32CD32', text: 'Thecha' },
  'plain-rice-full.jpg': { width: 400, height: 300, color: '#F5F5DC', text: 'Plain Rice' },
  'plain-rice-half.jpg': { width: 400, height: 300, color: '#F5F5DC', text: 'Plain Rice' },
  'jeera-rice-full.jpg': { width: 400, height: 300, color: '#F5F5DC', text: 'Jeera Rice' },
  'jeera-rice-half.jpg': { width: 400, height: 300, color: '#F5F5DC', text: 'Jeera Rice' },
  'bhakri.jpg': { width: 400, height: 300, color: '#D2691E', text: 'Bhakri' },
  'chapati.jpg': { width: 400, height: 300, color: '#D2691E', text: 'Chapati' },
  'plain-papad.jpg': { width: 400, height: 300, color: '#CD853F', text: 'Papad' },
  'masala-papad.jpg': { width: 400, height: 300, color: '#CD853F', text: 'Masala Papad' },
  'cooking-service.jpg': { width: 400, height: 300, color: '#6B3E26', text: 'Cooking Service' }
}

const publicDir = path.join(__dirname, '../public/images')

// Create images directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
  console.log('📁 Created images directory')
}

console.log('🖼️  Creating placeholder menu images...')

let created = 0
let skipped = 0

Object.entries(imageSizes).forEach(([filename, config]) => {
  const filepath = path.join(publicDir, filename)

  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipped (exists): ${filename}`)
    skipped++
    return
  }

  // Create SVG placeholder
  const svg = `<svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${config.color}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">
    ${config.text}
  </text>
  <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white" opacity="0.8">
    Dhole Patil Khanawal
  </text>
</svg>`.trim()

  fs.writeFileSync(filepath, svg)
  console.log(`✅ Created: ${filename}`)
  created++
})

console.log('\n' + '='.repeat(60))
console.log('📊 Image Creation Summary:')
console.log('='.repeat(60))
console.log(`✅ Created: ${created} images`)
console.log(`⏭️  Skipped: ${skipped} images`)
console.log(`📋 Total: ${Object.keys(imageSizes).length} images`)
console.log('='.repeat(60))
console.log('\n💡 Note: These are SVG placeholders. Replace with real food photos later.')
console.log('📁 Images saved to: public/images/')
console.log('\n✨ Image creation complete!')
