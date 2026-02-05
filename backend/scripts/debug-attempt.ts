import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugAttempt(attemptId: string) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: {
          include: {
            gradingJobs: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!attempt) return console.log("Attempt not found");

    for (const resp of attempt.responses) {
        const lastJob = resp.gradingJobs[0];
        if (!lastJob || !lastJob.result) continue;
        
        const result = lastJob.result as any;
        if (result.testResults) {
            result.testResults.forEach((tr: any, i: number) => {
                console.log(`Test Case ${i+1}:`);
                console.log(`  Passed: ${tr.passed}`);
                console.log(`  Expected: |${tr.expectedOutput}|`);
                console.log(`  Actual:   |${tr.actualOutput}|`);
                if (tr.expectedOutput !== tr.actualOutput) {
                   console.log(`  Mismatch! Length Expected: ${tr.expectedOutput?.length}, Actual: ${tr.actualOutput?.length}`);
                }
            });
        }
    }
  } catch (error) { console.error(error); }
  finally { await prisma.$disconnect(); }
}

debugAttempt('cml929aow000jlodoom7lclad');
