
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting "Reverse Array" question...');
  
  // 1. Delete from QuestionPool
  const deletePool = await prisma.questionPool.deleteMany({
    where: {
      data: {
        path: ['problemStatement'],
        equals: 'Write a function to reverse an array in place.'
      }
    }
  });

  console.log(`Deleted ${deletePool.count} questions from Pool.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
