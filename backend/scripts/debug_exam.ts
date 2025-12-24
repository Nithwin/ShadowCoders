
require('dotenv').config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const examId = 'cmjjr2tmi0001sfwg666krbgx';

async function main() {
  console.log(`Checking exam ${examId} with FULL INCLUDE...`);
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        sections: {
          include: {
            sectionQuestions: {
              include: {
                question: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        assignments: true,
        _count: {
          select: {
            questions: true,
            sections: true,
            attempts: true,
          },
        },
      },
    });

    if (!exam) {
      console.log('Exam NOT FOUND with full include.');
       const count = await prisma.exam.count();
       console.log(`Total exams in DB: ${count}`);
       const first = await prisma.exam.findFirst();
       if(first) console.log(`First exam ID: ${first.id}`);
    } else {
      console.log('Exam FOUND successfully with full include.');
      // print title
      console.log('Title:', exam.title);
    }

  } catch (error) {
    console.error('CRASH in findUnique with include:');
    console.error(error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
