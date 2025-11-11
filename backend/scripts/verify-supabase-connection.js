/**
 * Verify Supabase Connection String
 * 
 * This script helps you get the correct connection string from Supabase
 * and verify your setup.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function verifyConnection() {
  console.log('🔍 Supabase Connection Verification\n');
  console.log('='.repeat(80));
  
  console.log('\n📋 Step 1: Check Supabase Project Status\n');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project: wvkzbtmofbrftmgqpzwd');
  console.log('3. Check the project status:');
  console.log('   - Is it showing "Active" or "Paused"?');
  console.log('   - If "Paused", click "Resume" and wait 1-2 minutes\n');
  
  const isActive = await question('Is your project Active? (y/n): ');
  
  if (isActive.toLowerCase() !== 'y') {
    console.log('\n❌ Your project is paused. Please resume it first.');
    console.log('1. Click "Resume" in Supabase Dashboard');
    console.log('2. Wait 1-2 minutes');
    console.log('3. Run this script again\n');
    rl.close();
    return;
  }
  
  console.log('\n📋 Step 2: Get Fresh Connection Strings\n');
  console.log('1. In Supabase Dashboard, go to: Settings → Database');
  console.log('2. Scroll to "Connection string" section');
  console.log('3. You\'ll see different connection modes\n');
  
  console.log('For DATABASE_URL (application use):');
  console.log('  - Select "URI" format');
  console.log('  - Select "Connection pooling" mode');
  console.log('  - Copy the connection string\n');
  
  console.log('For DIRECT_URL (migrations):');
  console.log('  - Select "URI" format');
  console.log('  - Select "Direct connection" mode');
  console.log('  - Copy the connection string\n');
  
  console.log('⚠️  IMPORTANT: The connection string will have [YOUR-PASSWORD] placeholder');
  console.log('   You need to replace it with your actual database password.\n');
  
  const hasPassword = await question('Do you know your database password? (y/n): ');
  
  if (hasPassword.toLowerCase() !== 'y') {
    console.log('\n📋 Step 3: Reset Database Password\n');
    console.log('1. In Supabase Dashboard → Settings → Database');
    console.log('2. Scroll to "Database password" section');
    console.log('3. Click "Reset database password"');
    console.log('4. Copy the new password IMMEDIATELY (you\'ll only see it once!)\n');
    
    const resetDone = await question('Have you reset and copied the password? (y/n): ');
    
    if (resetDone.toLowerCase() !== 'y') {
      console.log('\n⚠️  Please reset your password first, then run this script again.\n');
      rl.close();
      return;
    }
  }
  
  console.log('\n📋 Step 4: Update .env File\n');
  
  const poolerUrl = await question('Paste your Connection Pooling URI (with password replaced): ');
  const directUrl = await question('Paste your Direct Connection URI (with password replaced): ');
  
  if (!poolerUrl || !directUrl) {
    console.log('\n❌ Connection strings are required. Please try again.\n');
    rl.close();
    return;
  }
  
  // Validate URLs
  try {
    new URL(poolerUrl);
    new URL(directUrl);
  } catch (e) {
    console.log('\n❌ Invalid URL format. Please check your connection strings.\n');
    rl.close();
    return;
  }
  
  // Update .env file
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    // Create basic .env template
    envContent = `PORT=4000
NODE_ENV=development
JWT_SECRET=
FRONTEND_ORIGIN=http://localhost:3000
`;
  }
  
  // Update DATABASE_URL
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${poolerUrl}"`);
  } else {
    envContent += `\nDATABASE_URL="${poolerUrl}"\n`;
  }
  
  // Update DIRECT_URL
  if (envContent.includes('DIRECT_URL=')) {
    envContent = envContent.replace(/^DIRECT_URL=.*$/m, `DIRECT_URL="${directUrl}"`);
  } else {
    envContent += `DIRECT_URL="${directUrl}"\n`;
  }
  
  // Write back
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('\n✅ .env file updated successfully!');
  console.log(`📁 Location: ${envPath}\n`);
  
  console.log('🔄 Step 5: Test Connection\n');
  console.log('Run: npm run test:db\n');
  
  rl.close();
}

verifyConnection().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});

