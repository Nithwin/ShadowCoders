const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DDL = `CREATE TABLE Employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER
);

CREATE TABLE Projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    budget INTEGER
);

CREATE TABLE EmployeeProjects (
    employee_id INTEGER,
    project_id INTEGER
);`;

async function fixQuestion() {
  const questions = await prisma.question.findMany({
    where: {
      examId: 'cmjgwn7cd0001lo3wh9mn2lfg',
      type: 'CODING'
    }
  });

  console.log(`Found ${questions.length} questions`);

  for (const q of questions) {
    console.log(`\nFixing question ${q.id}...`);
    
    await prisma.question.update({
      where: { id: q.id },
      data: {
        language: 'sql',
        config: { ddl: DDL }
      }
    });
    
    console.log('✅ Done!');
  }

  await prisma.$disconnect();
}

fixQuestion().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
