/**
 * Populate Menu Items Script
 * Run this script to insert all menu items into Supabase
 *
 * Usage: node scripts/populate-menu.js
 *
 * Prerequisites:
 * - Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Ensure Supabase is accessible
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Menu items data
const menuItems = [
  // Non-Veg Items
  {
    name: 'Chicken Handi Half (10 Pieces)',
    marathi_name: 'चिकन हंडी हाफ (१० पिस)',
    description: 'Tender chicken pieces cooked in rich handi style gravy',
    marathi_description: 'हाताळ कोमट तुकडे हंडी पद्धतीत गोळ्यात शिजवलेले',
    price: 300,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/chicken-handi-half.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Chicken Handi Full (20 Pieces)',
    marathi_name: 'चिकन हंडी फुल (२० पिस)',
    description: 'Tender chicken pieces cooked in rich handi style gravy',
    marathi_description: 'हाताळ कोमट तुकडे हंडी पद्धतीत गोळ्यात शिजवलेले',
    price: 560,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/chicken-handi-full.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Chicken Thali',
    marathi_name: 'चिकन थाळी',
    description: 'Complete chicken meal with rice, roti, curry and sides',
    marathi_description: 'पूर्ण चिकन जेवण राईस, भाकरी, करी आणि साइड्ससहित',
    price: 190,
    category: 'Thali',
    food_type: 'nonveg',
    image_url: '/images/chicken-thali.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Mutton Thali',
    marathi_name: 'मटण थाळी',
    description: 'Complete mutton meal with rice, roti, curry and sides',
    marathi_description: 'पूर्ण मटण जेवण राईस, भाकरी, करी आणि साइड्ससहित',
    price: 260,
    category: 'Thali',
    food_type: 'nonveg',
    image_url: '/images/mutton-thali.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Egg Curry Fry',
    marathi_name: 'अंडाकरी फ्राय',
    description: 'Spicy egg curry fried to perfection',
    marathi_description: 'तीखट अंडाकरी फ्राय',
    price: 120,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/egg-curry-fry.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Bombay Duck Curry',
    marathi_name: 'बॉम्बील भाजी',
    description: 'Traditional Bombay duck curry',
    marathi_description: 'पारंपरिक बॉम्बील भाजी',
    price: 150,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/bombay-duck-curry.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Boiled Egg',
    marathi_name: 'बॉईल अंडे',
    description: 'Perfectly boiled eggs',
    marathi_description: 'योग्यरित्या उकळलेले अंडे',
    price: 10,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/boiled-egg.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Omelette',
    marathi_name: 'ऑम्लेट',
    description: 'Fluffy omelette with spices',
    marathi_description: 'मसाल्यांसहित फुफ्फी ऑम्लेट',
    price: 50,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/omelette.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Chicken Fry (6 Pieces)',
    marathi_name: 'चिकन फ्राय (६ पिस)',
    description: 'Crispy fried chicken pieces',
    marathi_description: 'क्रिस्पी फ्राय चिकन तुकडे',
    price: 130,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/chicken-fry.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Boiled Egg Fry (2 Eggs)',
    marathi_name: 'बॉईल फ्राय (२ अंडे)',
    description: 'Fried boiled eggs with spices',
    marathi_description: 'मसाल्यांसहित फ्राय उकळलेले अंडे',
    price: 30,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/boiled-egg-fry.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Dry Fish Plate',
    marathi_name: 'सुकट प्लेट',
    description: 'Crispy dry fish fry',
    marathi_description: 'क्रिस्पी सुकट मासे फ्राय',
    price: 90,
    category: 'Non-Veg',
    food_type: 'nonveg',
    image_url: '/images/dry-fish-plate.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Chicken Biryani (1 KG)',
    marathi_name: 'चिकन बिर्याणी (१ किलो)',
    description: 'Aromatic chicken biryani with basmati rice',
    marathi_description: 'सुगंधित चिकन बिर्याणी बासमती राईससहित',
    price: 700,
    category: 'Rice & Biryani',
    food_type: 'nonveg',
    image_url: '/images/chicken-biryani.jpg',
    is_available: true,
    is_service: false
  },
  // Veg Items
  {
    name: 'Shev Bhaji Thali',
    marathi_name: 'शेव भाजी थाळी',
    description: 'Complete vegetarian meal with shev bhaji',
    marathi_description: 'पूर्ण शाकाहारी जेवण शेव भाजीसहित',
    price: 150,
    category: 'Thali',
    food_type: 'veg',
    image_url: '/images/shev-bhaji-thali.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Vangi Masala',
    marathi_name: 'वांगी मसाला',
    description: 'Spicy brinjal curry with authentic Maharashtrian spices',
    marathi_description: 'पारंपरिक महाराष्ट्रीय मसाल्यांसहित तीखट वांगी भाजी',
    price: 140,
    category: 'Veg',
    food_type: 'veg',
    image_url: '/images/vangi-masala.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Paneer Masala',
    marathi_name: 'पनीर मसाला',
    description: 'Rich paneer curry with tomatoes and spices',
    marathi_description: 'टोमॅटो आणि मसाल्यांसहित गोड पनीर भाजी',
    price: 180,
    category: 'Veg',
    food_type: 'veg',
    image_url: '/images/paneer-masala.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Drumstick Vegetable Curry',
    marathi_name: 'शेवगा भाजी',
    description: 'Drumstick vegetable curry',
    marathi_description: 'शेवगा भाजी',
    price: 120,
    category: 'Veg',
    food_type: 'veg',
    image_url: '/images/drumstick-curry.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Pithla',
    marathi_name: 'पिठले',
    description: 'Traditional Maharashtrian besan curry',
    marathi_description: 'पारंपरिक महाराष्ट्रीय बेसन भाजी',
    price: 80,
    category: 'Veg',
    food_type: 'veg',
    image_url: '/images/pithla.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Zhirak',
    marathi_name: 'झिरक',
    description: 'Traditional Maharashtrian dry vegetable',
    marathi_description: 'पारंपरिक महाराष्ट्रीय सुकट भाजी',
    price: 80,
    category: 'Veg',
    food_type: 'veg',
    image_url: '/images/zhirak.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Thecha',
    marathi_name: 'ठेचा',
    description: 'Spicy green chilli chutney',
    marathi_description: 'तीखट हिरव्या मिरची ठेचा',
    price: 75,
    category: 'Veg',
    food_type: 'veg',
    image_url: '/images/thecha.jpg',
    is_available: true,
    is_service: false
  },
  // Rice Items
  {
    name: 'Plain Rice Full',
    marathi_name: 'साधा राईस फुल',
    description: 'Steamed basmati rice full plate',
    marathi_description: 'उकळलेले बासमती राईस फुल प्लेट',
    price: 90,
    category: 'Rice & Biryani',
    food_type: 'veg',
    image_url: '/images/plain-rice-full.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Plain Rice Half',
    marathi_name: 'साधा राईस हाफ',
    description: 'Steamed basmati rice half plate',
    marathi_description: 'उकळलेले बासमती राईस हाफ प्लेट',
    price: 50,
    category: 'Rice & Biryani',
    food_type: 'veg',
    image_url: '/images/plain-rice-half.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Jeera Rice Full',
    marathi_name: 'जिरा राईस फुल',
    description: 'Cumin flavored basmati rice full plate',
    marathi_description: 'जिरा सुगंधित बासमती राईस फुल प्लेट',
    price: 100,
    category: 'Rice & Biryani',
    food_type: 'veg',
    image_url: '/images/jeera-rice-full.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Jeera Rice Half',
    marathi_name: 'जिरा राईस हाफ',
    description: 'Cumin flavored basmati rice half plate',
    marathi_description: 'जिरा सुगंधित बासमती राईस हाफ प्लेट',
    price: 60,
    category: 'Rice & Biryani',
    food_type: 'veg',
    image_url: '/images/jeera-rice-half.jpg',
    is_available: true,
    is_service: false
  },
  // Roti & Bread Items
  {
    name: 'Bhakri',
    marathi_name: 'भाकरी',
    description: 'Traditional Maharashtrian jowar bread',
    marathi_description: 'पारंपरिक महाराष्ट्रीय ज्वार भाकरी',
    price: 20,
    category: 'Roti & Bread',
    food_type: 'veg',
    image_url: '/images/bhakri.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Chapati',
    marathi_name: 'चपाती',
    description: 'Soft wheat flour flatbread',
    marathi_description: 'मऊगहू चपाती',
    price: 15,
    category: 'Roti & Bread',
    food_type: 'veg',
    image_url: '/images/chapati.jpg',
    is_available: true,
    is_service: false
  },
  // Starters & Sides Items
  {
    name: 'Plain Papad',
    marathi_name: 'पापड साधा',
    description: 'Crispy plain papad',
    marathi_description: 'क्रिस्पी साधा पापड',
    price: 15,
    category: 'Starters & Sides',
    food_type: 'veg',
    image_url: '/images/plain-papad.jpg',
    is_available: true,
    is_service: false
  },
  {
    name: 'Masala Papad',
    marathi_name: 'मसाला पापड',
    description: 'Spicy masala papad',
    marathi_description: 'तीखट मसाला पापड',
    price: 30,
    category: 'Starters & Sides',
    food_type: 'veg',
    image_url: '/images/masala-papad.jpg',
    is_available: true,
    is_service: false
  },
  // Special Cooking Service Items (Rate-based)
  {
    name: 'Chicken / Fish Preparation',
    marathi_name: 'चिकन / मासे तयार करून मिळतील',
    description: 'Cooking service for customer-provided chicken or fish - ₹300 per KG',
    marathi_description: 'ग्राहकांनी दिलेल्या चिकन किंवा मास्यासाठी शिजण सेवा - प्रति किलो ₹३००',
    price: 300,
    category: 'Special Cooking Service',
    food_type: 'nonveg',
    image_url: '/images/cooking-service.jpg',
    is_available: true,
    is_service: true
  },
  {
    name: 'Mutton Preparation',
    marathi_name: 'मटण तयार करून मिळेल',
    description: 'Cooking service for customer-provided mutton - ₹350 per KG',
    marathi_description: 'ग्राहकांनी दिलेल्या मटणासाठी शिजण सेवा - प्रति किलो ₹३५०',
    price: 350,
    category: 'Special Cooking Service',
    food_type: 'nonveg',
    image_url: '/images/cooking-service.jpg',
    is_available: true,
    is_service: true
  },
  {
    name: 'Half KG Preparation',
    marathi_name: 'अर्धा किलो',
    description: 'Half KG cooking service - ₹200',
    marathi_description: 'अर्धा किलो शिजण सेवा - ₹२००',
    price: 200,
    category: 'Special Cooking Service',
    food_type: 'nonveg',
    image_url: '/images/cooking-service.jpg',
    is_available: true,
    is_service: true
  }
]

async function populateMenu() {
  console.log('🍽️  Starting menu population for Dhole Patil Khanawal...')
  console.log(`📋 Total items to insert: ${menuItems.length}`)

  // First, add the is_service column if it doesn't exist
  try {
    console.log('🔧 Checking for is_service column...')
    const { data: columns } = await supabase
      .rpc('check_column_exists', { table_name: 'dishes', column_name: 'is_service' })
      .catch(() => ({ data: null }))

    if (!columns) {
      console.log('➕ Adding is_service column to dishes table...')
      await supabase.rpc('add_service_column')
      console.log('✅ is_service column added successfully')
    } else {
      console.log('✅ is_service column already exists')
    }
  } catch (error) {
    console.log('⚠️  Note: Could not check/add column. Make sure to run the SQL scripts manually.')
  }

  // Clear existing items (optional - comment out if you want to keep existing items)
  console.log('🗑️  Clearing existing dishes...')
  const { error: deleteError } = await supabase
    .from('dishes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all except a non-existent row

  if (deleteError) {
    console.log('⚠️  Could not clear existing dishes (may not exist or no permissions)')
  } else {
    console.log('✅ Existing dishes cleared')
  }

  // Insert menu items
  console.log('📝 Inserting menu items...')
  let successCount = 0
  let errorCount = 0

  for (const item of menuItems) {
    try {
      const { data, error } = await supabase
        .from('dishes')
        .insert(item)
        .select()

      if (error) throw error

      if (data) {
        successCount++
        console.log(`✅ Inserted: ${item.name} (${item.marathi_name}) - ₹${item.price}`)
      }
    } catch (error) {
      errorCount++
      console.error(`❌ Failed to insert: ${item.name}`, error.message)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Population Summary:')
  console.log('='.repeat(60))
  console.log(`✅ Successfully inserted: ${successCount} items`)
  console.log(`❌ Failed to insert: ${errorCount} items`)
  console.log(`📋 Total items: ${menuItems.length}`)
  console.log('='.repeat(60))

  if (successCount === menuItems.length) {
    console.log('\n🎉 All menu items populated successfully!')
    console.log('\n📝 Categories:')
    const categories = [...new Set(menuItems.map(item => item.category))]
    categories.forEach(cat => {
      const count = menuItems.filter(item => item.category === cat).length
      console.log(`   • ${cat}: ${count} items`)
    })
  } else {
    console.log('\n⚠️  Some items failed to insert. Please check the errors above.')
    process.exit(1)
  }
}

populateMenu()
  .then(() => {
    console.log('\n✨ Menu population complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
