/**
 * Create Admin User Script
 * 
 * Creates a test admin user with email: shadowadmin@gmail.com
 * Password: shadowadmin
 * Role: STAFF
 * 
 * Run with: node scripts/create-admin-user.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'shadowadmin@gmail.com';
const ADMIN_PASSWORD = 'shadowadmin';
const ADMIN_NAME = 'Shadow Admin';
const ADMIN_ROLE = 'STAFF';
const SALT_ROUNDS = 10;

async function createAdminUser() {
  console.log('🔧 Creating admin user...\n');

  try {
    // Check if database is accessible
    await prisma.$connect();
    console.log('✅ Database connection established\n');

    // Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log('✅ Password hashed\n');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingUser) {
      console.log('⚠️  User already exists. Updating...');
      
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          password: hashedPassword,
          role: ADMIN_ROLE,
          name: ADMIN_NAME,
        },
      });

      console.log('✅ Admin user updated successfully!\n');
      console.log('📋 User Details:');
      console.log('   ID:', updatedUser.id);
      console.log('   Email:', updatedUser.email);
      console.log('   Name:', updatedUser.name);
      console.log('   Role:', updatedUser.role);
      console.log('\n🔑 Login Credentials:');
      console.log('   Email:', ADMIN_EMAIL);
      console.log('   Password:', ADMIN_PASSWORD);
    } else {
      console.log('📝 Creating new admin user...');
      
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          name: ADMIN_NAME,
          role: ADMIN_ROLE,
        },
      });

      console.log('✅ Admin user created successfully!\n');
      console.log('📋 User Details:');
      console.log('   ID:', newUser.id);
      console.log('   Email:', newUser.email);
      console.log('   Name:', newUser.name);
      console.log('   Role:', newUser.role);
      console.log('\n🔑 Login Credentials:');
      console.log('   Email:', ADMIN_EMAIL);
      console.log('   Password:', ADMIN_PASSWORD);
    }

    console.log('\n✨ You can now login with these credentials!');
    console.log('   POST http://localhost:4000/api/auth/login');
    console.log('   Body: { "email": "shadowadmin@gmail.com", "password": "shadowadmin" }');

  } catch (error) {
    console.error('❌ ERROR: Failed to create admin user\n');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('');

    if (error.code === 'P1001') {
      console.log('🔧 Database Connection Issue:');
      console.log('   - Check if your database is running');
      console.log('   - Verify DATABASE_URL in .env file');
      console.log('   - See: backend/DB_CONNECTION_FIX.md for help');
    } else if (error.code === 'P2002') {
      console.log('🔧 Unique Constraint Violation:');
      console.log('   - User with this email might already exist');
      console.log('   - Try updating the user instead');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database connection closed');
  }
}

createAdminUser().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

