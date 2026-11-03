const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addOffersToDishes() {
  try {
    console.log('Adding offers to menu items...')

    // Add offers to specific dishes
    const dishOffers = [
      { name: 'Chicken Handi Half', offer: '20% OFF', discount: 20 },
      { name: 'Chicken Handi Full', offer: '25% OFF', discount: 25 },
      { name: 'Chicken Thali', offer: '15% OFF', discount: 15 },
      { name: 'Mutton Thali', offer: '15% OFF', discount: 15 },
      { name: 'Chicken Biryani', offer: '10% OFF', discount: 10 },
      { name: 'Chicken Fry', offer: 'FREE DELIVERY', discount: 0 },
      { name: 'Paneer Masala', offer: 'BUY 1 GET 1', discount: 50 },
      { name: 'Vangi Masala', offer: '10% OFF', discount: 10 },
      { name: 'Plain Rice Full', offer: '5% OFF', discount: 5 },
      { name: 'Jeera Rice Full', offer: '5% OFF', discount: 5 },
      { name: 'Bhakri', offer: 'BUY 5 GET 1 FREE', discount: 0 },
      { name: 'Chapati', offer: 'BUY 5 GET 1 FREE', discount: 0 },
      { name: 'Masala Papad', offer: '2 FOR ₹50', discount: 0 },
    ]

    for (const dishOffer of dishOffers) {
      const { data, error } = await supabase
        .from('dishes')
        .update({
          offer: dishOffer.offer,
          offer_discount: dishOffer.discount
        })
        .eq('name', dishOffer.name)
        .select()

      if (error) {
        console.error(`Error updating ${dishOffer.name}:`, error)
      } else {
        console.log(`✅ ${dishOffer.name}: ${dishOffer.offer}`)
      }
    }

    console.log('✅ Offers added to menu items successfully!')
  } catch (error) {
    console.error('Error:', error)
  }
}

addOffersToDishes()
