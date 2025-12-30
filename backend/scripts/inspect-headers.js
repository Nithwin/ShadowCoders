const ExcelJS = require('exceljs');

async function inspect() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(String.raw`c:\Users\vmnit\Desktop\ShadowCoders\2027 CSE DB.xlsx`);
    const worksheet = workbook.getWorksheet(1);
    const row = worksheet.getRow(1);
    
    // Print first 10 columns
    for (let i = 1; i <= 10; i++) {
        const val = row.getCell(i).value;
        if (val) console.log(`Col ${i}: ${val}`);
    }
}

inspect().catch(console.error);
