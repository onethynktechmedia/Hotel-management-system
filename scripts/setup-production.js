const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setupProduction() {
  console.log('\n=== Dhole Patil Khanawal - Production Setup ===\n');
  console.log('This script will help you configure environment variables for production builds.\n');

  const envPath = path.join(__dirname, '../.env.local');
  const envExamplePath = path.join(__dirname, '../.env.example');

  // Read existing .env.local if it exists
  let existingEnv = {};
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        existingEnv[match[1]] = match[2];
      }
    });
  }

  // Ask for Supabase URL
  const supabaseUrl = await question(
    `Enter your Supabase Project URL${existingEnv.NEXT_PUBLIC_SUPABASE_URL ? ' (press Enter to keep: ' + existingEnv.NEXT_PUBLIC_SUPABASE_URL + ')' : ''}: `
  );
  const finalSupabaseUrl = supabaseUrl || existingEnv.NEXT_PUBLIC_SUPABASE_URL || '';

  // Ask for Supabase Anon Key
  const supabaseAnonKey = await question(
    `Enter your Supabase Anon Key${existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ' (press Enter to keep: ' + existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY + ')' : ''}: `
  );
  const finalSupabaseAnonKey = supabaseAnonKey || existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Write to .env.local
  const envContent = `NEXT_PUBLIC_SUPABASE_URL=${finalSupabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${finalSupabaseAnonKey}
`;

  fs.writeFileSync(envPath, envContent);
  console.log('\n✓ Environment variables saved to .env.local');
  console.log('\nNext steps:');
  console.log('1. Run: npm run build');
  console.log('2. Run: npm run dist:win (for Windows installer)');
  console.log('3. The installer will be in the dist/ directory\n');

  rl.close();
}

setupProduction().catch(console.error);
