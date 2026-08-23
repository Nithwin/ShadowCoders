const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding test data...');

  // 1. Create or Find an Admin/Staff user to own resources if needed
  // For now, we'll just create the exam without an explicit owner if the schema allows (it does)

  // 2. Create MCQs
  const mcqs = [
    {
      prompt: 'What is the time complexity of searching an element in a balanced BST?',
      type: 'MCQ',
      points: 2.0,
      difficulty: 'MEDIUM',
      options: [
        { id: '1', text: 'O(1)' },
        { id: '2', text: 'O(n)' },
        { id: '3', text: 'O(log n)' },
        { id: '4', text: 'O(n log n)' }
      ],
      correctOptionIds: ['3']
    },
    {
      prompt: 'Which of the following is NOT a linear data structure?',
      type: 'MCQ',
      points: 2.0,
      difficulty: 'EASY',
      options: [
        { id: '1', text: 'Array' },
        { id: '2', text: 'Linked List' },
        { id: '3', text: 'Stack' },
        { id: '4', text: 'Graph' }
      ],
      correctOptionIds: ['4']
    },
    {
      prompt: 'In Java, which keyword is used to inherit a class?',
      type: 'MCQ',
      points: 1.0,
      difficulty: 'EASY',
      options: [
        { id: '1', text: 'implements' },
        { id: '2', text: 'extends' },
        { id: '3', text: 'inherits' },
        { id: '4', text: 'using' }
      ],
      correctOptionIds: ['2']
    },
    {
      prompt: 'What is the primary purpose of the "static" keyword in Java?',
      type: 'MCQ',
      points: 2.0,
      difficulty: 'MEDIUM',
      options: [
        { id: '1', text: 'To make a variable constant' },
        { id: '2', text: 'To allow a method to be called without creating an instance' },
        { id: '3', text: 'To make a class private' },
        { id: '4', text: 'To improve garbage collection' }
      ],
      correctOptionIds: ['2']
    },
    {
      prompt: 'Which sorting algorithm has the best average case time complexity?',
      type: 'MCQ',
      points: 2.0,
      difficulty: 'MEDIUM',
      options: [
        { id: '1', text: 'Bubble Sort' },
        { id: '2', text: 'Insertion Sort' },
        { id: '3', text: 'Merge Sort' },
        { id: '4', text: 'Selection Sort' }
      ],
      correctOptionIds: ['3']
    }
  ];

  // 3. Create Coding Questions
  const codingQuestions = [
    {
      prompt: 'Write a Java program to find the factorial of a given number using recursion.',
      type: 'CODING',
      points: 10.0,
      difficulty: 'MEDIUM',
      language: 'java',
      starterCode: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(factorial(n));\n    }\n\n    public static long factorial(int n) {\n        // Your code here\n        return 0;\n    }\n}',
      testcases: [
        { input: '5', output: '120' },
        { input: '0', output: '1' },
        { input: '1', output: '1' }
      ]
    },
    {
      prompt: 'Write a Python function to check if a string is a palindrome. The input will be provided via stdin.',
      type: 'CODING',
      points: 10.0,
      difficulty: 'EASY',
      language: 'python',
      starterCode: 'import sys\n\ndef is_palindrome(s):\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    line = sys.stdin.read().strip()\n    print(is_palindrome(line))',
      testcases: [
        { input: 'racecar', output: 'True' },
        { input: 'hello', output: 'False' },
        { input: 'madam', output: 'True' }
      ]
    }
  ];

  const createdQuestions = [];

  for (const q of [...mcqs, ...codingQuestions]) {
    const question = await prisma.question.create({
      data: {
        prompt: q.prompt,
        type: q.type,
        points: q.points,
        difficulty: q.difficulty,
        options: q.options || null,
        correctOptionIds: q.correctOptionIds || null,
        starterCode: q.starterCode || null,
        testcases: q.testcases || null,
        language: q.language || null,
        order: 0, // Will be set in the section
      }
    });
    createdQuestions.push(question);
  }

  console.log(`✅ Created ${createdQuestions.length} questions.`);

  // 4. Create Testing Exam
  const now = new Date();
  const startAt = new Date(now.getTime() + 5 * 60000); // Start in 5 mins
  const endAt = new Date(now.getTime() + 24 * 60 * 60000); // End in 24 hours

  const exam = await prisma.exam.create({
    data: {
      title: 'ShadowCoders Initial Testing Exam',
      description: 'A comprehensive test containing MCQs and Coding questions to verify platform functionality.',
      startAt: startAt,
      endAt: endAt,
      durationMins: 120,
      timingMode: 'OVERALL_ONLY',
      status: 'PUBLISHED',
      mode: 'STANDARD',
    }
  });

  console.log(`✅ Created Exam: ${exam.title} (ID: ${exam.id})`);

  // 5. Create Exam Section
  const section = await prisma.examSection.create({
    data: {
      examId: exam.id,
      title: 'Main Section',
      order: 1,
      description: 'Contains all test questions.',
    }
  });

  console.log(`✅ Created Section: ${section.title}`);

  // 6. Link questions to Section
  for (let i = 0; i < createdQuestions.length; i++) {
    await prisma.sectionQuestion.create({
      data: {
        sectionId: section.id,
        questionId: createdQuestions[i].id,
        order: i + 1,
      }
    });
  }

  console.log('✅ Linked all questions to the section.');

  // 7. Assign to all students (optional)
  await prisma.examAssignment.create({
    data: {
      examId: exam.id,
      assignToAll: true,
    }
  });

  console.log('✅ Assigned exam to all students.');
  console.log('\n✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
