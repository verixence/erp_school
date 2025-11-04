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
  school_address?: string;
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

  // Helper to format currency without special characters issues
  const formatCurrency = (amount: number): string => {
    return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Helper function to draw a card/section
  const drawCard = (startY: number, height: number, bgColor?: number[]) => {
    if (bgColor) {
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.roundedRect(margin, startY, contentWidth, height, 2, 2, 'F');
    }
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, startY, contentWidth, height, 2, 2, 'S');
  };

  // === HEADER SECTION ===
  const headerHeight = 32;

  // Logo (if provided)
  if (payslip.school_logo) {
    try {
      doc.addImage(payslip.school_logo, 'PNG', margin, y, 22, 22);
    } catch (e) {
      console.warn('Failed to add logo:', e);
    }
  }

  const textStartX = payslip.school_logo ? margin + 27 : margin;

  // School name
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(payslip.school_name || 'School Name', textStartX, y + 7);

  // School address
  if (payslip.school_address) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text(payslip.school_address, textStartX, y + 13);
  }

  // Payslip subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.text('Salary Payslip', textStartX, y + (payslip.school_address ? 19 : 14));

  // Period badge on the right
  const periodText = `${MONTHS[payslip.month - 1]} ${payslip.year}`;
  doc.setFontSize(9);
  const periodWidth = doc.getTextWidth(periodText) + 12;
  doc.setFillColor(veryLightGray[0], veryLightGray[1], veryLightGray[2]);
  doc.roundedRect(pageWidth - margin - periodWidth, y + 3, periodWidth, 9, 2, 2, 'F');
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(periodText, pageWidth - margin - periodWidth / 2, y + 8.5, { align: 'center' });

  y += headerHeight;

  // === EMPLOYEE INFO CARD ===
  const cardHeight = 35;
  drawCard(y, cardHeight, veryLightGray);

  const leftColX = margin + 5;
  const rightColX = margin + contentWidth / 2 + 5;

  // Left column - Employee Name
  doc.setFontSize(8);
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('EMPLOYEE NAME', leftColX, y + 8);

  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(payslip.teacher_name, leftColX, y + 14);

  // Left column - Employee ID
  doc.setFontSize(8);
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('EMPLOYEE ID', leftColX, y + 22);

  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(payslip.employee_id || 'N/A', leftColX, y + 28);

  // Right column - Pay Period
  doc.setFontSize(8);
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('PAY PERIOD', rightColX, y + 8);

  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${MONTHS[payslip.month - 1]} ${payslip.year}`, rightColX, y + 14);

  // Right column - Issue Date
  const payDate = payslip.sent_at
    ? new Date(payslip.sent_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFontSize(8);
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('ISSUED ON', rightColX, y + 22);

  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(payDate, rightColX, y + 28);

  y += cardHeight + 15;

  // === EARNINGS & DEDUCTIONS GRID ===
  const colWidth = (contentWidth - 6) / 2;

  // EARNINGS COLUMN
  doc.setFontSize(10);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', margin, y);

  y += 7;
  const earningsStartY = y;

  const drawLineItem = (label: string, amount: number, xPos: number, yPos: number, isSubtotal = false) => {
    doc.setFontSize(isSubtotal ? 10 : 9);
    doc.setFont('helvetica', isSubtotal ? 'bold' : 'normal');
    const textColor = isSubtotal ? darkText : lightText;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(label, xPos + 3, yPos);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont('helvetica', isSubtotal ? 'bold' : 'normal');
    doc.text(formatCurrency(amount), xPos + colWidth - 3, yPos, { align: 'right' });
    return yPos + (isSubtotal ? 7 : 5.5);
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
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.5);
  doc.line(margin + 3, yEarn + 2, margin + colWidth - 3, yEarn + 2);
  yEarn += 6;

  yEarn = drawLineItem('Gross Salary', payslip.gross_salary, margin, yEarn, true);

  // DEDUCTIONS COLUMN (parallel)
  doc.setFontSize(10);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', margin + colWidth + 6, earningsStartY - 7);

  let yDed = earningsStartY;
  yDed = drawLineItem('Provident Fund', payslip.deductions.pf, margin + colWidth + 6, yDed);
  yDed = drawLineItem('Income Tax', payslip.deductions.tax, margin + colWidth + 6, yDed);

  if (payslip.deductions.other > 0) {
    yDed = drawLineItem('Other Deductions', payslip.deductions.other, margin + colWidth + 6, yDed);
  }

  // Divider
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin + colWidth + 6 + 3, yDed + 2, pageWidth - margin - 3, yDed + 2);
  yDed += 6;

  const totalDeductions = payslip.deductions.pf + payslip.deductions.tax + payslip.deductions.other;
  yDed = drawLineItem('Total Deductions', totalDeductions, margin + colWidth + 6, yDed, true);

  y = Math.max(yEarn, yDed) + 10;

  // === NET SALARY HIGHLIGHT ===
  const netBoxHeight = 26;
  doc.setFillColor(successGreen[0], successGreen[1], successGreen[2]);
  doc.roundedRect(margin, y, contentWidth, netBoxHeight, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NET SALARY', margin + 10, y + 11);

  doc.setFontSize(16);
  doc.text(
    formatCurrency(payslip.net_salary),
    pageWidth - margin - 10,
    y + 16,
    { align: 'right' }
  );

  y += netBoxHeight + 20;

  // === FOOTER ===
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
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
