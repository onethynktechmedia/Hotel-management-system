// Script to add sample ratings to dishes
const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function addSampleRatings() {
  try {
    // Get all dishes
    const { data: dishes, error: dishesError } = await supabase
      .from('dishes')
      .select('id, name')

    if (dishesError) throw dishesError

    console.log(`Found ${dishes.length} dishes`)

    // Add random ratings for each dish
    for (const dish of dishes) {
      const numRatings = Math.floor(Math.random() * 50) + 10 // 10-60 ratings per dish

      for (let i = 0; i < numRatings; i++) {
        const rating = Math.floor(Math.random() * 3) + 3 // 3-5 stars
        const userIp = `192.168.1.${Math.floor(Math.random() * 255)}`

        const { error } = await supabase
          .from('dish_ratings')
          .insert({
            dish_id: dish.id,
            rating,
            user_ip: userIp,
            user_agent: 'Sample Rating Script'
          })

        if (error) {
          console.error(`Error adding rating for ${dish.name}:`, error)
        }
      }

      console.log(`Added ${numRatings} ratings for ${dish.name}`)
    }

    console.log('Sample ratings added successfully!')
  } catch (error) {
    console.error('Error:', error)
  }
}

addSampleRatings()
