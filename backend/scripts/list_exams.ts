
require('dotenv').config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Listing exams...');
  try {
    const exams = await prisma.exam.findMany({
      select: { id: true, title: true, status: true },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Found ${exams.length} exams.`);
    exams.forEach(e => {
      console.log(`${e.id} - ${e.title} [${e.status}]`);
    });

    const targetId = 'cmjjr2tmi0001sfwg666krbgx';
    const match = exams.find(e => e.id === targetId);
    if (match) {
        console.log(`\nTARGET EXAM FOUND: ${match.id}`);
    } else {
        console.log(`\nTarget exam ${targetId} NOT found in recent list. Checking directly...`);
        const direct = await prisma.exam.findUnique({ where: { id: targetId } });
        if (direct) {
             console.log(`TARGET EXAM FOUND via findUnique: ${direct.id}`);
        } else {
             console.log(`Target exam ${targetId} definitely DOES NOT EXIST in this DB.`);
        }
    }

  } catch (error) {
    console.error('Error listing exams:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
