const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qthtkmlvoarafrxyjdpe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aHRrbWx2b2FyYWZyeHlqZHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjY2MTcsImV4cCI6MjEwNDI0MjYxN30.VagDFieZVq2Ni5ofDBXENH0KC34SD744hjbqIGD1IvE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runMigrations() {
  console.log('Starting migrations...')

  // Migration 1: Add marathi_name column
  console.log('Adding marathi_name column to dishes table...')
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE dishes ADD COLUMN IF NOT EXISTS marathi_name TEXT;'
    })
    if (error) {
      console.log('Note: Cannot add column via RPC, this needs to be done manually in Supabase dashboard')
    } else {
      console.log('✓ marathi_name column added')
    }
  } catch (e) {
    console.log('Note: Column addition may need manual execution in Supabase dashboard')
  }

  // Migration 2: Update dishes with Marathi names
  console.log('Updating dishes with Marathi names...')
  const marathiNames = {
    'Butter Chicken': 'बटर चिकन',
    'Paneer Tikka': 'पनीर टिक्का',
    'Dal Makhani': 'दाल मखनी',
    'Naan': 'नान',
    'Biryani': 'बिरयानी',
    'Samosa': 'समोसा',
    'Chicken Tikka': 'चिकन टिक्का',
    'Vegetable Pulao': 'व्हेजिटेबल पुलाव',
    'Raita': 'रायता',
    'Gulab Jamun': 'गुलाब जामुन'
  }

  for (const [englishName, marathiName] of Object.entries(marathiNames)) {
    try {
      const { error } = await supabase
        .from('dishes')
        .update({ marathi_name: marathiName })
        .eq('name', englishName)

      if (error) {
        console.log(`✗ Failed to update ${englishName}:`, error.message)
      } else {
        console.log(`✓ Updated ${englishName} -> ${marathiName}`)
      }
    } catch (e) {
      console.log(`✗ Error updating ${englishName}:`, e.message)
    }
  }

  console.log('Migrations completed!')
}

runMigrations().catch(console.error)
