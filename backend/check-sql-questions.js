const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSQLQuestions() {
  try {
    // Get all questions for this exam
    const questions = await prisma.question.findMany({
      where: {
        examId: 'cmjgwn7cd0001lo3wh9mn2lfg',
        type: 'CODING'
      }
    });

    console.log(`\n📊 Found ${questions.length} CODING questions\n`);

    questions.forEach((q, idx) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Question ${idx + 1}: ${q.id}`);
      console.log(`${'='.repeat(60)}`);
      
      const promptPreview = q.prompt ? q.prompt.substring(0, 100) : 'No prompt';
      console.log(`📝 Prompt: ${promptPreview}...`);
      console.log(`🔤 Language: ${q.language || 'Not set'}`);
      
      const config = q.config;
      if (config && typeof config === 'object' && config.ddl) {
        console.log(`✅ DDL Present: YES`);
        console.log(`📐 DDL Length: ${config.ddl.length} characters`);
        const ddlPreview = config.ddl.substring(0, 100).replace(/\n/g, ' ');
        console.log(`📐 DDL Preview: ${ddlPreview}...`);
      } else {
        console.log(`❌ DDL Present: NO`);
        console.log(`   Config:`, JSON.stringify(config));
      }
      
      const testcases = q.testcases;
      if (Array.isArray(testcases)) {
        console.log(`🧪 Test Cases: ${testcases.length}`);
        if (testcases.length > 0) {
          const tc = testcases[0];
          const inputPreview = tc.input ? tc.input.substring(0, 60) : 'Empty';
          console.log(`   First test input: ${inputPreview}...`);
        }
      }
    });

    console.log(`\n${'='.repeat(60)}\n`);

    // Summary
    const withDDL = questions.filter(q => q.config && q.config.ddl);
    const withLanguage = questions.filter(q => q.language === 'sql');

    console.log('📊 SUMMARY:');
    console.log(`   Total CODING questions: ${questions.length}`);
    console.log(`   With language="sql": ${withLanguage.length}`);
    console.log(`   With DDL in config: ${withDDL.length}`);
    
    if (withDDL.length === withLanguage.length && withLanguage.length > 0) {
      console.log('\n✅ All SQL questions have proper structure!');
    } else if (withLanguage.length > withDDL.length) {
      console.log(`\n⚠️  ${withLanguage.length - withDDL.length} SQL question(s) missing DDL`);
    } else if (questions.length === 0) {
      console.log('\n⚠️  No CODING questions found in this exam');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkSQLQuestions();
