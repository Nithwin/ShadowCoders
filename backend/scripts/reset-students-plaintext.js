#!/usr/bin/env node

/**
 * ⚠️  CRITICAL SECURITY WARNING ⚠️
 * 
 * This script will:
 * 1. Delete ALL users with STUDENT role
 * 2. Recreate them with PLAIN TEXT passwords (NOT HASHED)
 * 
 * ⚠️  SECURITY RISKS:
 * - Storing passwords in plain text is a MAJOR security vulnerability
 * - Anyone with database access can see all passwords
 * - This violates security best practices and compliance standards
 * - Passwords cannot be recovered from existing hashes
 * 
 * Usage:
 *   node scripts/reset-students-plaintext.js [default-password]
 * 
 * Examples:
 *   node scripts/reset-students-plaintext.js
 *   node scripts/reset-students-plaintext.js "password123"
 * 
 * If no password is provided, passwords will be set to null.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetStudents() {
  try {
    console.log('\n' + '⚠️'.repeat(40));
    console.log('⚠️  CRITICAL SECURITY WARNING');
    console.log('⚠️'.repeat(40));
    console.log('\nThis script will:');
    console.log('  1. DELETE all users with STUDENT role');
    console.log('  2. Recreate them with PLAIN TEXT passwords (NOT HASHED)');
    console.log('\n⚠️  SECURITY RISKS:');
    console.log('  - Plain text passwords are a MAJOR security vulnerability');
    console.log('  - Anyone with database access can see all passwords');
    console.log('  - This violates security best practices');
    console.log('  - Existing password hashes CANNOT be recovered\n');

    // Get default password from command line or prompt
    const args = process.argv.slice(2);
    let defaultPassword = args[0] || null;

    if (!defaultPassword) {
      console.log('No password provided. Users will be created without passwords.');
      console.log('(They can be set later or users can use Google OAuth)\n');
    } else {
      console.log(`Default password will be set to: "${defaultPassword}"\n`);
    }

    // Confirmation prompt
    const answer = await question('Are you sure you want to proceed? (type "YES" to confirm): ');
    
    if (answer !== 'YES') {
      console.log('\n❌ Operation cancelled.\n');
      rl.close();
      process.exit(0);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔄 Resetting STUDENT Users');
    console.log('='.repeat(80) + '\n');

    // Step 1: Fetch all STUDENT users to backup their data
    console.log('📋 Step 1: Fetching all STUDENT users...');
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        email: true,
        name: true,
        reg_no: true,
        year: true,
        department: true,
        section: true,
        pictureUrl: true,
        googleId: true,
      },
      orderBy: { email: 'asc' }
    });

    if (students.length === 0) {
      console.log('📭 No STUDENT users found in the database.\n');
      rl.close();
      return;
    }

    console.log(`✅ Found ${students.length} STUDENT user(s) to process\n`);

    // Display what will be backed up
    console.log('📦 Data to be preserved:');
    students.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.email} (${student.name || 'no name'})`);
    });
    console.log('');

    // Step 2: Delete all STUDENT users and related data
    console.log('🗑️  Step 2: Deleting all STUDENT users and related data...');
    
    // Check for foreign key constraints (attempts, evaluations, etc.)
    const studentsWithAttempts = await prisma.user.findMany({
      where: { 
        role: 'STUDENT',
        attempts: {
          some: {}
        }
      },
      select: {
        email: true,
        _count: {
          select: { attempts: true }
        }
      }
    });

    if (studentsWithAttempts.length > 0) {
      console.log('\n⚠️  WARNING: Some students have exam attempts:');
      studentsWithAttempts.forEach(student => {
        console.log(`   - ${student.email}: ${student._count.attempts} attempt(s)`);
      });
      console.log('\n⚠️  Deleting these users will also delete their attempts and results!');
      
      const confirmDelete = await question('\nContinue anyway? (type "DELETE" to confirm): ');
      if (confirmDelete !== 'DELETE') {
        console.log('\n❌ Operation cancelled.\n');
        rl.close();
        process.exit(0);
      }
    }

    // Delete related data first to avoid foreign key constraint errors
    console.log('\n   Deleting related data (attempts, responses, evaluations)...');
    
    // Get all student IDs
    const studentUsers = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true }
    });
    const studentIds = studentUsers.map(u => u.id);

    if (studentIds.length > 0) {
      // Get all attempt IDs for these students
      const attempts = await prisma.attempt.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true }
      });
      const attemptIds = attempts.map(a => a.id);

      if (attemptIds.length > 0) {
        // Delete grading jobs, response artifacts, evaluations, responses, attempt sections
        await prisma.$transaction(async (tx) => {
          // Delete grading jobs
          await tx.gradingJob.deleteMany({
            where: { response: { attemptId: { in: attemptIds } } }
          });

          // Delete response artifacts
          await tx.responseArtifact.deleteMany({
            where: { response: { attemptId: { in: attemptIds } } }
          });

          // Delete evaluations
          await tx.evaluation.deleteMany({
            where: { response: { attemptId: { in: attemptIds } } }
          });

          // Delete responses
          await tx.response.deleteMany({
            where: { attemptId: { in: attemptIds } }
          });

          // Delete attempt sections
          await tx.attemptSection.deleteMany({
            where: { attemptId: { in: attemptIds } }
          });

          // Delete attempts
          await tx.attempt.deleteMany({
            where: { studentId: { in: studentIds } }
          });
        });
        console.log(`   ✅ Deleted ${attemptIds.length} attempt(s) and related data`);
      }

      // Delete evaluations where students are assessors (shouldn't happen for STUDENT role, but just in case)
      await prisma.evaluation.deleteMany({
        where: { assessorId: { in: studentIds } }
      });
    }

    // Now delete all STUDENT users
    const deleteResult = await prisma.user.deleteMany({
      where: { role: 'STUDENT' }
    });

    console.log(`✅ Deleted ${deleteResult.count} STUDENT user(s)\n`);

    // Step 3: Recreate users with plain text passwords
    console.log('🔄 Step 3: Recreating users with plain text passwords...');
    
    const createdUsers = [];
    const errors = [];

    for (const student of students) {
      try {
        const newUser = await prisma.user.create({
          data: {
            email: student.email,
            name: student.name,
            reg_no: student.reg_no,
            year: student.year,
            department: student.department,
            section: student.section,
            pictureUrl: student.pictureUrl,
            googleId: student.googleId,
            role: 'STUDENT',
            password: defaultPassword, // PLAIN TEXT - NOT HASHED
          },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            role: true,
          }
        });
        createdUsers.push(newUser);
        console.log(`   ✅ Created: ${newUser.email}`);
      } catch (error) {
        errors.push({ email: student.email, error: error.message });
        console.log(`   ❌ Failed: ${student.email} - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary');
    console.log('='.repeat(80));
    console.log(`✅ Successfully created: ${createdUsers.length} user(s)`);
    if (errors.length > 0) {
      console.log(`❌ Failed: ${errors.length} user(s)`);
    }
    console.log('');

    if (createdUsers.length > 0) {
      console.log('📋 Created Users (with PLAIN TEXT passwords):');
      console.log('─'.repeat(80));
      createdUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`);
        console.log(`   Password: ${user.password ? `"${user.password}" (PLAIN TEXT)` : '(not set)'}`);
        console.log(`   Name: ${user.name || '(not set)'}`);
      });
      console.log('\n' + '─'.repeat(80));
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => {
        console.log(`   - ${err.email}: ${err.error}`);
      });
    }

    console.log('\n⚠️  REMINDER: Passwords are stored in PLAIN TEXT!');
    console.log('   This is a security risk. Consider re-hashing passwords soon.\n');

  } catch (error) {
    console.error('\n❌ Error resetting students:');
    if (error.code === 'P1001') {
      console.error('   Database connection failed. Check your DATABASE_URL in .env');
    } else if (error.code === 'P2002') {
      console.error('   Duplicate entry: Email already exists');
    } else {
      console.error('   ' + error.message);
      console.error('   Stack:', error.stack);
    }
    console.error('\n');
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

resetStudents();

