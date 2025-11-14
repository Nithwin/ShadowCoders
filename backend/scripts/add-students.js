#!/usr/bin/env node

/**
 * Script to add students to the database
 * 
 * Usage:
 *   node scripts/add-students.js
 * 
 * This script:
 * - Creates email addresses like 22cs001@nandhaengg.org
 * - Uses DOB (DD-MM-YYYY) as password
 * - Handles existing students (updates if exists, creates if not)
 * - Sets role as STUDENT
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Student data
const students = [
  { student_reg_id: '22CS001', firstname: 'Abdul Samad', lastname: 'A', dob: '18-06-2004', parental_status: 'Both' },
  { student_reg_id: '22CS002', firstname: 'Abhinav', lastname: 'Suresh', dob: '19-07-2004', parental_status: 'Both' },
  { student_reg_id: '22CS003', firstname: 'Abhishek', lastname: 'Subi', dob: '12-08-2004', parental_status: 'Both' },
  
  { student_reg_id: '22CS005', firstname: 'Akkash', lastname: 'S', dob: '08-09-2004', parental_status: 'Both' },
  { student_reg_id: '22CS007', firstname: 'Arvinth', lastname: 'K R', dob: '15-06-2005', parental_status: 'Both' },
  { student_reg_id: '22CS008', firstname: 'Ashwini', lastname: 'K', dob: '15-03-2005', parental_status: 'Both' },
  { student_reg_id: '22CS009', firstname: 'Asma Rincy', lastname: 'A', dob: '22-01-2005', parental_status: 'Both' },
  { student_reg_id: '22CS010', firstname: 'Atchaya', lastname: 'V', dob: '11-05-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS011', firstname: 'Bharanidharan', lastname: 'B', dob: '04-09-2004', parental_status: 'Both' },
  { student_reg_id: '22CS012', firstname: 'T', lastname: 'Bharath', dob: '17-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS013', firstname: 'Chanthuru', lastname: 'S R', dob: '02-09-2004', parental_status: 'Both' },
  { student_reg_id: '22CS014', firstname: 'Darshan', lastname: 'V V', dob: '31-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS015', firstname: 'Deepa', lastname: 'R', dob: '25-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CS016', firstname: 'Deepika', lastname: 'R', dob: '06-12-2004', parental_status: 'Both' },
  { student_reg_id: '22CS017', firstname: 'Y', lastname: 'Deepika', dob: '20-07-2004', parental_status: 'Both' },
  { student_reg_id: '22CS018', firstname: 'Dhamodharan', lastname: 'S P', dob: '24-07-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS019', firstname: 'V', lastname: 'Dhanasree', dob: '16-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS020', firstname: 'Dhanuskh', lastname: 'R', dob: '07-04-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS021', firstname: 'R', lastname: 'Dharun Raj', dob: '25-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CS022', firstname: 'K B', lastname: 'Dharun Raj', dob: '15-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CS023', firstname: 'Dhesan', lastname: 'M', dob: '02-06-2005', parental_status: 'Both' },
  { student_reg_id: '22CS024', firstname: 'M', lastname: 'Dhilip', dob: '03-09-2003', parental_status: 'Both' },
  { student_reg_id: '22CS025', firstname: 'S', lastname: 'Ganga Devi', dob: '29-11-2004', parental_status: 'Father' },
  { student_reg_id: '22CS026', firstname: 'Gobika', lastname: 'S', dob: '04-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS027', firstname: 'Gokul', lastname: 'T', dob: '24-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CS028', firstname: 'Gokul', lastname: 'V', dob: '20-08-2005', parental_status: 'Both' },
  { student_reg_id: '22CS029', firstname: 'Hanushree', lastname: 'M', dob: '29-12-2004', parental_status: 'Both' },
  { student_reg_id: '22CS030', firstname: 'Hariprasad', lastname: 'M', dob: '23-06-2005', parental_status: 'Both' },
  { student_reg_id: '22CS031', firstname: 'Harshini', lastname: 'R', dob: '20-02-2005', parental_status: 'Both' },
  { student_reg_id: '22CS032', firstname: 'D', lastname: 'Jagan', dob: '14-09-2005', parental_status: 'Father' },
  { student_reg_id: '22CS033', firstname: 'Jai Krishnaa', lastname: 'R L', dob: '10-06-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS034', firstname: 'Janani', lastname: 'J', dob: '23-09-2004', parental_status: 'Both' },
  { student_reg_id: '22CS035', firstname: 'Jobika', lastname: 'V', dob: '18-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS036', firstname: 'Kalai Mugilan', lastname: 'B', dob: '26-06-2005', parental_status: 'Both' },
  { student_reg_id: '22CS037', firstname: 'Keerthana', lastname: 'R', dob: '16-09-2005', parental_status: 'Both' },
  { student_reg_id: '22CS038', firstname: 'Kishore', lastname: 'S', dob: '18-02-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS039', firstname: 'Kousikan', lastname: 'M', dob: '08-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS040', firstname: 'N M', lastname: 'Kowseeswarsena', dob: '04-08-2005', parental_status: 'Both' },
  { student_reg_id: '22CS042', firstname: 'Logeshkanna', lastname: 'R P', dob: '04-06-2005', parental_status: 'Both' },
  { student_reg_id: '22CS043', firstname: 'Magagayathri', lastname: 'S', dob: '07-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS044', firstname: 'Mahendhiran', lastname: 'S', dob: '23-09-2003', parental_status: 'Both' },
  { student_reg_id: '22CS045', firstname: 'MathirVishnu', lastname: 'L K', dob: '03-07-2003', parental_status: 'Both' },
  { student_reg_id: '22CS046', firstname: 'Miththun', lastname: 'E', dob: '19-04-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS047', firstname: 'Mohamed Ashfar', lastname: 'J', dob: '25-05-2004', parental_status: 'Both' },
  { student_reg_id: '22CS048', firstname: 'Mohan Kumar', lastname: 'G', dob: '01-01-2005', parental_status: 'Both' },
  { student_reg_id: '22CS049', firstname: 'Mohan', lastname: 'V', dob: '18-11-2003', parental_status: 'Both' },
  { student_reg_id: '22CS050', firstname: 'G', lastname: 'Mohana Prasath', dob: '08-08-2005', parental_status: 'Both' },
  { student_reg_id: '22CS051', firstname: 'K', lastname: 'Mouleeswaran', dob: '07-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS052', firstname: 'Muhammad Younus', lastname: 'A', dob: '03-01-2005', parental_status: 'Both' },
  { student_reg_id: '22CS053', firstname: 'Naajiya', lastname: 'K', dob: '16-09-2004', parental_status: 'Mother' },
  { student_reg_id: '22CS054', firstname: 'Naveenkumar', lastname: 'T', dob: '07-01-2005', parental_status: 'Both' },
  { student_reg_id: '22CS056', firstname: 'Nishanth', lastname: 'J S', dob: '24-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS057', firstname: 'Nishanthi', lastname: 'M', dob: '07-01-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS058', firstname: 'Nitharshana', lastname: 'R', dob: '03-03-2005', parental_status: 'Both' },
  { student_reg_id: '22CS059', firstname: 'Nivedharanjani', lastname: 'S', dob: '23-08-2004', parental_status: 'Mother' },
  { student_reg_id: '22CS060', firstname: 'Nivetha', lastname: 'T R', dob: '03-02-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS061', firstname: 'Olimathi', lastname: 'K M', dob: '31-07-2005', parental_status: 'Both' },
  { student_reg_id: '22CS062', firstname: 'Parveez', lastname: 'M', dob: '10-10-2004', parental_status: 'Mother' },
  { student_reg_id: '22CS063', firstname: 'S', lastname: 'Poovarasan', dob: '20-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS064', firstname: 'Poovish Raja', lastname: 'D', dob: '02-04-2005', parental_status: 'Both' },
  { student_reg_id: '22CS065', firstname: 'Pranesh Kumar', lastname: 'S', dob: '02-07-2004', parental_status: 'Both' },
  { student_reg_id: '22CS066', firstname: 'Pravin Kumar', lastname: 'S', dob: '16-07-2005', parental_status: 'Both' },
  { student_reg_id: '22CS067', firstname: 'S', lastname: 'Pravineshwar', dob: '10-01-2005', parental_status: 'Both' },
  { student_reg_id: '22CS068', firstname: 'Premkumar', lastname: 'A', dob: '08-07-2004', parental_status: 'Both' },
  { student_reg_id: '22CS069', firstname: 'Priyadarshikaa', lastname: 'E', dob: '15-09-2004', parental_status: 'Both' },
  { student_reg_id: '22CS070', firstname: 'Ragavendiran', lastname: 'S', dob: '13-02-2001', parental_status: 'Both' },
  { student_reg_id: '22CS071', firstname: 'Rahul', lastname: 'P', dob: '29-03-2005', parental_status: 'Both' },
  { student_reg_id: '22CS073', firstname: 'Ramanidharan', lastname: 'G', dob: '21-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS074', firstname: 'A', lastname: 'Rizwana Parveen', dob: '17-12-2004', parental_status: 'Both' },
  { student_reg_id: '22CS075', firstname: 'Rohith', lastname: 'S', dob: '09-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS076', firstname: 'Rudrakshh', lastname: 'S', dob: '22-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS077', firstname: 'K', lastname: 'Rumesh Kumaran', dob: '18-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS078', firstname: 'Saarumathi', lastname: 'T', dob: '31-08-2005', parental_status: 'Both' },
  { student_reg_id: '22CS079', firstname: 'S', lastname: 'Sabarimanikandan', dob: '07-02-2005', parental_status: 'Both' },
  { student_reg_id: '22CS080', firstname: 'Sabarinathan', lastname: 'K', dob: '10-10-2005', parental_status: 'Both' },
  { student_reg_id: '22CS081', firstname: 'Sabaritha', lastname: 'L', dob: '16-01-2005', parental_status: 'Both' },
  { student_reg_id: '22CS082', firstname: 'Sabintharan', lastname: 'S', dob: '09-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CS083', firstname: 'Sachin', lastname: 'K', dob: '18-03-2005', parental_status: 'Father' },
  { student_reg_id: '22CS084', firstname: 'Santhosh', lastname: 'S', dob: '01-04-2004', parental_status: 'Both' },
  { student_reg_id: '22CS085', firstname: 'Santhosh', lastname: 'S', dob: '12-02-2005', parental_status: 'Both' },
  { student_reg_id: '22CS086', firstname: 'Sathishkumar', lastname: 'M', dob: '26-03-2005', parental_status: 'Both' },
  { student_reg_id: '22CS087', firstname: 'M', lastname: 'Sathiyasudhan', dob: '14-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS088', firstname: 'Sharmila', lastname: 'B', dob: '26-03-2005', parental_status: 'Both' },
  { student_reg_id: '22Cs089', firstname: 'Shrivarshini', lastname: 'M', dob: '12-02-2005', parental_status: 'Both' },
  { student_reg_id: '22CS090', firstname: 'Shriram', lastname: 'S', dob: '25-07-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS091', firstname: 'Siva Harine', lastname: 'S', dob: '29-12-2004', parental_status: 'Both' },
  { student_reg_id: '22CS092', firstname: 'Sneha', lastname: 'R', dob: '20-12-2004', parental_status: 'Both' },
  { student_reg_id: '22CS093', firstname: 'Sornambika', lastname: 'R', dob: '19-10-2005', parental_status: 'Mother' },
  { student_reg_id: '22CS094', firstname: 'SOWBARNIKA', lastname: 'A', dob: '07-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS095', firstname: 'Sowmiya Devi', lastname: 'P', dob: '06-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS096', firstname: 'A', lastname: 'Sowmya', dob: '30-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS097', firstname: 'G', lastname: 'Sri Vignesh', dob: '25-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS098', firstname: 'Sriman', lastname: 'P', dob: '05-05-2004', parental_status: 'Both' },
  { student_reg_id: '22CS099', firstname: 'Srinivash', lastname: 'A K', dob: '21-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS100', firstname: 'Subasree', lastname: 'S', dob: '30-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS101', firstname: 'Subhashree', lastname: 'D', dob: '10-08-2005', parental_status: 'Both' },
  { student_reg_id: '22CS102', firstname: 'Suganth', lastname: 'S G', dob: '30-09-2004', parental_status: 'Both' },
  { student_reg_id: '22CS103', firstname: 'Sumithra', lastname: 'E', dob: '20-11-2004', parental_status: 'Mother' },
  { student_reg_id: '22CS104', firstname: 'Surendar', lastname: 'N', dob: '30-06-2005', parental_status: 'Both' },
  { student_reg_id: '22CS106', firstname: 'Surya', lastname: 'B', dob: '30-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS107', firstname: 'Suvetha', lastname: 'S', dob: '07-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CS108', firstname: 'Udhay Karthik', lastname: 'C', dob: '14-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS109', firstname: 'Vanaraj', lastname: 'K', dob: '28-01-2005', parental_status: 'Both' },
  { student_reg_id: '22CS110', firstname: 'Vidhya', lastname: 'N', dob: '09-08-2004', parental_status: 'Both' },
  { student_reg_id: '22CS111', firstname: 'Vikashini', lastname: 'A', dob: '03-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CS112', firstname: 'Vishnu', lastname: 'A', dob: '24-06-2005', parental_status: 'Both' },
  { student_reg_id: '22CS113', firstname: 'P G', lastname: 'Vishnuprabha', dob: '21-10-2005', parental_status: 'Both' },
  { student_reg_id: '22CS114', firstname: 'Prakashraj', lastname: 'B', dob: '12-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CS115', firstname: 'Kowshick', lastname: 'C', dob: '28-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CS116', firstname: 'Mayakrishnan', lastname: 'A', dob: '28-04-2004', parental_status: 'Both' },
  { student_reg_id: '22CS117', firstname: 'V', lastname: 'Shalini', dob: '30-05-2005', parental_status: 'Both' },
  { student_reg_id: '22CSL01', firstname: 'S', lastname: 'Anand', dob: '07-03-2005', parental_status: 'Both' },
  { student_reg_id: '22CSL02', firstname: 'M', lastname: 'Arnald', dob: '28-07-2003', parental_status: 'Both' },
  { student_reg_id: '22CSL03', firstname: 'A S', lastname: 'Hariniga', dob: '17-11-2004', parental_status: 'Both' },
  { student_reg_id: '22CSL04', firstname: 'P S', lastname: 'Janarthanan', dob: '03-07-2004', parental_status: 'Both' },
  { student_reg_id: '22CSL05', firstname: 'R', lastname: 'Lavanya', dob: '04-04-2003', parental_status: 'Both' },
  { student_reg_id: '22CSL06', firstname: 'R', lastname: 'Madhanprasanth', dob: '03-06-2004', parental_status: 'Both' },
  { student_reg_id: '22CSL07', firstname: 'S', lastname: 'Mohamed Irfan', dob: '11-10-2004', parental_status: 'Both' },
  { student_reg_id: '22CSL08', firstname: 'S', lastname: 'Prabhu', dob: '28-03-2002', parental_status: 'Both' },
  { student_reg_id: '22CSL09', firstname: 'V', lastname: 'Raahul', dob: '20-03-2003', parental_status: 'Both' },
  { student_reg_id: '22CSL10', firstname: 'Santhosh', lastname: 'S', dob: '26-02-2003', parental_status: 'Both' },
  { student_reg_id: '22CSL11', firstname: 'Sowbharanidharan', lastname: 'T', dob: '25-09-2002', parental_status: 'Both' },
  { student_reg_id: '22CSL12', firstname: 'Vetrivel', lastname: 'E', dob: '11-04-2005', parental_status: 'Both' },
  { student_reg_id: '22CSL13', firstname: 'S', lastname: 'Senthilkumar', dob: '11-10-2002', parental_status: 'Both' },
];

async function addStudents() {
  try {
    if (students.length === 0) {
      console.log('⚠️  No students found');
      return;
    }

    console.log('='.repeat(60));
    console.log('📚 Adding Students to Database');
    console.log('='.repeat(60));
    console.log(`Total students to process: ${students.length}\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const student of students) {
      try {
        // Generate email: lowercase reg_id + @nandhaengg.org
        const email = `${student.student_reg_id.toLowerCase()}@nandhaengg.org`;
        
        // Combine firstname and lastname for full name
        const fullName = `${student.firstname} ${student.lastname}`.trim();
        
        // Validate DOB format
        if (!student.dob) {
          throw new Error('DOB is missing');
        }

        // DOB is the password (format: DD/MM/YYYY - convert from DD-MM-YYYY)
        const password = student.dob.replace(/-/g, '/');

        // Check if user already exists by email or reg_no
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: email },
              { reg_no: student.student_reg_id }
            ]
          }
        });

        if (existingUser) {
          // Update existing user
          console.log(`🔄 Updating existing student: ${student.student_reg_id} (${email})`);
          
          // Hash password if it's different
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              reg_no: student.student_reg_id,
              email: email,
              name: fullName,
              password: hashedPassword,
              role: 'STUDENT',
            }
          });
          
          updated++;
        } else {
          // Create new user
          console.log(`➕ Creating new student: ${student.student_reg_id} (${email})`);
          
          // Hash password
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          
          await prisma.user.create({
            data: {
              reg_no: student.student_reg_id,
              email: email,
              name: fullName,
              password: hashedPassword,
              role: 'STUDENT',
            }
          });
          
          created++;
        }
      } catch (error) {
        const errorMsg = `Error processing ${student.student_reg_id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ student_reg_id: student.student_reg_id, error: error.message });
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${skipped}`);
    console.log('='.repeat(60) + '\n');

    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach(({ student_reg_id, error }) => {
        console.log(`   ${student_reg_id}: ${error}`);
      });
      console.log('');
    }

    console.log('✅ Student import completed!\n');
    console.log('📝 Login Information:');
    console.log('   Email format: <reg_id>@nandhaengg.org (e.g., 22cs001@nandhaengg.org)');
    console.log('   Password: DOB in DD/MM/YYYY format (e.g., 18/06/2004)');
    console.log('   Students can also login with Google using the same email address\n');

  } catch (error) {
    console.error('\n❌ Fatal error:');
    if (error.code === 'P1001') {
      console.error('   Database connection failed. Check your DATABASE_URL in .env');
    } else {
      console.error('   ' + error.message);
    }
    console.error('\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addStudents();
