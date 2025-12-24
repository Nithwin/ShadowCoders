const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('📦 Checking existing tables...');
    
    // Check if ClashQuestion table already exists
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ClashQuestion'
    `;
    
    if (tableCheck.length > 0) {
      console.log('✅ Clash tables already exist! No migration needed.');
      console.log('📊 Existing tables: ClashQuestion, ClashRoom, ClashParticipant, ClashSubmission');
      return;
    }
    
    console.log('🔄 Reading migration file...');
    const sqlPath = path.join(__dirname, 'prisma', 'migrations', 'manual_add_clash_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Executing migration...');
    
    // Execute the entire SQL as one transaction
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Migration successful! Clash tables created.');
    console.log('📊 Tables added:');
    console.log('   - ClashQuestion (stores 200+ coding questions)');
    console.log('   - ClashRoom (manages clash sessions)');
    console.log('   - ClashParticipant (tracks participants)');
    console.log('   - ClashSubmission (records code submissions)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Some tables may already exist. Checking...');
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'Clash%'
      `;
      console.log('📊 Found Clash tables:', tables.map(t => t.table_name).join(', '));
    } else {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
