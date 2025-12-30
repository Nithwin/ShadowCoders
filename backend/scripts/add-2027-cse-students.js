#!/usr/bin/env node

/**
 * Script to add 2027 CSE students to the database from Excel
 * 
 * Usage:
 *   node scripts/add-2027-cse-students.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const EXCEL_FILE_PATH = String.raw`c:\Users\vmnit\Desktop\ShadowCoders\2027 CSE DB.xlsx`;

async function addStudents() {
  try {
    console.log('='.repeat(60));
    console.log('📚 Adding 2027 CSE Students from Excel');
    console.log('='.repeat(60));
    console.log(`File: ${EXCEL_FILE_PATH}\n`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE_PATH);
    const worksheet = workbook.getWorksheet(1); // Assume first sheet

    if (!worksheet) {
      throw new Error('No worksheet found in the Excel file');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    // Iterate over rows starting from row 2 (skipping header)
    // We can use worksheet.eachRow but we need to skip header
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        rows.push(row);
      }
    });

    console.log(`Total rows found: ${rows.length}\n`);

    for (const row of rows) {
      // Columns based on inspection:
      // Col 2: REGISTER NUMBER
      // Col 3: STUDENT NAME
      // Col 4: DATE OF BIRTH
      
      const regNoRaw = row.getCell(2).value;
      const nameRaw = row.getCell(3).value;
      const dobRaw = row.getCell(4).value;

      if (!regNoRaw || !nameRaw) {
        skipped++;
        continue; // Skip empty rows
      }

      const regNo = String(regNoRaw).trim();
      const name = String(nameRaw).trim();
      
      try {
        // Generate email: reg_no + @nandhaengg.org
        const email = `${regNo.toLowerCase()}@nandhaengg.org`;
        
        let password;
        if (dobRaw instanceof Date) {
            // Format Date object to DD/MM/YYYY
            const day = String(dobRaw.getDate()).padStart(2, '0');
            const month = String(dobRaw.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
            const year = dobRaw.getFullYear();
            password = `${day}/${month}/${year}`;
        } else if (typeof dobRaw === 'string') {
            // If it's a string, try to parse or use as is if it matches format
             // The user mentioned "i want like 13/11/2004"
             // If excel stored it as string, we might need to be careful
             // Assuming for now it comes as Date from Excel usually, or we format the string
             password = dobRaw.trim(); 
             // If it is delimited by -, replace with /
             password = password.replace(/-/g, '/');
        } else {
             // Fallback or error
             throw new Error(`Invalid DOB format: ${dobRaw}`);
        }

        console.log(`Processing: ${regNo} - ${name} - DOB: ${password}`);

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: email },
              { reg_no: regNo }
            ]
          }
        });

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        if (existingUser) {
          // Update existing user
          // console.log(`🔄 Updating: ${regNo}`);
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              reg_no: regNo,
              email: email,
              name: name,
              password: hashedPassword,
              role: 'STUDENT',
            }
          });
          updated++;
        } else {
          // Create new user
          // console.log(`➕ Creating: ${regNo}`);
          await prisma.user.create({
            data: {
              reg_no: regNo,
              email: email,
              name: name,
              password: hashedPassword,
              role: 'STUDENT',
            }
          });
          created++;
        }

      } catch (error) {
        const errorMsg = `Error processing ${regNo}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ regNo, error: error.message });
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors/Skipped: ${skipped}`);
    console.log('='.repeat(60) + '\n');

    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach(({ regNo, error }) => {
        console.log(`   ${regNo}: ${error}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addStudents();
