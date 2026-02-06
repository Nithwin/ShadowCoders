const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableProctoring() {
  try {
    const examTitle = process.argv[2] || 'Sample2';
    
    console.log(`\nSearching for exam: "${examTitle}"...`);
    
    // Find the exam by title
    const exam = await prisma.exam.findFirst({
      where: {
        title: {
          contains: examTitle,
          mode: 'insensitive'
        }
      }
    });
    
    if (!exam) {
      console.log(`❌ Exam "${examTitle}" not found!`);
      console.log('\nAvailable exams:');
      const allExams = await prisma.exam.findMany({
        select: {
          id: true,
          title: true,
          enableProctoring: true,
          status: true
        }
      });
      allExams.forEach(e => {
        console.log(`  - ${e.title} (Proctoring: ${e.enableProctoring ? 'ON' : 'OFF'}, Status: ${e.status})`);
      });
      return;
    }
    
    console.log(`\n✅ Found exam: ${exam.title}`);
    console.log(`   ID: ${exam.id}`);
    console.log(`   Current proctoring status: ${exam.enableProctoring ? 'ENABLED' : 'DISABLED'}`);
    
    if (exam.enableProctoring) {
      console.log('\n✅ Proctoring is already enabled for this exam!');
      return;
    }
    
    // Enable proctoring
    const updated = await prisma.exam.update({
      where: { id: exam.id },
      data: {
        enableProctoring: true,
        maxTabSwitches: 3 // Set default max tab switches
      }
    });
    
    console.log(`\n✅ SUCCESS! Proctoring enabled for "${updated.title}"`);
    console.log(`   - AI Eye & Head Tracking: ON`);
    console.log(`   - Max Tab Switches: ${updated.maxTabSwitches}`);
    console.log(`\n🎥 Camera will now be required when students take this exam.`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

enableProctoring();
