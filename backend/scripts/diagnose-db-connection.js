/**
 * Database Connection Diagnostic Script
 * 
 * This script helps diagnose why the database connection is failing.
 * 
 * Run with: node scripts/diagnose-db-connection.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 Database Connection Diagnostic Tool\n');
console.log('='.repeat(80));

// Check 1: .env file exists
console.log('\n1️⃣  Checking .env file...');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env file exists');
} else {
  console.log('   ❌ .env file NOT FOUND');
  console.log('   💡 Solution: Create .env file or run: npm run setup:env');
  process.exit(1);
}

// Check 2: DATABASE_URL is set
console.log('\n2️⃣  Checking DATABASE_URL...');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('   ❌ DATABASE_URL is not set in .env file');
  console.log('   💡 Solution: Add DATABASE_URL to your .env file');
  process.exit(1);
} else {
  console.log('   ✅ DATABASE_URL is set');
  
  // Check if it has placeholder
  if (databaseUrl.includes('[YOUR-PASSWORD]') || databaseUrl.includes('YOUR_PASSWORD')) {
    console.log('   ⚠️  WARNING: DATABASE_URL contains placeholder [YOUR-PASSWORD]');
    console.log('   💡 Solution: Replace [YOUR-PASSWORD] with your actual Supabase database password');
    console.log('   📖 How to get password: Supabase Dashboard → Settings → Database');
  }
  
  // Parse and validate URL format
  try {
    const url = new URL(databaseUrl);
    console.log('   ✅ DATABASE_URL format is valid');
    console.log(`   📋 Host: ${url.hostname}`);
    console.log(`   📋 Port: ${url.port || 'default'}`);
    console.log(`   📋 Database: ${url.pathname.slice(1) || 'default'}`);
    console.log(`   📋 User: ${url.username || 'not specified'}`);
    console.log(`   📋 Password: ${url.password ? '***' + url.password.slice(-3) : '❌ MISSING'}`);
    
    if (!url.password || url.password === '[YOUR-PASSWORD]' || url.password === 'YOUR_PASSWORD') {
      console.log('   ❌ ERROR: Password is missing or placeholder not replaced');
      console.log('   💡 Solution: Update DATABASE_URL with your actual password');
    }
    
    // Check if it's the correct Supabase format
    if (!url.hostname.includes('supabase.com')) {
      console.log('   ⚠️  WARNING: Hostname does not appear to be Supabase');
    }
    
    // Check port
    if (url.port === '6543') {
      console.log('   ✅ Using connection pooler (port 6543)');
    } else if (url.port === '5432') {
      console.log('   ⚠️  Using direct connection (port 5432) - migrations should use DIRECT_URL');
    }
    
  } catch (error) {
    console.log('   ❌ ERROR: DATABASE_URL format is invalid');
    console.log(`   Error: ${error.message}`);
  }
}

// Check 3: DIRECT_URL is set
console.log('\n3️⃣  Checking DIRECT_URL...');
const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.log('   ⚠️  DIRECT_URL is not set (optional but recommended for migrations)');
} else {
  console.log('   ✅ DIRECT_URL is set');
  if (directUrl.includes('[YOUR-PASSWORD]') || directUrl.includes('YOUR_PASSWORD')) {
    console.log('   ⚠️  WARNING: DIRECT_URL contains placeholder');
  }
}

// Check 4: Other required env vars
console.log('\n4️⃣  Checking other environment variables...');
const requiredVars = {
  'JWT_SECRET': process.env.JWT_SECRET,
  'NODE_ENV': process.env.NODE_ENV || 'development',
  'PORT': process.env.PORT || '4000',
};

Object.entries(requiredVars).forEach(([key, value]) => {
  if (value && value !== 'replace-with-a-long-random-string') {
    console.log(`   ✅ ${key} is set`);
  } else {
    console.log(`   ⚠️  ${key} is ${value ? 'using default/placeholder' : 'not set'}`);
  }
});

// Check 5: Network connectivity test
console.log('\n5️⃣  Network connectivity test...');
const dns = require('dns');
const hostname = 'aws-1-ap-south-1.pooler.supabase.com';

dns.lookup(hostname, (err, address) => {
  if (err) {
    console.log(`   ❌ Cannot resolve hostname: ${hostname}`);
    console.log(`   Error: ${err.message}`);
    console.log('   💡 Possible causes:');
    console.log('      - Internet connection issue');
    console.log('      - DNS resolution problem');
    console.log('      - Firewall blocking DNS');
  } else {
    console.log(`   ✅ Hostname resolves to: ${address}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📝 Summary & Next Steps:\n');
  
  if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
    console.log('❌ MAIN ISSUE: DATABASE_URL needs your actual password');
    console.log('\n🔧 Fix Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project: wvkzbtmofbrftmgqpzwd');
    console.log('3. Navigate to Settings → Database');
    console.log('4. Find or reset your Database password');
    console.log('5. Update DATABASE_URL in .env file with the password');
    console.log('\nOr run: npm run setup:env (interactive setup)');
  } else {
    console.log('✅ Environment variables look good');
    console.log('\n🔧 If connection still fails, check:');
    console.log('1. Supabase project status (not paused)');
    console.log('2. Database password is correct');
    console.log('3. Network/firewall allows connection to port 6543');
    console.log('4. Try using DIRECT_URL (port 5432) instead');
    console.log('\n📖 See DB_CONNECTION_FIX.md for detailed troubleshooting');
  }
  
  console.log('\n' + '='.repeat(80));
});

