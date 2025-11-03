import jsPDF from 'jspdf';

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
  school_logo?: string;
  sent_at?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function generatePayslipPDF(payslip: PayslipData) {
  const doc = new jsPDF();

  // Modern minimal color palette
  const darkText = [15, 23, 42]; // slate-900
  const lightText = [100, 116, 139]; // slate-500
  const veryLightGray = [248, 250, 252]; // slate-50
  const borderGray = [226, 232, 240]; // slate-200
  const accentBlue = [99, 102, 241]; // indigo-500
  const successGreen = [16, 185, 129]; // emerald-500

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Helper function to draw a card/section
  const drawCard = (startY: number, height: number, bgColor?: number[]) => {
    if (bgColor) {
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, startY, contentWidth, height, 2, 2, 'F');
    }
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, startY, contentWidth, height, 2, 2, 'S');
  };

  // === HEADER SECTION ===
  // Logo (if provided)
  if (payslip.school_logo) {
    try {
      doc.addImage(payslip.school_logo, 'PNG', margin, y, 20, 20);
    } catch (e) {
      console.warn('Failed to add logo:', e);
    }
  }

  // School name and title
  doc.setTextColor(...darkText);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(payslip.school_name || 'School Name', payslip.school_logo ? margin + 25 : margin, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...lightText);
  doc.text('Payslip', payslip.school_logo ? margin + 25 : margin, y + 15);

  // Period badge on the right
  const periodText = `${MONTHS[payslip.month - 1]} ${payslip.year}`;
  const periodWidth = doc.getTextWidth(periodText) + 10;
  doc.setFillColor(...veryLightGray);
  doc.roundedRect(pageWidth - margin - periodWidth, y + 2, periodWidth, 8, 2, 2, 'F');
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(periodText, pageWidth - margin - periodWidth / 2, y + 7, { align: 'center' });

  y += 30;

  // === EMPLOYEE INFO CARD ===
  const cardHeight = 28;
  drawCard(y, cardHeight, veryLightGray);

  doc.setFontSize(9);
  doc.setTextColor(...lightText);
  doc.setFont('helvetica', 'normal');

  // Left side
  doc.text('EMPLOYEE NAME', margin + 5, y + 8);
  doc.setTextColor(...darkText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(payslip.teacher_name, margin + 5, y + 14);

  // Right side
  doc.setFontSize(9);
  doc.setTextColor(...lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('EMPLOYEE ID', margin + 5, y + 20);
  doc.setTextColor(...darkText);
  doc.setFont('helvetica', 'bold');
  doc.text(payslip.employee_id || 'N/A', margin + 5, y + 25);

  // Issue date (far right)
  const payDate = payslip.sent_at
    ? new Date(payslip.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  doc.setFontSize(9);
  doc.setTextColor(...lightText);
  doc.setFont('helvetica', 'normal');
  doc.text('ISSUED ON', pageWidth - margin - 35, y + 8);
  doc.setTextColor(...darkText);
  doc.setFont('helvetica', 'bold');
  doc.text(payDate, pageWidth - margin - 35, y + 14);

  y += cardHeight + 12;

  // === EARNINGS & DEDUCTIONS GRID ===
  const colWidth = (contentWidth - 6) / 2;

  // EARNINGS COLUMN
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', margin, y);

  y += 7;
  const earningsStartY = y;

  const drawLineItem = (label: string, amount: number, xPos: number, yPos: number, isSubtotal = false) => {
    doc.setFontSize(isSubtotal ? 10 : 9);
    doc.setFont('helvetica', isSubtotal ? 'bold' : 'normal');
    doc.setTextColor(isSubtotal ? ...darkText : ...lightText);
    doc.text(label, xPos + 5, yPos);
    doc.setTextColor(...darkText);
    doc.text(`₹${amount.toLocaleString('en-IN')}`, xPos + colWidth - 5, yPos, { align: 'right' });
    return yPos + (isSubtotal ? 8 : 6);
  };

  // Draw earnings
  let yEarn = earningsStartY;
  yEarn = drawLineItem('Basic Salary', payslip.basic_salary, margin, yEarn);
  yEarn = drawLineItem('HRA', payslip.allowances.hra, margin, yEarn);
  yEarn = drawLineItem('DA', payslip.allowances.da, margin, yEarn);
  yEarn = drawLineItem('TA', payslip.allowances.ta, margin, yEarn);

  if (payslip.allowances.other > 0) {
    yEarn = drawLineItem('Other Allowances', payslip.allowances.other, margin, yEarn);
  }

  // Divider line
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.5);
  doc.line(margin + 5, yEarn + 1, margin + colWidth - 5, yEarn + 1);
  yEarn += 5;

  yEarn = drawLineItem('Gross Salary', payslip.gross_salary, margin, yEarn, true);

  // DEDUCTIONS COLUMN (parallel)
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', margin + colWidth + 6, earningsStartY - 7);

  let yDed = earningsStartY;
  yDed = drawLineItem('Provident Fund', payslip.deductions.pf, margin + colWidth + 6, yDed);
  yDed = drawLineItem('Income Tax', payslip.deductions.tax, margin + colWidth + 6, yDed);

  if (payslip.deductions.other > 0) {
    yDed = drawLineItem('Other Deductions', payslip.deductions.other, margin + colWidth + 6, yDed);
  }

  // Divider
  doc.setDrawColor(...borderGray);
  doc.line(margin + colWidth + 6 + 5, yDed + 1, pageWidth - margin - 5, yDed + 1);
  yDed += 5;

  const totalDeductions = payslip.deductions.pf + payslip.deductions.tax + payslip.deductions.other;
  yDed = drawLineItem('Total Deductions', totalDeductions, margin + colWidth + 6, yDed, true);

  y = Math.max(yEarn, yDed) + 10;

  // === NET SALARY HIGHLIGHT ===
  const netBoxHeight = 24;
  doc.setFillColor(...successGreen);
  doc.roundedRect(margin, y, contentWidth, netBoxHeight, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('NET SALARY', margin + 8, y + 10);

  doc.setFontSize(18);
  doc.text(
    `₹${payslip.net_salary.toLocaleString('en-IN')}`,
    pageWidth - margin - 8,
    y + 15,
    { align: 'right' }
  );

  y += netBoxHeight + 20;

  // === FOOTER ===
  doc.setTextColor(...lightText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'This is a system-generated payslip and does not require a physical signature.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  doc.setFontSize(7);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN')} • CampusHoster ERP`,
    pageWidth / 2,
    y + 4,
    { align: 'center' }
  );

  // Save
  const fileName = `Payslip_${payslip.employee_id}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`;
  doc.save(fileName);
}
