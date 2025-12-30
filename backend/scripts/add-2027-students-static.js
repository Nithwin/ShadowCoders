#!/usr/bin/env node

/**
 * Static script to add 2027 CSE students
 * Generated on: 2025-12-29T17:09:53.619Z
 * 
 * Usage: npm run add:2027-students
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const STUDENTS = [
  {
    "reg_no": "23CS001",
    "name": "AAYISHA MAHIRA K",
    "password": "01/02/2006"
  },
  {
    "reg_no": "23CS002",
    "name": "AKASH K",
    "password": "15/06/2006"
  },
  {
    "reg_no": "23CS003",
    "name": "ANITHA AR",
    "password": "11/12/2005"
  },
  {
    "reg_no": "23CS004",
    "name": "ATHULYA G",
    "password": "21/02/2005"
  },
  {
    "reg_no": "23CS005",
    "name": "BALAHARIHARAN S",
    "password": "02/10/2003"
  },
  {
    "reg_no": "23CS006",
    "name": "BHARATHI PRIYA V",
    "password": "15/08/2005"
  },
  {
    "reg_no": "23CS007",
    "name": "BHARATHKUMAR J A",
    "password": "20/10/2004"
  },
  {
    "reg_no": "23CS009",
    "name": "DEEPIKA G",
    "password": "19/09/2004"
  },
  {
    "reg_no": "23CS010",
    "name": "DEEPIKA S",
    "password": "27/12/2005"
  },
  {
    "reg_no": "23CS011",
    "name": "DEVENDAR A",
    "password": "06/01/2006"
  },
  {
    "reg_no": "23CS012",
    "name": "DHANUSRI G K",
    "password": "28/09/2005"
  },
  {
    "reg_no": "23CS013",
    "name": "DHARANI S",
    "password": "14/10/2005"
  },
  {
    "reg_no": "23CS014",
    "name": "DHARSHINI K",
    "password": "24/02/2006"
  },
  {
    "reg_no": "23CS015",
    "name": "DHINESH S",
    "password": "01/10/2006"
  },
  {
    "reg_no": "23CS016",
    "name": "ELANGOVAN S",
    "password": "08/10/2005"
  },
  {
    "reg_no": "23CS017",
    "name": "M.ELAVARASAN",
    "password": "11/09/2005"
  },
  {
    "reg_no": "23CS018",
    "name": "FATHIMA MAAHIRA M",
    "password": "15/12/2005"
  },
  {
    "reg_no": "23CS019",
    "name": "GOKUL L",
    "password": "21/05/2006"
  },
  {
    "reg_no": "23CS020",
    "name": "HARINIVYA M",
    "password": "18/12/2005"
  },
  {
    "reg_no": "23CS021",
    "name": "HEMA A C",
    "password": "04/05/2006"
  },
  {
    "reg_no": "23CS022",
    "name": "JASWANTH V",
    "password": "19/08/2006"
  },
  {
    "reg_no": "23CS023",
    "name": "JAYESH R",
    "password": "25/02/2006"
  },
  {
    "reg_no": "23CS024",
    "name": "JEKAN N",
    "password": "14/09/2005"
  },
  {
    "reg_no": "23CS025",
    "name": "KARTHICK C",
    "password": "13/12/2005"
  },
  {
    "reg_no": "23CS026",
    "name": "KAVIKUMAR M",
    "password": "07/03/2006"
  },
  {
    "reg_no": "23CS027",
    "name": "KAVINESWARAN P",
    "password": "22/04/2006"
  },
  {
    "reg_no": "23CS028",
    "name": "KAVINKUMAR S",
    "password": "18/08/2005"
  },
  {
    "reg_no": "23CS029",
    "name": "KAVIYA S",
    "password": "04/06/2005"
  },
  {
    "reg_no": "23CS030",
    "name": "KIRUTHIKA V",
    "password": "13/10/2005"
  },
  {
    "reg_no": "23CS031",
    "name": "KISHORE ABINASH A",
    "password": "28/08/2005"
  },
  {
    "reg_no": "23CS032",
    "name": "KISHOREKUMAR A",
    "password": "30/01/2006"
  },
  {
    "reg_no": "23CS033",
    "name": "LOKITH KUMAR S",
    "password": "19/10/2005"
  },
  {
    "reg_no": "23CS034",
    "name": "MANIBHARATHI A",
    "password": "13/03/2006"
  },
  {
    "reg_no": "23CS035",
    "name": "S.MOHID",
    "password": "11/07/2005"
  },
  {
    "reg_no": "23CS036",
    "name": "MONIKA R",
    "password": "18/12/2005"
  },
  {
    "reg_no": "23CS037",
    "name": "NANDHINI K",
    "password": "16/09/2004"
  },
  {
    "reg_no": "23CS038",
    "name": "NITHYA V",
    "password": "11/09/2005"
  },
  {
    "reg_no": "23CS039",
    "name": "PHURNES M S",
    "password": "27/02/2005"
  },
  {
    "reg_no": "23CS040",
    "name": "PRABANJAN J",
    "password": "24/12/2005"
  },
  {
    "reg_no": "23CS041",
    "name": "PREETHI.K",
    "password": "08/05/2006"
  },
  {
    "reg_no": "23CS043",
    "name": "RAMESH S",
    "password": "04/07/2006"
  },
  {
    "reg_no": "23CS044",
    "name": "RASWANDH S S",
    "password": "18/02/2006"
  },
  {
    "reg_no": "23CS045",
    "name": "RIDUVARSHINI.I.M",
    "password": "05/04/2006"
  },
  {
    "reg_no": "23CS046",
    "name": "RIJU S",
    "password": "27/06/2005"
  },
  {
    "reg_no": "23CS047",
    "name": "RITHANYA P",
    "password": "28/11/2005"
  },
  {
    "reg_no": "23CS048",
    "name": "RITHIKA S",
    "password": "18/02/2006"
  },
  {
    "reg_no": "23CS049",
    "name": "SANJAY GOPAL J",
    "password": "29/03/2006"
  },
  {
    "reg_no": "23CS050",
    "name": "SATHANA N",
    "password": "21/01/2006"
  },
  {
    "reg_no": "23CS051",
    "name": "SATHISH S",
    "password": "16/04/2005"
  },
  {
    "reg_no": "23CS052",
    "name": "SAVITHA U",
    "password": "31/01/2006"
  },
  {
    "reg_no": "23CS053",
    "name": "SHALINI K",
    "password": "14/07/2005"
  },
  {
    "reg_no": "23CS054",
    "name": "SOWMIYA M",
    "password": "12/09/2006"
  },
  {
    "reg_no": "23CS055",
    "name": "SUBARANJANI S",
    "password": "12/12/2005"
  },
  {
    "reg_no": "23CS056",
    "name": "SUPRIYA M",
    "password": "20/06/2006"
  },
  {
    "reg_no": "23CS057",
    "name": "SUSMITHA S",
    "password": "18/03/2006"
  },
  {
    "reg_no": "23CS058",
    "name": "TAMIL ALAGAN L",
    "password": "10/10/2005"
  },
  {
    "reg_no": "23CS059",
    "name": "TAMILSELVAN K",
    "password": "15/10/2004"
  },
  {
    "reg_no": "23CS060",
    "name": "THAARANYAASHREE S",
    "password": "18/06/2006"
  },
  {
    "reg_no": "23CS061",
    "name": "VASAVI.N",
    "password": "23/09/2005"
  },
  {
    "reg_no": "23CS062",
    "name": "VIKASINI R",
    "password": "18/10/2005"
  },
  {
    "reg_no": "23CS063",
    "name": "VIKNEASH M",
    "password": "10/05/2005"
  },
  {
    "reg_no": "23CS064",
    "name": "VIMAL P",
    "password": "02/04/2006"
  },
  {
    "reg_no": "23CS065",
    "name": "VINOTH E",
    "password": "21/10/2005"
  },
  {
    "reg_no": "23CS066",
    "name": "VISHNU SELVAN M",
    "password": "26/03/2006"
  },
  {
    "reg_no": "23CS067",
    "name": "AAKASH S P",
    "password": "26/12/2004"
  },
  {
    "reg_no": "23CS068",
    "name": "ABHINANDAN S",
    "password": "25/11/2005"
  },
  {
    "reg_no": "23CS069",
    "name": "ABINAYA R",
    "password": "13/06/2006"
  },
  {
    "reg_no": "23CS070",
    "name": "ABISHEK R V",
    "password": "02/04/2006"
  },
  {
    "reg_no": "23CS071",
    "name": "AKILAN MK",
    "password": "12/04/2006"
  },
  {
    "reg_no": "23CS073",
    "name": "ARIPRASATH M",
    "password": "09/04/2006"
  },
  {
    "reg_no": "23CS074",
    "name": "ARUNESH S S",
    "password": "06/02/2006"
  },
  {
    "reg_no": "23CS075",
    "name": "ASHWANTH A",
    "password": "01/03/2006"
  },
  {
    "reg_no": "23CS076",
    "name": "ASHWIN S",
    "password": "29/04/2006"
  },
  {
    "reg_no": "23CS077",
    "name": "BALASANJEEV C",
    "password": "10/08/2005"
  },
  {
    "reg_no": "23CS078",
    "name": "BARATH V R",
    "password": "11/04/2006"
  },
  {
    "reg_no": "23CS079",
    "name": "CHANDRU V",
    "password": "20/06/2006"
  },
  {
    "reg_no": "23CS080",
    "name": "DEEPAK R",
    "password": "02/06/2006"
  },
  {
    "reg_no": "23CS081",
    "name": "DHARINEESH S",
    "password": "11/02/2006"
  },
  {
    "reg_no": "23CS082",
    "name": "DHIVYA S",
    "password": "24/01/2006"
  },
  {
    "reg_no": "23CS083",
    "name": "DINESH J",
    "password": "16/01/2006"
  },
  {
    "reg_no": "23CS084",
    "name": "GOBINATH M",
    "password": "20/11/2005"
  },
  {
    "reg_no": "23CS085",
    "name": "GOMALA P",
    "password": "20/05/2006"
  },
  {
    "reg_no": "23CS086",
    "name": "HARIHARAN S",
    "password": "28/06/2006"
  },
  {
    "reg_no": "23CS087",
    "name": "HARSHAVARTHINI K",
    "password": "30/05/2006"
  },
  {
    "reg_no": "23CS088",
    "name": "HEMALATHA S",
    "password": "11/11/2006"
  },
  {
    "reg_no": "23CS090",
    "name": "KAVYA SHREE A",
    "password": "12/01/2006"
  },
  {
    "reg_no": "23CS091",
    "name": "J.KISHOREKUMAR",
    "password": "11/05/2005"
  },
  {
    "reg_no": "23CS092",
    "name": "KISHORE T",
    "password": "22/10/2005"
  },
  {
    "reg_no": "23CS094",
    "name": "MALATHI R",
    "password": "21/12/2005"
  },
  {
    "reg_no": "23CS095",
    "name": "MEIAKASH B",
    "password": "01/06/2006"
  },
  {
    "reg_no": "23CS096",
    "name": "MOHAMED NAEEM. S",
    "password": "29/08/2005"
  },
  {
    "reg_no": "23CS097",
    "name": "MOHITH V",
    "password": "28/10/2005"
  },
  {
    "reg_no": "23CS098",
    "name": "NAKSHATRA",
    "password": "03/07/2006"
  },
  {
    "reg_no": "23CS099",
    "name": "NAKSHATRA PRIYA L.R",
    "password": "28/12/2005"
  },
  {
    "reg_no": "23CS100",
    "name": "NANDHANA A K",
    "password": "20/03/2006"
  },
  {
    "reg_no": "23CS101",
    "name": "NETHAJI M",
    "password": "29/12/2005"
  },
  {
    "reg_no": "23CS102",
    "name": "NISHANTHRAJ M",
    "password": "10/06/2006"
  },
  {
    "reg_no": "23CS103",
    "name": "NITHYASHREE R S",
    "password": "21/02/2006"
  },
  {
    "reg_no": "23CS104",
    "name": "PERARASU M",
    "password": "21/07/2005"
  },
  {
    "reg_no": "23CS105",
    "name": "POOJA SHREE R",
    "password": "17/02/2006"
  },
  {
    "reg_no": "23CS106",
    "name": "POOJA SURUTHIKA T",
    "password": "14/03/2006"
  },
  {
    "reg_no": "23CS107",
    "name": "PRAVEEN M",
    "password": "08/03/2006"
  },
  {
    "reg_no": "23CS108",
    "name": "RAGAVI M",
    "password": "10/12/2005"
  },
  {
    "reg_no": "23CS109",
    "name": "RAVIVARMAN.S",
    "password": "16/05/2006"
  },
  {
    "reg_no": "23CS110",
    "name": "SHANMUGAVEL R",
    "password": "18/06/2006"
  },
  {
    "reg_no": "23CS111",
    "name": "SHASTHIKA SP",
    "password": "12/04/2006"
  },
  {
    "reg_no": "23CS112",
    "name": "SHREESABARI S",
    "password": "04/03/2005"
  },
  {
    "reg_no": "23CS113",
    "name": "SIBINISHWANTH S",
    "password": "26/10/2005"
  },
  {
    "reg_no": "23CS114",
    "name": "SIVABALASUBRAMANIAN",
    "password": "07/02/2006"
  },
  {
    "reg_no": "23CS115",
    "name": "SONIA M",
    "password": "21/06/2005"
  },
  {
    "reg_no": "23CS116",
    "name": "SOORYA S",
    "password": "02/07/2005"
  },
  {
    "reg_no": "23CS117",
    "name": "SRIDHAR. B M",
    "password": "13/11/2005"
  },
  {
    "reg_no": "23CS118",
    "name": "SRINNETHI R D",
    "password": "26/07/2005"
  },
  {
    "reg_no": "23CS119",
    "name": "SUBARANJANI N",
    "password": "22/03/2006"
  },
  {
    "reg_no": "23CS120",
    "name": "SUMAYA A",
    "password": "12/07/2005"
  },
  {
    "reg_no": "23CS121",
    "name": "M.R.THARANEESH",
    "password": "11/03/2006"
  },
  {
    "reg_no": "23CS122",
    "name": "THARUN A",
    "password": "15/07/2005"
  },
  {
    "reg_no": "23CS123",
    "name": "UMMU KULSU A",
    "password": "24/07/2006"
  },
  {
    "reg_no": "23CS124",
    "name": "VARSHA K",
    "password": "14/12/2005"
  },
  {
    "reg_no": "23CS125",
    "name": "VARSHINI S",
    "password": "14/12/2005"
  },
  {
    "reg_no": "23CS126",
    "name": "VARUN S",
    "password": "30/06/2006"
  },
  {
    "reg_no": "23CS128",
    "name": "VIJAY SURYA C",
    "password": "15/11/2005"
  },
  {
    "reg_no": "23CS129",
    "name": "VIJAYALAKSHIMI V",
    "password": "10/06/2006"
  },
  {
    "reg_no": "23CS130",
    "name": "VISHAL C",
    "password": "21/08/2004"
  },
  {
    "reg_no": "23CS131",
    "name": "VISWAACSENAR J",
    "password": "18/01/2006"
  },
  {
    "reg_no": "23CS132",
    "name": "YOGIRAM S",
    "password": "16/05/2006"
  },
  {
    "reg_no": "23CS133",
    "name": "AKSHAYA D",
    "password": "25/12/2005"
  },
  {
    "reg_no": "23CS134",
    "name": "ARAVIND L",
    "password": "20/08/2005"
  },
  {
    "reg_no": "23CS136",
    "name": "BHARANEETHARAN P T",
    "password": "23/03/2006"
  },
  {
    "reg_no": "23CS137",
    "name": "BHARATH G A",
    "password": "19/01/2006"
  },
  {
    "reg_no": "23CS138",
    "name": "DEVVISHAL V A",
    "password": "23/01/2006"
  },
  {
    "reg_no": "23CS139",
    "name": "DHARASRI R",
    "password": "13/06/2006"
  },
  {
    "reg_no": "23CS140",
    "name": "DHARINEESH PA",
    "password": "21/08/2005"
  },
  {
    "reg_no": "23CS141",
    "name": "DHASHIN S S",
    "password": "16/08/2005"
  },
  {
    "reg_no": "23CS142",
    "name": "GOWTHAM S",
    "password": "28/09/2005"
  },
  {
    "reg_no": "23CS144",
    "name": "JOTHIPRAKASH P",
    "password": "06/12/2005"
  },
  {
    "reg_no": "23CS145",
    "name": "KARTHIK S",
    "password": "08/03/2006"
  },
  {
    "reg_no": "23CS147",
    "name": "KESAVAN K",
    "password": "25/10/2005"
  },
  {
    "reg_no": "23CS148",
    "name": "KIRUTHIKHA S",
    "password": "11/05/2005"
  },
  {
    "reg_no": "23CS150",
    "name": "MOHAMED ABUBAKKAR SIDDIQ A",
    "password": "03/01/2006"
  },
  {
    "reg_no": "23CS151",
    "name": "MOHAMMED MANASHIK Z",
    "password": "30/07/2005"
  },
  {
    "reg_no": "23CS152",
    "name": "MUGILAN VS",
    "password": "17/01/2006"
  },
  {
    "reg_no": "23CS153",
    "name": "MUKUNTAN R S",
    "password": "13/06/2005"
  },
  {
    "reg_no": "23CS154",
    "name": "NANDHA ABISHEK P",
    "password": "01/12/2005"
  },
  {
    "reg_no": "23CS155",
    "name": "NAVEEN KRISHNAN M",
    "password": "14/05/2005"
  },
  {
    "reg_no": "23CS156",
    "name": "PRABANJAN",
    "password": "23/02/2006"
  },
  {
    "reg_no": "23CS157",
    "name": "PRABHANJAN R",
    "password": "10/07/2006"
  },
  {
    "reg_no": "23CS158",
    "name": "RAGHU K E",
    "password": "01/11/2005"
  },
  {
    "reg_no": "23CS162",
    "name": "SAKTHI SABARIESWAR M S",
    "password": "12/03/2005"
  },
  {
    "reg_no": "23CS163",
    "name": "SANTHOSH DINAKARAN",
    "password": "24/05/2006"
  },
  {
    "reg_no": "23CS164",
    "name": "SASIKUMAR.D",
    "password": "16/06/2005"
  },
  {
    "reg_no": "23CS166",
    "name": "M.SHALINI",
    "password": "01/03/2006"
  },
  {
    "reg_no": "23CS167",
    "name": "SHALINI N",
    "password": "20/05/2006"
  },
  {
    "reg_no": "23CS168",
    "name": "SHRI KAVIYA VARSHINI R",
    "password": "26/09/2005"
  },
  {
    "reg_no": "23CS169",
    "name": "SOWBARNIKA",
    "password": "04/03/2006"
  },
  {
    "reg_no": "23CS170",
    "name": "SREERAMKUMAR K",
    "password": "12/11/2005"
  },
  {
    "reg_no": "23CS171",
    "name": "SRINITHI R",
    "password": "29/06/2006"
  },
  {
    "reg_no": "23CS172",
    "name": "SUDHEKSHA S",
    "password": "24/05/2006"
  },
  {
    "reg_no": "23CS173",
    "name": "A SUJITH KRISHNA",
    "password": "14/08/2006"
  },
  {
    "reg_no": "23CS174",
    "name": "SUPRATHA BHOOPATHI",
    "password": "14/11/2005"
  },
  {
    "reg_no": "23CS175",
    "name": "THARSSAN SRIRAM C J",
    "password": "24/01/2006"
  },
  {
    "reg_no": "23CS176",
    "name": "THIPAL K",
    "password": "20/02/2006"
  },
  {
    "reg_no": "23CS177",
    "name": "THIRUMURUGAN M",
    "password": "10/04/2006"
  },
  {
    "reg_no": "23CS178",
    "name": "VARATHARAJAN S",
    "password": "17/08/2006"
  },
  {
    "reg_no": "23CS179",
    "name": "VELUSAMY B",
    "password": "07/03/2006"
  },
  {
    "reg_no": "23CS180",
    "name": "VIKASH M",
    "password": "12/04/2005"
  },
  {
    "reg_no": "23CSL01",
    "name": "CHANDRU P",
    "password": "28/07/2003"
  },
  {
    "reg_no": "23CSL02",
    "name": "DHARSHINI R",
    "password": "07/07/2004"
  },
  {
    "reg_no": "23CSL05",
    "name": "HARISIVAA",
    "password": "03/11/2004"
  },
  {
    "reg_no": "23CSL06",
    "name": "JAGAN T",
    "password": "30/04/2005"
  },
  {
    "reg_no": "23CSL07",
    "name": "R. S. KISHOWRE",
    "password": "17/03/2005"
  },
  {
    "reg_no": "23CSL09",
    "name": "MEIVASANTHAN V",
    "password": "29/06/2006"
  },
  {
    "reg_no": "23CSL08",
    "name": "LOGESH S",
    "password": "18/01/2005"
  }
];

async function main() {
    try {
        console.log('='.repeat(60));
        console.log('📚 Adding 2027 CSE Students (Static Import)');
        console.log('='.repeat(60));
        console.log(`Total records: ${STUDENTS.length}\n`);

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const student of STUDENTS) {
            try {
                const email = `${student.reg_no.toLowerCase()}@nandhaengg.org`;
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
                // console.log(`Processed: ${student.reg_no}`);
            } catch (err) {
                console.error(`❌ Error ${student.reg_no}: ${err.message}`);
                skipped++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary');
        console.log(`✅ Created: ${created}`);
        console.log(`🔄 Updated: ${updated}`);
        console.log(`❌ Errors: ${skipped}`);
        console.log('='.repeat(60));

    } catch (err) {
        console.error('Fatal:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
