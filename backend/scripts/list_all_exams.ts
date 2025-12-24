
require('dotenv').config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL || 'UNDEFINED';
  console.log(`DB URL: ${url.substring(0, 15)}...`);
  
  const exams = await prisma.exam.findMany({ select: { id: true, title: true } });
  console.log(`Total Exams: ${exams.length}`);
  exams.forEach(e => console.log(`${e.id} : ${e.title}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
