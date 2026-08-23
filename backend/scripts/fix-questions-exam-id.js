const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding orphan questions...');

  // Find all questions where examId is null but they are linked to a section
  const orphanQuestions = await prisma.question.findMany({
    where: {
      examId: null,
      sectionLinks: {
        some: {}
      }
    },
    include: {
      sectionLinks: {
        include: {
          section: {
            select: {
              examId: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${orphanQuestions.length} orphan questions.`);

  for (const question of orphanQuestions) {
    if (question.sectionLinks.length > 0) {
      const examId = question.sectionLinks[0].section.examId;
      console.log(`Updating question ${question.id} with examId ${examId}...`);
      
      await prisma.question.update({
        where: { id: question.id },
        data: { examId: examId }
      });
    }
  }

  console.log('✅ Fix completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
