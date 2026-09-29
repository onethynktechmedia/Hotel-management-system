const { createClient } = require('@supabase/supabase-js')

// Replace with your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateWaiterCredentials() {
  try {
    // Update waiter credentials
    const { data, error } = await supabase
      .from('users')
      .update({ 
        email: 'sham@hotel.com',
        password: 'sham123'
      })
      .eq('email', 'waiter@hotel.com')
      .eq('role', 'waiter')
      .select()

    if (error) {
      console.error('Error updating waiter credentials:', error)
      return
    }

    console.log('Waiter credentials updated successfully:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

updateWaiterCredentials()
