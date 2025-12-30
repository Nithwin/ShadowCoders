const ExcelJS = require('exceljs');

async function inspect() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(String.raw`c:\Users\vmnit\Desktop\ShadowCoders\2027 CSE DB.xlsx`);
    const worksheet = workbook.getWorksheet(1);
    
    console.log('Row 1 (Headers):');
    const row1 = worksheet.getRow(1);
    row1.eachCell((cell, colNumber) => {
        console.log(`Col ${colNumber}: ${cell.value}`);
    });

    console.log('\nRow 2 (Data):');
    const row2 = worksheet.getRow(2);
    row2.eachCell((cell, colNumber) => {
        console.log(`Col ${colNumber}: ${cell.value} (Type: ${typeof cell.value})`);
        if (cell.value instanceof Date) {
             console.log(`Col ${colNumber} is Date: ${cell.value.toISOString()}`);
        }
    });
}

inspect().catch(console.error);
