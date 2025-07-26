// Telangana State Board Report Card Engine
// Handles FA and SA report generation with proper grading and attendance

import { StateBoardReport, SubjectMarks, MonthlyAttendance, GradeBand } from '@erp/common';

export interface StateBoardReportData {
  student: {
    id: string;
    full_name: string;
    admission_no?: string;
    section?: string;
    grade?: string;
    father_name?: string;
    mother_name?: string;
  };
  school: {
    name: string;
    address: string;
    logo_url?: string;
    district?: string;
    mandal?: string;
    village?: string;
    school_code?: string;
  };
  exam: {
    name: string;
    type: 'FA' | 'SA';
    assessment_number: number;
    academic_year: string;
    date_range: string;
  };
  subject_marks: SubjectMarks[];
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  overall_grade?: string;
  overall_remark?: string;
  attendance: Record<string, MonthlyAttendance>;
  grading_legend: GradeBand[];
}

/**
 * Generate HTML template for State Board report card
 */
export function generateStateBoardReportHTML(data: StateBoardReportData): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate subjects table rows
  const subjectRows = data.subject_marks.map(subject => `
    <tr>
      <td class="subject-name">${subject.subject_name}</td>
      <td class="marks-cell">${subject.max_marks}</td>
      <td class="marks-cell">${subject.is_absent ? 'AB' : subject.marks_obtained}</td>
      <td class="grade-cell">
        <span class="grade-badge grade-${subject.grade.toLowerCase()}">${subject.grade}</span>
      </td>
    </tr>
  `).join('');

  // Generate grading legend
  const gradingLegend = data.grading_legend.map(band => `
    <tr>
      <td class="legend-grade">
        <span class="grade-badge grade-${band.grade.toLowerCase()}">${band.grade}</span>
      </td>
      <td class="legend-range">${band.min} - ${band.max}</td>
      <td class="legend-remark">${band.remark}</td>
    </tr>
  `).join('');

  // Generate attendance table
  const attendanceRows = Object.entries(data.attendance)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([month, attendance]) => `
      <tr>
        <td class="month-name">${monthNames[parseInt(month) - 1]}</td>
        <td class="attendance-days">${attendance.working_days}</td>
        <td class="attendance-days">${attendance.present_days}</td>
        <td class="attendance-percentage">${attendance.attendance_percentage.toFixed(1)}%</td>
      </tr>
    `).join('');

  // Calculate total attendance
  const totalWorking = Object.values(data.attendance).reduce((sum, att) => sum + att.working_days, 0);
  const totalPresent = Object.values(data.attendance).reduce((sum, att) => sum + att.present_days, 0);
  const totalPercentage = totalWorking > 0 ? (totalPresent / totalWorking * 100).toFixed(1) : '0';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Progress Report - ${data.student.full_name}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Times New Roman', serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: white;
        }

        .report-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 10mm;
        }

        /* Header Section */
        .header {
          text-align: center;
          border: 2px solid #000;
          padding: 15px;
          margin-bottom: 20px;
          background: #f8f9fa;
        }

        .header h1 {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 5px;
          text-transform: uppercase;
        }

        .header h2 {
          font-size: 16px;
          color: #34495e;
          margin-bottom: 10px;
        }

        .school-details {
          font-size: 11px;
          color: #555;
          margin-bottom: 10px;
        }

        .report-title {
          font-size: 14px;
          font-weight: bold;
          color: #e74c3c;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Student Info Section */
        .student-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          background: #fafafa;
        }

        .info-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .info-label {
          font-weight: bold;
          min-width: 120px;
          color: #2c3e50;
        }

        .info-value {
          color: #34495e;
          border-bottom: 1px dotted #999;
          flex: 1;
          padding-bottom: 2px;
        }

        /* Marks Table */
        .marks-section {
          margin-bottom: 25px;
        }

        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 10px;
          padding: 8px 12px;
          background: #ecf0f1;
          border-left: 4px solid #3498db;
        }

        .marks-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #2c3e50;
          font-size: 11px;
        }

        .marks-table th {
          background: #34495e;
          color: white;
          padding: 10px 8px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #2c3e50;
        }

        .marks-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: center;
        }

        .subject-name {
          text-align: left !important;
          font-weight: 500;
          padding-left: 12px;
        }

        .marks-cell {
          font-weight: bold;
          color: #2c3e50;
        }

        .grade-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          text-align: center;
          min-width: 30px;
          color: white;
        }

        .grade-o { background: #27ae60; }
        .grade-a { background: #2980b9; }
        .grade-b { background: #f39c12; }
        .grade-c { background: #e67e22; }
        .grade-d { background: #e74c3c; }

        /* Total Section */
        .total-section {
          background: #ecf0f1;
          padding: 15px;
          border: 2px solid #34495e;
          margin-bottom: 20px;
        }

        .total-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          text-align: center;
        }

        .total-item {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #bdc3c7;
        }

        .total-label {
          font-size: 11px;
          color: #7f8c8d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }

        .total-value {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
        }

        .overall-grade {
          font-size: 24px !important;
          color: #27ae60;
        }

        /* Grading Legend */
        .legend-section {
          margin-bottom: 20px;
        }

        .legend-table {
          width: 60%;
          border-collapse: collapse;
          font-size: 10px;
          margin: 0 auto;
        }

        .legend-table th {
          background: #95a5a6;
          color: white;
          padding: 6px;
          border: 1px solid #7f8c8d;
          text-align: center;
        }

        .legend-table td {
          padding: 6px;
          border: 1px solid #bdc3c7;
          text-align: center;
        }

        /* Attendance Section */
        .attendance-section {
          margin-bottom: 25px;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .attendance-table th {
          background: #8e44ad;
          color: white;
          padding: 8px;
          border: 1px solid #7d3c98;
          text-align: center;
        }

        .attendance-table td {
          padding: 6px;
          border: 1px solid #ddd;
          text-align: center;
        }

        .month-name {
          text-align: left !important;
          font-weight: 500;
          padding-left: 12px;
        }

        .attendance-total {
          background: #f8f9fa;
          font-weight: bold;
          color: #2c3e50;
        }

        /* Signatures Section */
        .signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          margin-top: 40px;
          text-align: center;
        }

        .signature {
          padding: 20px 0;
        }

        .signature-line {
          width: 80%;
          height: 1px;
          background: #000;
          margin: 40px auto 10px;
        }

        .signature-title {
          font-weight: bold;
          font-size: 11px;
          color: #2c3e50;
        }

        /* Print Styles */
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .report-container { padding: 0; margin: 0; max-width: none; }
          .page-break { page-break-after: always; }
        }

        /* Print Button */
        .print-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          gap: 10px;
        }

        .print-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }

        .print-btn:hover {
          background: #2980b9;
        }

        .close-btn {
          background: #95a5a6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }

        .close-btn:hover {
          background: #7f8c8d;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <!-- Print Controls -->
        <div class="print-controls no-print">
          <button class="print-btn" onclick="window.print()">🖨️ Print Report</button>
          <button class="close-btn" onclick="window.close()">✕ Close</button>
        </div>

        <!-- Header -->
        <div class="header">
          <h1>${data.school.name}</h1>
          <div class="school-details">
            ${data.school.address}<br>
            ${data.school.district ? `District: ${data.school.district}` : ''} 
            ${data.school.mandal ? `| Mandal: ${data.school.mandal}` : ''}
            ${data.school.school_code ? `| School Code: ${data.school.school_code}` : ''}
          </div>
          <h2 class="report-title">
            ${data.exam.type} - ${data.exam.assessment_number} Progress Report
          </h2>
          <div style="font-size: 12px; margin-top: 8px; color: #555;">
            Academic Year: ${data.exam.academic_year} | ${data.exam.date_range}
          </div>
        </div>

        <!-- Student Information -->
        <div class="student-info">
          <div class="info-group">
            <div class="info-item">
              <span class="info-label">Student Name:</span>
              <span class="info-value">${data.student.full_name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Admission No:</span>
              <span class="info-value">${data.student.admission_no || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Class & Section:</span>
              <span class="info-value">${data.student.grade || 'N/A'} - ${data.student.section || 'N/A'}</span>
            </div>
          </div>
          <div class="info-group">
            <div class="info-item">
              <span class="info-label">Father's Name:</span>
              <span class="info-value">${data.student.father_name || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Mother's Name:</span>
              <span class="info-value">${data.student.mother_name || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Assessment:</span>
              <span class="info-value">${data.exam.type}-${data.exam.assessment_number} (${data.exam.type === 'FA' ? 'Formative' : 'Summative'} Assessment)</span>
            </div>
          </div>
        </div>

        <!-- Subject-wise Performance -->
        <div class="marks-section">
          <h3 class="section-title">📚 Subject-wise Performance</h3>
          <table class="marks-table">
            <thead>
              <tr>
                <th style="width: 40%;">Subject</th>
                <th style="width: 20%;">Max Marks</th>
                <th style="width: 20%;">Marks Obtained</th>
                <th style="width: 20%;">Grade</th>
              </tr>
            </thead>
            <tbody>
              ${subjectRows}
            </tbody>
          </table>
        </div>

        <!-- Overall Performance -->
        <div class="total-section">
          <div class="total-grid">
            <div class="total-item">
              <div class="total-label">Total Marks</div>
              <div class="total-value">${data.total_marks}</div>
            </div>
            <div class="total-item">
              <div class="total-label">Marks Obtained</div>
              <div class="total-value">${data.obtained_marks}</div>
            </div>
            <div class="total-item">
              <div class="total-label">Percentage</div>
              <div class="total-value">${data.percentage.toFixed(1)}%</div>
            </div>
            ${data.overall_grade ? `
            <div class="total-item">
              <div class="total-label">Overall Grade</div>
              <div class="total-value overall-grade">${data.overall_grade}</div>
            </div>
            ` : ''}
          </div>
          ${data.overall_remark ? `
          <div style="text-align: center; margin-top: 15px; padding: 10px; background: white; border-radius: 5px;">
            <strong>Overall Remark:</strong> <em>${data.overall_remark}</em>
          </div>
          ` : ''}
        </div>

        <!-- Grading Legend -->
        <div class="legend-section">
          <h3 class="section-title">📊 Grading Scale</h3>
          <table class="legend-table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Range (${data.exam.type === 'FA' ? 'out of 20' : 'Percentage'})</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              ${gradingLegend}
            </tbody>
          </table>
        </div>

        <!-- Monthly Attendance -->
        ${Object.keys(data.attendance).length > 0 ? `
        <div class="attendance-section">
          <h3 class="section-title">📅 Monthly Attendance</h3>
          <table class="attendance-table">
            <thead>
              <tr>
                <th style="width: 25%;">Month</th>
                <th style="width: 25%;">Working Days</th>
                <th style="width: 25%;">Present Days</th>
                <th style="width: 25%;">Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRows}
              <tr class="attendance-total">
                <td class="month-name"><strong>Total</strong></td>
                <td><strong>${totalWorking}</strong></td>
                <td><strong>${totalPresent}</strong></td>
                <td><strong>${totalPercentage}%</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signatures">
          <div class="signature">
            <div class="signature-line"></div>
            <div class="signature-title">Class Teacher</div>
          </div>
          <div class="signature">
            <div class="signature-line"></div>
            <div class="signature-title">Principal</div>
          </div>
          <div class="signature">
            <div class="signature-line"></div>
            <div class="signature-title">Parent/Guardian</div>
          </div>
        </div>

        <!-- Footer Note -->
        <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #7f8c8d; border-top: 1px solid #ddd; padding-top: 15px;">
          <p><strong>Note:</strong> This is a computer-generated report. For any discrepancies, please contact the school office.</p>
          <p>Generated on: ${new Date().toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate and download State Board report card as PDF
 */
export async function generateStateBoardReportPDF(data: StateBoardReportData): Promise<void> {
  const htmlContent = generateStateBoardReportHTML(data);
  
  // Create a new window for the report
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site to generate reports.');
  }
  
  // Write the HTML to the new window
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Focus the window for printing
  printWindow.focus();
}

/**
 * Preview State Board report in a modal or container
 */
export function previewStateBoardReport(data: StateBoardReportData): string {
  const htmlContent = generateStateBoardReportHTML(data);
  
  // Return scaled-down version for preview
  return `
    <div style="transform: scale(0.7); transform-origin: top left; width: 142.86%; height: 142.86%; overflow: auto; border: 1px solid #ddd;">
      ${htmlContent}
    </div>
  `;
}

/**
 * Download report as HTML file (fallback option)
 */
export function downloadStateBoardReportHTML(data: StateBoardReportData): void {
  const htmlContent = generateStateBoardReportHTML(data);
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `report-card-${data.student.full_name.replace(/\s+/g, '-')}-${data.exam.type}${data.exam.assessment_number}-${data.exam.academic_year}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
} 