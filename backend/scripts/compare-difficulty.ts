
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const searchTerms = ['Placement Test 3rd Year C Section', 'placement_test_cse_3rd_year'];

    console.log('Searching for exams...');

    const exams = await prisma.exam.findMany({
        where: {
            OR: searchTerms.map(term => ({
                title: { contains: term, mode: 'insensitive' }
            }))
        },
        include: {
            questions: true
        }
    });

    if (exams.length === 0) {
        console.log('No exams found matching:', searchTerms.join(', '));
        return;
    }

    for (const exam of exams) {
        console.log(`\n------------------------------------------------`);
        console.log(`Title: ${exam.title}`);
        console.log(`Total Questions: ${exam.questions.length}`);

        let totalPoints = 0;
        const typeCount: Record<string, number> = {};

        exam.questions.forEach(q => {
            totalPoints += Number(q.points);
            typeCount[q.type] = (typeCount[q.type] || 0) + 1;
        });

        console.log(`Total Points: ${totalPoints}`);
        console.log('Question Breakdown:');
        Object.entries(typeCount).forEach(([type, count]) => {
            console.log(`  - ${type}: ${count}`);
        });

        // List Coding questions specifically as they are usually harder
        const codingQuestions = exam.questions.filter(q => q.type === 'CODING');
        if (codingQuestions.length > 0) {
            console.log('Coding Questions Details:');
            codingQuestions.forEach(q => {
                const prompt = q.prompt || 'No Prompt';
                console.log(`  - [${q.points}pts] ${prompt.substring(0, 50)}...`);
            });
        }
    }
}

main()
    .catch(e => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
