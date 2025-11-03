import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayslipData {
  teacher_name: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: {
    hra: number;
    da: number;
    ta: number;
    other: number;
  };
  deductions: {
    pf: number;
    tax: number;
    other: number;
  };
  gross_salary: number;
  net_salary: number;
  school_name?: string;
  sent_at?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function generatePayslipPDF(payslip: PayslipData) {
  const doc = new jsPDF();

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const secondaryColor: [number, number, number] = [100, 116, 139]; // Gray
  const successColor: [number, number, number] = [34, 197, 94]; // Green

  let yPos = 20;

  // Header with company name
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(payslip.school_name || 'School Name', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('SALARY SLIP', 105, 30, { align: 'center' });

  yPos = 50;

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Employee Details Box
  doc.setDrawColor(...secondaryColor);
  doc.setLineWidth(0.5);
  doc.rect(15, yPos, 180, 30);

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Employee Name:', 20, yPos + 10);
  doc.text('Employee ID:', 20, yPos + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(payslip.teacher_name, 60, yPos + 10);
  doc.text(payslip.employee_id || 'N/A', 60, yPos + 20);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Pay Period:', 120, yPos + 10);
  doc.text('Pay Date:', 120, yPos + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`${MONTHS[payslip.month - 1]} ${payslip.year}`, 150, yPos + 10);
  const payDate = payslip.sent_at
    ? new Date(payslip.sent_at).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');
  doc.text(payDate, 150, yPos + 20);

  yPos += 40;

  // Earnings Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('EARNINGS', 20, yPos);
  yPos += 5;

  const earningsData = [
    ['Basic Salary', `₹${payslip.basic_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['House Rent Allowance (HRA)', `₹${payslip.allowances.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Dearness Allowance (DA)', `₹${payslip.allowances.da.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Travel Allowance (TA)', `₹${payslip.allowances.ta.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
  ];

  if (payslip.allowances.other > 0) {
    earningsData.push(['Other Allowances', `₹${payslip.allowances.other.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: earningsData,
    foot: [['GROSS SALARY', `₹${payslip.gross_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Deductions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DEDUCTIONS', 20, yPos);
  yPos += 5;

  const deductionsData = [
    ['Provident Fund (PF)', `₹${payslip.deductions.pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Income Tax (TDS)', `₹${payslip.deductions.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
  ];

  if (payslip.deductions.other > 0) {
    deductionsData.push(['Other Deductions', `₹${payslip.deductions.other.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }

  const totalDeductions = payslip.deductions.pf + payslip.deductions.tax + payslip.deductions.other;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: deductionsData,
    foot: [['TOTAL DEDUCTIONS', `₹${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Net Salary Box
  doc.setFillColor(...successColor);
  doc.rect(15, yPos, 180, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NET SALARY', 20, yPos + 13);
  doc.text(
    `₹${payslip.net_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    190,
    yPos + 13,
    { align: 'right' }
  );

  yPos += 30;

  // Footer
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(
    'This is a computer-generated document and does not require a signature.',
    105,
    yPos + 10,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
    105,
    yPos + 15,
    { align: 'center' }
  );

  // Save the PDF
  const fileName = `Payslip_${payslip.employee_id}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`;
  doc.save(fileName);
}
