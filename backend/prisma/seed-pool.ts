
import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

const questions = [
  {
    topic: 'Arrays',
    difficulty: 'MEDIUM',
    data: {
      problemStatement: 'Write a function to reverse an array in place.',
      starterCode: [{ language: 'javascript', code: 'function reverseArray(arr) {\n  // Your code here\n}' }],
      testCases: [
        { input: '[1, 2, 3]', output: '[3, 2, 1]', hidden: false },
        { input: '[]', output: '[]', hidden: true }
      ]
    }
  },
  {
    topic: 'Arrays',
    difficulty: 'EASY',
    data: {
      problemStatement: 'Find the maximum element in an array.',
      starterCode: [{ language: 'javascript', code: 'function findMax(arr) {\n  // Your code here\n}' }],
      testCases: [
        { input: '[1, 5, 3]', output: '5', hidden: false }
      ]
    }
  },
  {
    topic: 'Strings',
    difficulty: 'HARD',
    data: {
      problemStatement: 'Implement a regex parser for a simple subset of regex.',
      starterCode: [{ language: 'javascript', code: 'function parseRegex(pattern, str) {\n  // Your code here\n}' }],
      testCases: []
    }
  },
   {
    topic: 'Strings',
    difficulty: 'EASY',
    data: {
      problemStatement: 'Check if string is palindrome.',
      starterCode: [{ language: 'javascript', code: 'function isPalindrome(str) {\n  // Your code here\n}' }],
      testCases: []
    }
  },
   {
    topic: 'Strings',
    difficulty: 'MEDIUM',
    data: {
      problemStatement: 'Find longest substring without repeating chars.',
      starterCode: [{ language: 'javascript', code: 'function longestSub(str) {\n  // Your code here\n}' }],
      testCases: []
    }
  }
];

async function main() {
  console.log('Seeding Question Pool...');
  for (const q of questions) {
    await prisma.questionPool.create({
      data: {
        topic: q.topic,
        difficulty: q.difficulty as Difficulty,
        data: q.data,
        isUsed: false
      }
    });
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
