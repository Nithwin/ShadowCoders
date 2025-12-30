const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
    const workbook = new ExcelJS.Workbook();
    // Use the path provided by the user
    await workbook.xlsx.readFile(String.raw`c:\Users\vmnit\Desktop\ShadowCoders\2027 CSE DB.xlsx`);
    const worksheet = workbook.getWorksheet(1); // Assume first sheet
    const firstRow = worksheet.getRow(1);
    console.log('Headers:', firstRow.values);
    
    // Also print first entry to see data format
    const secondRow = worksheet.getRow(2);
    console.log('First Row Data:', secondRow.values);
}

inspect().catch(console.error);
