// utils/pdfExport.js
const PDFDocument = require('pdfkit');
const fs = require('fs');

function generateExpensePDF(expenses, startDate, endDate, outputPath) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outputPath));

  doc.fontSize(20).text('Expense Summary', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`From: ${startDate} To: ${endDate}`);
  doc.moveDown();

  expenses.forEach((exp, idx) => {
    doc.text(`${idx + 1}. ${exp.title} | $${exp.amount} | ${exp.category} | ${exp.date} | ${exp.paymentMethod} | ${exp.note || ''}`);
  });

  doc.end();
  return doc;
}

module.exports = { generateExpensePDF };