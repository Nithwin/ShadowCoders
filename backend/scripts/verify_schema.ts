
require('dotenv').config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for language column in Question table...');
  try {
    // Try to create a question with the language field or query it
    // Since we don't want to create junk, let's just use $queryRaw to check table info
    // This works for PostgreSQL
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Question' AND column_name = 'language';
    `;
    console.log('Query Result:', result);
    
    if (Array.isArray(result) && result.length > 0) {
      console.log('SUCCESS: Column "language" exists.');
    } else {
      console.log('FAILURE: Column "language" DOES NOT exist.');
    }
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
