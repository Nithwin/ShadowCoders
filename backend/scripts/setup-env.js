/**
 * Environment Setup Script
 * 
 * This script helps you create a .env file with the correct Supabase connection strings.
 * 
 * Run with: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnv() {
  console.log('🔧 Environment Variables Setup\n');
  console.log('This script will help you create a .env file for your Supabase database.\n');

  const envPath = path.join(__dirname, '..', '.env');
  const examplePath = path.join(__dirname, '..', '.env.example');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Getting Supabase Database Password:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project: wvkzbtmofbrftmgqpzwd');
  console.log('3. Navigate to Settings → Database');
  console.log('4. Find your Database password (or reset it if needed)\n');

  const password = await question('Enter your Supabase database password: ');
  
  if (!password || password.trim() === '') {
    console.log('❌ Password cannot be empty. Setup cancelled.');
    rl.close();
    return;
  }

  // URL encode the password in case it has special characters
  const encodedPassword = encodeURIComponent(password.trim());

  console.log('\n🔐 Generating JWT Secret...');
  const crypto = require('crypto');
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  console.log('✅ JWT Secret generated\n');

  const port = await question('Enter server port (default: 4000): ') || '4000';
  const frontendOrigin = await question('Enter frontend origin (default: http://localhost:3000): ') || 'http://localhost:3000';

  const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=development

# Database - Supabase Connection
# Connect to Supabase via connection pooling (for application use)
DATABASE_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:${encodedPassword}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database (used for migrations)
DIRECT_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:${encodedPassword}@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Authentication
JWT_SECRET="${jwtSecret}"

# Frontend
FRONTEND_ORIGIN=${frontendOrigin}

# Google OAuth (Optional)
GOOGLE_API_KEY=

# Judge0 Code Execution (Optional)
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_API_KEY=
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com
CODE_EXECUTION_PROVIDER=judge0
MAX_CONCURRENT_EXECUTIONS=5
`;

  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ .env file created successfully!');
    console.log(`📁 Location: ${envPath}\n`);
    console.log('🔍 Next steps:');
    console.log('1. Verify your database connection: npm run test:db');
    console.log('2. Start your development server: npm run dev\n');
  } catch (error) {
    console.error('\n❌ Error creating .env file:', error.message);
  }

  rl.close();
}

setupEnv().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});

