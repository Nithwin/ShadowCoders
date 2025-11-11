/**
 * Database Connection Fix Script
 * 
 * This script helps fix database connection issues by:
 * 1. Testing both pooler and direct connections
 * 2. Providing step-by-step fix instructions
 * 3. Optionally updating .env to use direct connection
 * 
 * Run with: node scripts/fix-db-connection.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Database Connection Fix Tool\n');
console.log('='.repeat(80));

const envPath = path.join(__dirname, '..', '.env');

// Check current connection
console.log('\n📋 Current Configuration:');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
console.log(`DIRECT_URL: ${process.env.DIRECT_URL ? 'Set' : 'Not set'}`);

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`\nCurrent connection uses: Port ${url.port} (${url.port === '6543' ? 'Pooler' : 'Direct'})`);
  } catch (e) {
    console.log('Invalid DATABASE_URL format');
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n🔍 Most Common Issues:\n');

console.log('1. ❌ Wrong Database Password');
console.log('   → Solution: Reset password in Supabase Dashboard');
console.log('   → Steps:');
console.log('     1. Go to https://supabase.com/dashboard');
console.log('     2. Select project: wvkzbtmofbrftmgqpzwd');
console.log('     3. Settings → Database');
console.log('     4. Click "Reset database password"');
console.log('     5. Copy the new password');
console.log('     6. Update .env file\n');

console.log('2. ⏸️  Supabase Project is Paused');
console.log('   → Solution: Resume project from dashboard');
console.log('   → Steps:');
console.log('     1. Go to Supabase Dashboard');
console.log('     2. Check if project shows "Paused"');
console.log('     3. Click "Resume" button');
console.log('     4. Wait 1-2 minutes for project to start\n');

console.log('3. 🔌 Connection Pooler Issues (Port 6543)');
console.log('   → Solution: Try direct connection (Port 5432)');
console.log('   → This script can switch you to direct connection\n');

console.log('='.repeat(80));

// Ask if user wants to try direct connection
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fixConnection() {
  console.log('\n💡 Quick Fix Options:\n');
  
  const option = await question('Do you want to switch to direct connection (port 5432)? This might work if pooler is having issues. (y/N): ');
  
  if (option.toLowerCase() === 'y') {
    if (!process.env.DIRECT_URL) {
      console.log('\n❌ DIRECT_URL is not set. Cannot switch to direct connection.');
      console.log('Please set DIRECT_URL in your .env file first.');
      rl.close();
      return;
    }
    
    // Read current .env
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace DATABASE_URL with DIRECT_URL value
    const directUrl = process.env.DIRECT_URL;
    const newDatabaseUrl = directUrl;
    
    // Update DATABASE_URL line
    envContent = envContent.replace(
      /^DATABASE_URL=.*$/m,
      `DATABASE_URL="${newDatabaseUrl}"`
    );
    
    // Write back
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    console.log('\n✅ Updated .env to use direct connection (port 5432)');
    console.log('📝 DATABASE_URL now points to direct connection');
    console.log('\n🔄 Next steps:');
    console.log('1. Test connection: npm run test:db');
    console.log('2. If it works, you can keep using direct connection');
    console.log('3. Or switch back to pooler later when it\'s working\n');
  } else {
    console.log('\n📝 Manual Fix Steps:');
    console.log('1. Reset database password in Supabase Dashboard');
    console.log('2. Update DATABASE_URL in .env with new password');
    console.log('3. Test: npm run test:db');
    console.log('4. If still fails, check if project is paused\n');
  }
  
  rl.close();
}

fixConnection().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});

