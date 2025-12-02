#!/usr/bin/env node

/**
 * Script to list all users in the database with their email and password hash
 * 
 * ⚠️  SECURITY WARNING:
 * - Passwords are stored as bcrypt hashes and CANNOT be decrypted
 * - This script shows the password hash for reference only
 * - You cannot recover the original password from the hash
 * 
 * Usage:
 *   node scripts/list-users.js
 * 
 * Optional filters:
 *   node scripts/list-users.js --role STUDENT
 *   node scripts/list-users.js --role STAFF
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

async function listUsers() {
  try {
    const args = process.argv.slice(2);
    
    // Parse optional role filter
    let roleFilter = null;
    if (args.includes('--role')) {
      const roleIndex = args.indexOf('--role');
      if (roleIndex + 1 < args.length) {
        const role = args[roleIndex + 1].toUpperCase();
        if (role === 'STUDENT' || role === 'STAFF') {
          roleFilter = role;
        } else {
          console.error('❌ Error: Role must be either STUDENT or STAFF');
          process.exit(1);
        }
      } else {
        console.error('❌ Error: --role requires a value (STUDENT or STAFF)');
        process.exit(1);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('👥 Listing All Users');
    if (roleFilter) {
      console.log(`   Filter: Role = ${roleFilter}`);
    }
    console.log('='.repeat(80) + '\n');

    // Build query
    const where = roleFilter ? { role: roleFilter } : {};

    // Fetch all users
    const users = await prisma.user.findMany({
      where: where,
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        reg_no: true,
        year: true,
        department: true,
        section: true,
        googleId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    });

    if (users.length === 0) {
      console.log('📭 No users found in the database.\n');
      return;
    }

    console.log(`📊 Total users found: ${users.length}\n`);
    console.log('⚠️  NOTE: Passwords are hashed with bcrypt and cannot be decrypted.\n');
    console.log('─'.repeat(80));

    // Display users
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User Details:`);
      console.log('   ' + '─'.repeat(76));
      console.log(`   ID:         ${user.id}`);
      console.log(`   Email:      ${user.email}`);
      console.log(`   Name:       ${user.name || '(not set)'}`);
      console.log(`   Role:       ${user.role}`);
      console.log(`   Reg No:     ${user.reg_no || '(not set)'}`);
      console.log(`   Year:       ${user.year || '(not set)'}`);
      console.log(`   Department: ${user.department || '(not set)'}`);
      console.log(`   Section:    ${user.section || '(not set)'}`);
      console.log(`   Google ID:  ${user.googleId || '(not set)'}`);
      console.log(`   Password:   ${user.password ? `[HASHED: ${user.password.substring(0, 20)}...]` : '(not set - Google OAuth only)'}`);
      console.log(`   Created:    ${user.createdAt.toLocaleString()}`);
      console.log(`   Updated:    ${user.updatedAt.toLocaleString()}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log(`\n✅ Displayed ${users.length} user(s)\n`);

    // Summary by role
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(roleCounts).length > 0) {
      console.log('📈 Summary by Role:');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`   ${role}: ${count}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error listing users:');
    if (error.code === 'P1001') {
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

listUsers();

