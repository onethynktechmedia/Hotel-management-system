const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createOffersTable() {
  try {
    console.log('Please run the SQL from supabase/offers-table.sql in your Supabase Dashboard SQL Editor first.')
    console.log('Then run this script to insert sample offers.')

    // Insert sample offers
    console.log('Inserting sample offers...')
    const { data, error } = await supabase
      .from('offers')
      .insert([
        {
          title: 'Weekend Special',
          description: 'Get 20% off on all orders this weekend',
          discount_percent: 20,
          min_order_value: 500,
          max_discount: 200,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          is_active: true,
          is_promotional: true
        },
        {
          title: 'First Order Discount',
          description: '15% off on your first order',
          discount_percent: 15,
          min_order_value: 300,
          max_discount: 100,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          is_active: true,
          is_promotional: false
        },
        {
          title: 'Lunch Special',
          description: '10% off on orders between 12 PM - 3 PM',
          discount_percent: 10,
          min_order_value: 200,
          max_discount: 50,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          is_active: true,
          is_promotional: true
        }
      ])
      .select()

    if (error) {
      console.error('Error inserting offers:', error.message)
      console.log('This is expected if the offers table does not exist yet.')
      console.log('Please run: supabase/offers-table.sql in Supabase Dashboard SQL Editor')
    } else {
      console.log('✅ Sample offers inserted successfully!')
      console.log('Offers:', data)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

createOffersTable()
