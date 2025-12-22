const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function autoFixSQLQuestion() {
  try {
    console.log('🔧 Auto-fixing SQL questions in exam...\n');

    // Find ALL CODING questions in this exam
    const questions = await prisma.question.findMany({
      where: {
        examId: 'cmjgwn7cd0001lo3wh9mn2lfg',
        type: 'CODING'
      }
    });

    console.log(`Found ${questions.length} CODING question(s)\n`);

    if (questions.length === 0) {
      console.log('❌ No CODING questions found in this exam');
      return;
    }

    // The DDL for Employees/Projects question
    const ddl = `CREATE TABLE Employees (
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
    project_id INTEGER,
    FOREIGN KEY (employee_id) REFERENCES Employees(id),
    FOREIGN KEY (project_id) REFERENCES Projects(id)
);`;

    let fixed = 0;
    for (const question of questions) {
      const config = question.config || {};
      const hasLanguage = question.language === 'sql';
      const hasDDL = config.ddl;

      console.log(`Question ${question.id}:`);
      console.log(`  Language: ${question.language || 'Not set'}`);
      console.log(`  Has DDL: ${hasDDL ? 'Yes' : 'No'}`);

      if (!hasLanguage || !hasDDL) {
        console.log(`  ➡️  Fixing...`);
        
        await prisma.question.update({
          where: { id: question.id },
          data: {
            language: 'sql',
            config: { ddl }
          }
        });

        console.log(`  ✅ Fixed!`);
        fixed++;
      } else {
        console.log(`  ✅ Already correct`);
      }
      console.log('');
    }

    console.log(`\n🎉 Done! Fixed ${fixed} question(s)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

autoFixSQLQuestion();
