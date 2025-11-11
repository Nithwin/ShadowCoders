/**
 * Database Connection Test Script
 * 
 * This script tests the database connection to help diagnose connection issues.
 * Run with: npx ts-node scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('DIRECT_URL:', process.env.DIRECT_URL ? '✅ Set' : '⚠️  Not set (optional)');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('');

  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL is not set in .env file');
    console.log('\n💡 Solution:');
    console.log('1. Create a .env file in the backend/ directory');
    console.log('2. Add DATABASE_URL="your-supabase-connection-string"');
    console.log('3. Get the connection string from Supabase Dashboard → Settings → Database');
    process.exit(1);
  }

  // Parse DATABASE_URL to show connection details (without password)
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('🔗 Connection Details:');
    console.log('  Host:', url.hostname);
    console.log('  Port:', url.port || '5432 (default)');
    console.log('  Database:', url.pathname.slice(1) || 'default');
    console.log('  User:', url.username || 'not specified');
    console.log('  Password:', url.password ? '***' : 'not specified');
    console.log('  Pooler:', url.hostname.includes('pooler') ? '✅ Yes' : '❌ No');
    console.log('');
  } catch (error) {
    console.error('❌ ERROR: Invalid DATABASE_URL format');
    console.error(error);
    process.exit(1);
  }

  // Test connection
  console.log('🔄 Attempting to connect...\n');
  
  try {
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ SUCCESS: Database connection established!');
    console.log('   Test query result:', result);
    console.log('');

    // Test a simple table query
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ User table accessible: ${userCount} users found`);
    } catch (error: any) {
      console.error('❌ ERROR: Cannot access User table');
      console.error('   Error:', error.message);
    }

    try {
      const tokenCount = await prisma.refreshToken.count();
      console.log(`✅ RefreshToken table accessible: ${tokenCount} tokens found`);
    } catch (error: any) {
      console.error('❌ ERROR: Cannot access RefreshToken table');
      console.error('   Error:', error.message);
    }

  } catch (error: any) {
    console.error('❌ ERROR: Failed to connect to database\n');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('');

    // Provide specific solutions based on error code
    if (error.code === 'P1001') {
      console.log('🔧 Troubleshooting Steps for P1001 (Cannot reach database server):');
      console.log('');
      console.log('1. Check Supabase Project Status:');
      console.log('   - Go to https://supabase.com/dashboard');
      console.log('   - Verify your project is active (not paused)');
      console.log('   - Check if the project region matches your connection string');
      console.log('');
      console.log('2. Verify Connection String:');
      console.log('   - Go to Supabase Dashboard → Settings → Database');
      console.log('   - Copy the "Connection string" (with pooling)');
      console.log('   - Make sure you use the correct connection pooler URL');
      console.log('   - For Prisma, use the "Connection pooling" mode');
      console.log('');
      console.log('3. Check Network/Firewall:');
      console.log('   - Ensure you can reach Supabase servers');
      console.log('   - Check if your firewall is blocking the connection');
      console.log('   - Try using the direct connection URL instead');
      console.log('');
      console.log('4. Verify Credentials:');
      console.log('   - Check if your database password is correct');
      console.log('   - Ensure you\'re using the service_role key (not anon key)');
      console.log('   - Regenerate database password if needed');
      console.log('');
      console.log('5. Try Direct Connection:');
      console.log('   - Use DIRECT_URL instead of DATABASE_URL');
      console.log('   - Direct connection bypasses the pooler');
      console.log('   - Get it from: Settings → Database → Connection string → Direct connection');
    } else if (error.code === 'P1000') {
      console.log('🔧 Troubleshooting Steps for P1000 (Authentication failed):');
      console.log('   - Verify your database password is correct');
      console.log('   - Check if you\'re using the right database user');
      console.log('   - Regenerate password in Supabase Dashboard if needed');
    } else if (error.code === 'P1002') {
      console.log('🔧 Troubleshooting Steps for P1002 (Database does not exist):');
      console.log('   - Verify the database name in your connection string');
      console.log('   - Check if your Supabase project is active');
    }

    console.log('');
    console.log('📚 For more help, see: backend/URGENT_FIX_GUIDE.md');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Connection closed');
  }
}

testConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

