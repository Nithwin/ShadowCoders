/**
 * Auto Setup Admin User
 * 
 * This script will:
 * 1. Test database connection
 * 2. Create/update admin user if connection succeeds
 * 3. Provide clear error messages if connection fails
 * 
 * Run with: node scripts/setup-admin-auto.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const ADMIN_EMAIL = 'shadowadmin@gmail.com';
const ADMIN_PASSWORD = 'shadowadmin';
const ADMIN_NAME = 'Shadow Admin';
const ADMIN_ROLE = 'STAFF';
const SALT_ROUNDS = 10;

async function setupAdmin() {
  console.log('🚀 Starting Admin User Setup...\n');
  console.log('=' .repeat(50));
  console.log('');

  // Step 1: Check environment variables
  console.log('📋 Step 1: Checking environment...');
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL is not set in .env file');
    console.log('\n💡 Solution:');
    console.log('   1. Create a .env file in the backend/ directory');
    console.log('   2. Add DATABASE_URL="your-supabase-connection-string"');
    console.log('   3. Get it from: Supabase Dashboard → Settings → Database');
    process.exit(1);
  }
  console.log('✅ DATABASE_URL is set\n');

  // Step 2: Test database connection
  console.log('📋 Step 2: Testing database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connection established!\n');
  } catch (error) {
    console.error('❌ Database connection failed!\n');
    console.error('Error:', error.message);
    console.error('');
    console.log('🔧 Troubleshooting Steps:');
    console.log('');
    console.log('1. Check Supabase Project Status:');
    console.log('   → Go to https://supabase.com/dashboard');
    console.log('   → Verify your project is ACTIVE (not paused)');
    console.log('   → If paused, click "Resume" and wait 1-2 minutes');
    console.log('');
    console.log('2. Verify Connection String:');
    console.log('   → Go to Supabase Dashboard → Settings → Database');
    console.log('   → Copy the "Connection string" (URI format)');
    console.log('   → Update DATABASE_URL in your .env file');
    console.log('');
    console.log('3. Try Direct Connection:');
    console.log('   → Change port from 6543 (pooler) to 5432 (direct)');
    console.log('   → Remove ?pgbouncer=true from the URL');
    console.log('');
    console.log('4. Check Network:');
    console.log('   → Ensure you can reach Supabase servers');
    console.log('   → Check if firewall is blocking the connection');
    console.log('');
    console.log('📚 For detailed help, see:');
    console.log('   → backend/DB_CONNECTION_FIX.md');
    console.log('   → QUICK_FIX_LOGIN_ERROR.md');
    console.log('');
    console.log('⏳ Once the connection is fixed, run this script again.');
    process.exit(1);
  }

  // Step 3: Hash password
  console.log('📋 Step 3: Hashing password...');
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log('✅ Password hashed successfully\n');
  } catch (error) {
    console.error('❌ Failed to hash password:', error.message);
    process.exit(1);
  }

  // Step 4: Create or update admin user
  console.log('📋 Step 4: Creating/updating admin user...');
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingUser) {
      console.log('⚠️  User already exists. Updating...');
      const updatedUser = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          password: hashedPassword,
          role: ADMIN_ROLE,
          name: ADMIN_NAME,
        },
      });

      console.log('✅ Admin user updated successfully!\n');
      console.log('=' .repeat(50));
      console.log('📋 USER DETAILS:');
      console.log('=' .repeat(50));
      console.log('   ID:       ', updatedUser.id);
      console.log('   Email:    ', updatedUser.email);
      console.log('   Name:     ', updatedUser.name);
      console.log('   Role:     ', updatedUser.role);
      console.log('   Created:  ', updatedUser.createdAt);
      console.log('   Updated:  ', updatedUser.updatedAt);
    } else {
      console.log('📝 Creating new admin user...');
      const newUser = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          name: ADMIN_NAME,
          role: ADMIN_ROLE,
        },
      });

      console.log('✅ Admin user created successfully!\n');
      console.log('=' .repeat(50));
      console.log('📋 USER DETAILS:');
      console.log('=' .repeat(50));
      console.log('   ID:       ', newUser.id);
      console.log('   Email:    ', newUser.email);
      console.log('   Name:     ', newUser.name);
      console.log('   Role:     ', newUser.role);
      console.log('   Created:  ', newUser.createdAt);
    }

    console.log('');
    console.log('=' .repeat(50));
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('=' .repeat(50));
    console.log('   Email:    ', ADMIN_EMAIL);
    console.log('   Password: ', ADMIN_PASSWORD);
    console.log('');
    console.log('=' .repeat(50));
    console.log('✨ SETUP COMPLETE!');
    console.log('=' .repeat(50));
    console.log('');
    console.log('🚀 You can now login with these credentials:');
    console.log('   → POST http://localhost:4000/api/auth/login');
    console.log('   → Body: { "email": "shadowadmin@gmail.com", "password": "shadowadmin" }');
    console.log('');

  } catch (error) {
    console.error('❌ Failed to create/update admin user\n');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('');
    
    if (error.code === 'P2002') {
      console.log('🔧 Unique Constraint Violation:');
      console.log('   → Another user might have this email');
      console.log('   → Try updating the existing user manually');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
  }
}

// Run the setup
setupAdmin().catch((error) => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});

