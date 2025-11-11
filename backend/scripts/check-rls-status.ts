/**
 * RLS Status Check Script
 * 
 * This script checks:
 * 1. Which tables have RLS enabled
 * 2. What policies exist
 * 3. What role is being used for database connections
 * 
 * Run with: npx ts-node scripts/check-rls-status.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error'],
});

async function checkRLSStatus() {
  console.log('🔍 Checking RLS Status...\n');

  try {
    // Check current user/role
    const currentUser = await prisma.$queryRaw<Array<{ current_user: string }>>`
      SELECT current_user;
    `;
    if (currentUser.length > 0 && currentUser[0]) {
      console.log('📋 Current Database User:', currentUser[0].current_user);
    } else {
      console.log('📋 Current Database User: Unable to determine');
    }
    console.log('');

    // List of tables to check
    const tables = [
      'User',
      'Exam',
      'ExamAssignment',
      'ExamSection',
      'SectionQuestion',
      'Question',
      'Attempt',
      'AttemptSection',
      'Response',
      'ResponseArtifact',
      'Evaluation',
      'Rubric',
      'Asset',
      'GradingJob',
      'RefreshToken',
    ];

    console.log('📊 RLS Status by Table:');
    console.log('─'.repeat(80));

    for (const table of tables) {
      try {
        const result = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = ${table};
        `;

        if (result.length > 0 && result[0]) {
          const status = result[0].rowsecurity ? '✅ ENABLED' : '❌ DISABLED';
          console.log(`${table.padEnd(25)} ${status}`);
        } else {
          console.log(`${table.padEnd(25)} ⚠️  NOT FOUND`);
        }
      } catch (error: any) {
        console.log(`${table.padEnd(25)} ❌ ERROR: ${error.message}`);
      }
    }

    console.log('─'.repeat(80));
    console.log('');

    // Check existing policies
    console.log('🔐 Existing RLS Policies:');
    console.log('─'.repeat(80));

    try {
      const policies = await prisma.$queryRaw<Array<{
        schemaname: string;
        tablename: string;
        policyname: string;
        roles: string[];
      }>>`
        SELECT schemaname, tablename, policyname, roles
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `;

      if (policies.length === 0) {
        console.log('⚠️  No RLS policies found. You may need to apply the migration.');
      } else {
        policies.forEach(policy => {
          console.log(`Table: ${policy.tablename.padEnd(25)} Policy: ${policy.policyname.padEnd(40)} Roles: ${policy.roles.join(', ')}`);
        });
      }
    } catch (error: any) {
      console.error('❌ Error checking policies:', error.message);
    }

    console.log('─'.repeat(80));
    console.log('');

    // Summary
    console.log('📝 Summary:');
    console.log('─'.repeat(80));
    // Build the IN clause safely
    const tableNames = tables.map(t => `'${t.replace(/'/g, "''")}'`).join(', ');
    const allTables = await prisma.$queryRawUnsafe<Array<{ tablename: string; rowsecurity: boolean }>>(
      `SELECT tablename, rowsecurity 
       FROM pg_tables 
       WHERE schemaname = 'public' 
       AND tablename IN (${tableNames})
       ORDER BY tablename;`
    );

    const enabledCount = allTables.filter(t => t.rowsecurity).length;
    const disabledCount = allTables.filter(t => !t.rowsecurity).length;

    console.log(`Total Tables Checked: ${allTables.length}`);
    console.log(`RLS Enabled: ${enabledCount} ✅`);
    console.log(`RLS Disabled: ${disabledCount} ${disabledCount > 0 ? '❌' : ''}`);
    console.log('');

    if (disabledCount > 0) {
      console.log('⚠️  Some tables have RLS disabled. Apply the migration to enable RLS:');
      console.log('   npx prisma migrate deploy');
    } else {
      console.log('✅ All tables have RLS enabled!');
    }

  } catch (error: any) {
    console.error('❌ Error checking RLS status:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRLSStatus().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

