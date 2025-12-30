const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const EXCEL_FILE_PATH = String.raw`c:\Users\vmnit\Desktop\ShadowCoders\2027 CSE DB.xlsx`;
const OUTPUT_FILE_PATH = path.join(__dirname, 'add-2027-students-static.js');

async function generate() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE_PATH);
    const worksheet = workbook.getWorksheet(1);
    
    const students = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 1) return; // Skip header

        // Cols: 2=RegNo, 3=Name, 4=DOB
        const regNoRaw = row.getCell(2).value;
        const nameRaw = row.getCell(3).value;
        const dobRaw = row.getCell(4).value;

        if (!regNoRaw || !nameRaw) return;

        const regNo = String(regNoRaw).trim();
        const name = String(nameRaw).trim();
        
        // Password logic
        let password = 'password'; 
        if (dobRaw instanceof Date) {
            const day = String(dobRaw.getDate()).padStart(2, '0');
            const month = String(dobRaw.getMonth() + 1).padStart(2, '0');
            const year = dobRaw.getFullYear();
            password = `${day}/${month}/${year}`;
        } else if (typeof dobRaw === 'string') {
             password = dobRaw.trim().replace(/-/g, '/');
        }

        students.push({
            reg_no: regNo,
            name: name,
            password: password
        });
    });

    const fileContent = `#!/usr/bin/env node

/**
 * Static script to add 2027 CSE students
 * Generated on: ${new Date().toISOString()}
 * 
 * Usage: npm run add:2027-students
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const STUDENTS = ${JSON.stringify(students, null, 2)};

async function main() {
    try {
        console.log('='.repeat(60));
        console.log('📚 Adding 2027 CSE Students (Static Import)');
        console.log('='.repeat(60));
        console.log(\`Total records: \${STUDENTS.length}\\n\`);

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const student of STUDENTS) {
            try {
                const email = \`\${student.reg_no.toLowerCase()}@nandhaengg.org\`;
                const hashedPassword = await bcrypt.hash(student.password, SALT_ROUNDS);

                const existing = await prisma.user.findFirst({
                    where: { OR: [{ email }, { reg_no: student.reg_no }] }
                });

                if (existing) {
                    await prisma.user.update({
                        where: { id: existing.id },
                        data: {
                            reg_no: student.reg_no,
                            email,
                            name: student.name,
                            password: hashedPassword,
                            role: 'STUDENT'
                        }
                    });
                    updated++;
                } else {
                    await prisma.user.create({
                        data: {
                            reg_no: student.reg_no,
                            email,
                            name: student.name,
                            password: hashedPassword,
                            role: 'STUDENT'
                        }
                    });
                    created++;
                }
                // console.log(\`Processed: \${student.reg_no}\`);
            } catch (err) {
                console.error(\`❌ Error \${student.reg_no}: \${err.message}\`);
                skipped++;
            }
        }

        console.log('\\n' + '='.repeat(60));
        console.log('📊 Summary');
        console.log(\`✅ Created: \${created}\`);
        console.log(\`🔄 Updated: \${updated}\`);
        console.log(\`❌ Errors: \${skipped}\`);
        console.log('='.repeat(60));

    } catch (err) {
        console.error('Fatal:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
`;

    fs.writeFileSync(OUTPUT_FILE_PATH, fileContent);
    console.log(`Generated ${OUTPUT_FILE_PATH} with ${students.length} students.`);
}

generate().catch(console.error);
