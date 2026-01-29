#!/usr/bin/env node

/**
 * Script to add Batch 2028 students to the database
 * 
 * Usage:
 *   node backend/scripts/seed-batch-2028.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Data provided by user
const students = [
    { reg_no: '24CS171', name: 'Sabinesh', dob: '13/06/2006' },
    { reg_no: '24CS174', name: 'Sanjai. M', dob: '28/12/2006' },
    { reg_no: '24CS175', name: 'Sanjay krishnan', dob: '07/10/2006' },
    { reg_no: '24CS190', name: 'Sivakarthi. DR', dob: '03/12/2006' },
    { reg_no: '24CS186', name: 'Shamiksha', dob: '14/06/2006' },
    { reg_no: '24CS195', name: 'Shriharini', dob: '23/01/2007' },
    { reg_no: '24CS191', name: 'Sowmithradevi', dob: '27/01/2007' },
    { reg_no: '24CS203', name: 'Subiksha.E', dob: '07/03/2007' },
    { reg_no: '24CS177', name: 'Sanjay.S', dob: '04/10/2006' },
    { reg_no: '24CS187', name: 'Shiek mohideen', dob: '06/09/2006' },
    { reg_no: '24CS178', name: 'Sanjay.S', dob: '25/12/2006' },
    { reg_no: '24CS179', name: 'Sanjay.S', dob: '17/03/2007' },
    { reg_no: '24CS188', name: 'Shruthi. R', dob: '30/01/2006' },
    { reg_no: '24CS205', name: 'Sudhir. V', dob: '01/08/2007' },
    { reg_no: '24CS183', name: 'Sasidharan E', dob: '26/12/2006' },
    { reg_no: '24CS192', name: 'Sowmiya narayanan. A', dob: '28/04/2006' },
    { reg_no: '24CS197', name: 'Srihari R', dob: '06/04/2007' },
    { reg_no: '24CS199', name: 'Srimathi.C', dob: '03/11/2006' },
    { reg_no: '24CS200', name: 'Sriwin.S', dob: '01/01/2006' },
    { reg_no: '24CS209', name: 'Tharun Balaji.D', dob: '13/05/2007' },
    { reg_no: '24CS212', name: 'Thuthikumari.S', dob: '20/11/2006' },
    { reg_no: '24CS215', name: 'Varshan.K', dob: '01/01/2007' },
    { reg_no: '24CS216', name: 'Vasanth. UG', dob: '07/11/2006' },
    { reg_no: '24CS219', name: 'Vignesh.S', dob: '05/12/2006' },
    { reg_no: '24CS220', name: 'Vijayakumar.D', dob: '24/10/2006' },
    { reg_no: '24CS221', name: 'Vijay kumar R', dob: '18/05/2007' },
    { reg_no: '24CS222', name: 'Vijay lakshmi. MG', dob: '26/11/2007' },
    { reg_no: '24CS225', name: 'Yogeshwari.P', dob: '27/10/2006' },
    { reg_no: '24CSL30', name: 'Raqual.S', dob: '01/05/2007' },
    { reg_no: '24CSL31', name: 'Raqual.T', dob: '28/02/2005' },
    { reg_no: '24CSL32', name: 'Rajavel.S', dob: '28/04/2007' },
    { reg_no: '24CSL33', name: 'Rohith. M', dob: '15/04/2007' },
    { reg_no: '24CSL35', name: 'Suganth.S', dob: '29/12/2006' },
    { reg_no: '24CSL36', name: 'Suriya Prakash.S', dob: '15/07/2006' },
    { reg_no: '24CSL37', name: 'Thennarasan', dob: '20/03/2007' },
    { reg_no: '24CSL38', name: 'Vishwa. V', dob: '03/12/2004' },
    { reg_no: '24CSL40', name: 'Yogesh.S', dob: '30/12/2005' },
    { reg_no: '24CSL41', name: 'Yugotha.S', dob: '05/05/2007' },
    { reg_no: '24CST01', name: 'Yogesh.', dob: '16/05/2006' },
    { reg_no: '24CS172', name: 'Sabitha. M', dob: '30/04/2007' },
    { reg_no: '24CS214', name: 'Varsha', dob: '29/04/2007' },
];

async function main() {
    try {
        if (students.length === 0) {
            console.log('⚠️  No students found in the "students" array.');
            return;
        }

        console.log('='.repeat(60));
        console.log('📚 Seeding Batch 2028 Students');
        console.log('='.repeat(60));
        console.log(`Total students to process: ${students.length}\n`);

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const student of students) {
            try {
                if (!student.reg_no || !student.dob) {
                    throw new Error('Missing reg_no or dob');
                }

                // 1. Generate Email: reg_no + @nandhaengg.org
                const email = `${student.reg_no.toLowerCase()}@nandhaengg.org`;

                // 2. Password is DOB (should be in DD/MM/YYYY format)
                // Ensure simple hash of the plaintext DOB "DD/MM/YYYY" is used
                const passwordPlain = student.dob;
                const hashedPassword = await bcrypt.hash(passwordPlain, SALT_ROUNDS);

                // 3. Name
                const name = student.name || '';

                // Check if user exists
                const existingUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: email },
                            { reg_no: student.reg_no }
                        ]
                    }
                });

                if (existingUser) {
                    console.log(`🔄 Updating: ${student.reg_no} (${email})`);
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            reg_no: student.reg_no,
                            email: email, // ensure email matches reg_no pattern
                            name: name,
                            password: hashedPassword,
                            role: 'STUDENT',
                        }
                    });
                    updated++;
                } else {
                    console.log(`➕ Creating: ${student.reg_no} (${email})`);
                    await prisma.user.create({
                        data: {
                            reg_no: student.reg_no,
                            email: email,
                            name: name,
                            password: hashedPassword,
                            role: 'STUDENT',
                        }
                    });
                    created++;
                }

            } catch (error) {
                console.error(`❌ Error with ${student.reg_no}: ${error.message}`);
                errors.push({ reg_no: student.reg_no, error: error.message });
                skipped++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary');
        console.log(`✅ Created: ${created}`);
        console.log(`🔄 Updated: ${updated}`);
        console.log(`❌ Errors: ${skipped}`);
        console.log('='.repeat(60));

        if (errors.length > 0) {
            console.log('Errors details:');
            console.table(errors);
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
