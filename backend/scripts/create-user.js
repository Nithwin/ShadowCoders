#!/usr/bin/env node

/**
 * Script to create a user in the database with email, password, and role
 * 
 * Usage:
 *   node scripts/create-user.js <email> <password> <role>
 * 
 * Examples:
 *   node scripts/create-user.js student@example.com password123 STUDENT
 *   node scripts/create-user.js staff@example.com password123 STAFF
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function createUser() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.error('\n❌ Error: Missing required arguments\n');
      console.log('Usage:');
      console.log('  node scripts/create-user.js <email> <password> <role>\n');
      console.log('Required:');
      console.log('  email    - User email address (must be unique)');
      console.log('  password - User password (minimum 6 characters)');
      console.log('  role     - User role: STUDENT or STAFF\n');
      console.log('Examples:');
      console.log('  node scripts/create-user.js student@example.com password123 STUDENT');
      console.log('  node scripts/create-user.js staff@example.com password123 STAFF\n');
      process.exit(1);
    }

    const email = args[0];
    const password = args[1];
    const role = args[2].toUpperCase();

    // Validate email
    if (!email || !email.includes('@')) {
      console.error('❌ Error: Invalid email address');
      process.exit(1);
    }

    // Validate password
    if (!password || password.length < 6) {
      console.error('❌ Error: Password must be at least 6 characters long');
      process.exit(1);
    }

    // Validate role
    if (role !== 'STUDENT' && role !== 'STAFF') {
      console.error('❌ Error: Role must be either STUDENT or STAFF');
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('👤 Creating User');
    console.log('='.repeat(60));
    console.log(`Email: ${email}`);
    console.log(`Role:  ${role}`);
    console.log('='.repeat(60) + '\n');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      console.error(`❌ Error: User with email "${email}" already exists`);
      process.exit(1);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    console.log('💾 Saving user to database...');
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        role: role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    console.log('\n✅ User created successfully!\n');
    console.log('User Details:');
    console.log('─'.repeat(60));
    console.log(`ID:      ${user.id}`);
    console.log(`Email:   ${user.email}`);
    console.log(`Role:    ${user.role}`);
    console.log(`Created: ${user.createdAt.toLocaleString()}`);
    console.log('─'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error creating user:');
    if (error.code === 'P2002') {
      console.error('   Duplicate entry: Email already exists');
    } else if (error.code === 'P1001') {
      console.error('   Database connection failed. Check your DATABASE_URL in .env');
    } else {
      console.error('   ' + error.message);
    }
    console.error('\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
