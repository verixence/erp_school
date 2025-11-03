/**
 * State Board (Telangana/AP) Report Card PDF Generator
 * Generates FA and SA report cards for State Board schools
 * Includes O-A-B-C-D grading system and monthly attendance
 */

import html2pdf from 'html2pdf.js';
import {
  calculateGrade,
  calculateOverallGrade,
  DEFAULT_FA_GRADING,
  DEFAULT_SA_GRADING,
  type SubjectMarks,
  type GradeBand
} from '@erp/common';

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface StateBoardReportData {
  // School info
  school: {
    name: string;
    logo?: string;
    address: string;
    state: string;
    udise_code?: string;
  };

  // Student info
  student: {
    name: string;
    admission_no: string;
    class: string;
    section: string;
    roll_no?: string;
    father_name?: string;
    mother_name?: string;
    dob?: string;
    aadhar_no?: string;
  };

  // Academic year and assessment
  academic_year: string;
  assessment_type: 'FA' | 'SA';
  assessment_number: number; // FA1, FA2, FA3, FA4 or SA1, SA2, SA3

  // Subject-wise performance
  subjects: Array<{
    subject_name: string;
    marks_obtained: number;
    max_marks: number;
    grade: string;
    remark: string;
    is_absent?: boolean;
  }>;

  // Overall performance
  total_marks: number;
  obtained_marks: number;
  overall_percentage: number;
  overall_grade: string;
  overall_remark: string;

  // Monthly attendance (for SA reports)
  monthly_attendance?: Array<{
    month: string;
    working_days: number;
    present_days: number;
    percentage: number;
  }>;

  // Cumulative attendance
  attendance: {
    total_working_days: number;
    days_present: number;
    percentage: number;
  };

  // Remarks
  class_teacher_remarks?: string;
  principal_remarks?: string;

  // Signatures
  class_teacher?: string;
  principal?: string;

  // Report generation date
  report_date: string;
}

export interface ReportGenerationOptions {
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  filename?: string;
}

// ============================================
// HTML TEMPLATE GENERATOR FOR FA ASSESSMENT
// ============================================

function generateStateBoardFATemplate(data: StateBoardReportData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>State Board FA Report - ${data.assessment_type}${data.assessment_number}</title>
      <style>
        ${getCommonStyles()}

        .fa-specific {
          background: #e8f5e9;
        }

        .marks-table th {
          background: #4caf50;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="report-card">
        ${generateHeader(data)}

        <!-- Report Title -->
        <div class="report-title fa-specific">
          FORMATIVE ASSESSMENT - ${data.assessment_number} (FA-${data.assessment_number})<br>
          Academic Year: ${data.academic_year}
        </div>

        ${generateStudentInfo(data)}

        <!-- FA Marks Table -->
        <table class="marks-table">
          <thead>
            <tr>
              <th style="width: 10%;">S.No</th>
              <th style="width: 40%;">Subject</th>
              <th style="width: 15%;">Max Marks</th>
              <th style="width: 15%;">Marks Obtained</th>
              <th style="width: 10%;">Grade</th>
              <th style="width: 10%;">Remark</th>
            </tr>
          </thead>
          <tbody>
            ${data.subjects.map((subject, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td class="subject-name">${subject.subject_name}</td>
                <td class="text-center">${subject.max_marks}</td>
                <td class="text-center ${subject.is_absent ? 'absent-mark' : ''}">
                  ${subject.is_absent ? 'AB' : subject.marks_obtained}
                </td>
                <td class="text-center">
                  <span class="grade-badge grade-${subject.grade.toLowerCase()}">${subject.grade}</span>
                </td>
                <td class="text-center">${subject.remark}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" class="text-right"><strong>TOTAL</strong></td>
              <td class="text-center"><strong>${data.total_marks}</strong></td>
              <td class="text-center"><strong>${data.obtained_marks}</strong></td>
              <td class="text-center">
                <span class="grade-badge grade-${data.overall_grade.toLowerCase()}">${data.overall_grade}</span>
              </td>
              <td class="text-center">${data.overall_remark}</td>
            </tr>
          </tbody>
        </table>

        ${generateStateBoardGradeLegend('FA')}

        <!-- Attendance Section -->
        <div class="performance-box">
          <div class="performance-title">Attendance Summary</div>
          <div style="padding: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
              <div class="stat-box">
                <div class="stat-label">Total Working Days</div>
                <div class="stat-value">${data.attendance.total_working_days}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Days Present</div>
                <div class="stat-value">${data.attendance.days_present}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Attendance %</div>
                <div class="stat-value">${data.attendance.percentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        ${generateRemarks(data)}
        ${generateSignatures(data)}
        ${generateFooter(data)}
      </div>
    </body>
    </html>
  `;
}

// ============================================
// HTML TEMPLATE GENERATOR FOR SA ASSESSMENT
// ============================================

function generateStateBoardSATemplate(data: StateBoardReportData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>State Board SA Report - ${data.assessment_type}${data.assessment_number}</title>
      <style>
        ${getCommonStyles()}

        .sa-specific {
          background: #e3f2fd;
        }

        .marks-table th {
          background: #2196f3;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="report-card">
        ${generateHeader(data)}

        <!-- Report Title -->
        <div class="report-title sa-specific">
          SUMMATIVE ASSESSMENT - ${data.assessment_number} (SA-${data.assessment_number})<br>
          Academic Year: ${data.academic_year}
        </div>

        ${generateStudentInfo(data)}

        <!-- SA Marks Table -->
        <table class="marks-table">
          <thead>
            <tr>
              <th style="width: 10%;">S.No</th>
              <th style="width: 35%;">Subject</th>
              <th style="width: 15%;">Max Marks</th>
              <th style="width: 15%;">Marks Obtained</th>
              <th style="width: 12%;">Percentage</th>
              <th style="width: 8%;">Grade</th>
              <th style="width: 5%;">Remark</th>
            </tr>
          </thead>
          <tbody>
            ${data.subjects.map((subject, index) => {
              const percentage = (subject.marks_obtained / subject.max_marks) * 100;
              return `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td class="subject-name">${subject.subject_name}</td>
                  <td class="text-center">${subject.max_marks}</td>
                  <td class="text-center ${subject.is_absent ? 'absent-mark' : ''}">
                    ${subject.is_absent ? 'AB' : subject.marks_obtained}
                  </td>
                  <td class="text-center">${subject.is_absent ? '-' : percentage.toFixed(1) + '%'}</td>
                  <td class="text-center">
                    <span class="grade-badge grade-${subject.grade.toLowerCase()}">${subject.grade}</span>
                  </td>
                  <td class="text-center">${subject.remark}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="2" class="text-right"><strong>TOTAL / GRAND TOTAL</strong></td>
              <td class="text-center"><strong>${data.total_marks}</strong></td>
              <td class="text-center"><strong>${data.obtained_marks}</strong></td>
              <td class="text-center"><strong>${data.overall_percentage.toFixed(1)}%</strong></td>
              <td class="text-center">
                <span class="grade-badge grade-${data.overall_grade.toLowerCase()}">${data.overall_grade}</span>
              </td>
              <td class="text-center">${data.overall_remark}</td>
            </tr>
          </tbody>
        </table>

        ${generateStateBoardGradeLegend('SA')}

        <!-- Monthly Attendance (for SA reports) -->
        ${data.monthly_attendance && data.monthly_attendance.length > 0 ? `
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">Monthly Attendance</div>
            <table class="marks-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Working Days</th>
                  <th>Days Present</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${data.monthly_attendance.map(month => `
                  <tr>
                    <td class="text-center">${month.month}</td>
                    <td class="text-center">${month.working_days}</td>
                    <td class="text-center">${month.present_days}</td>
                    <td class="text-center">${month.percentage.toFixed(1)}%</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td class="text-right"><strong>TOTAL</strong></td>
                  <td class="text-center"><strong>${data.attendance.total_working_days}</strong></td>
                  <td class="text-center"><strong>${data.attendance.days_present}</strong></td>
                  <td class="text-center"><strong>${data.attendance.percentage.toFixed(1)}%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : `
          <div class="performance-box">
            <div class="performance-title">Attendance Summary</div>
            <div style="padding: 10px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div class="stat-box">
                  <div class="stat-label">Total Working Days</div>
                  <div class="stat-value">${data.attendance.total_working_days}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Days Present</div>
                  <div class="stat-value">${data.attendance.days_present}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Attendance %</div>
                  <div class="stat-value">${data.attendance.percentage.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        `}

        ${generateRemarks(data)}
        ${generateSignatures(data)}
        ${generateFooter(data)}
      </div>
    </body>
    </html>
  `;
}

// ============================================
// COMMON STYLES
// ============================================

function getCommonStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      padding: 20px;
    }

    .report-card {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #000;
      padding: 15px;
    }

    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }

    .school-logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 10px;
    }

    .school-name {
      font-size: 22px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .school-address {
      font-size: 11px;
      margin-bottom: 5px;
    }

    .school-info {
      font-size: 10px;
      font-style: italic;
    }

    .report-title {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      margin: 15px 0;
      padding: 8px;
      border: 1px solid #ccc;
    }

    .student-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }

    .info-row {
      display: flex;
    }

    .info-label {
      font-weight: bold;
      width: 120px;
    }

    .info-value {
      flex: 1;
    }

    .marks-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }

    .marks-table th,
    .marks-table td {
      border: 1px solid #000;
      padding: 8px 5px;
    }

    .marks-table th {
      font-weight: bold;
      font-size: 11px;
    }

    .subject-name {
      text-align: left;
      padding-left: 10px;
      font-weight: 600;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
      padding-right: 10px;
    }

    .total-row {
      background: #f0f0f0;
      font-weight: bold;
    }

    .absent-mark {
      color: #f44336;
      font-weight: bold;
    }

    .grade-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-weight: bold;
    }

    .grade-o { background: #4caf50; color: white; }
    .grade-a { background: #2196f3; color: white; }
    .grade-b { background: #ff9800; color: white; }
    .grade-c { background: #ff5722; color: white; }
    .grade-d { background: #f44336; color: white; }
    .grade-e { background: #9e9e9e; color: white; }

    .performance-box {
      border: 1px solid #000;
      padding: 10px;
      margin-bottom: 15px;
    }

    .performance-title {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .stat-box {
      text-align: center;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 5px;
    }

    .stat-label {
      font-size: 10px;
      color: #666;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }

    .grade-legend {
      font-size: 10px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }

    .legend-table {
      width: 100%;
      margin-top: 5px;
    }

    .legend-table td {
      padding: 3px 5px;
    }

    .remarks-section {
      margin-bottom: 10px;
      border: 1px solid #000;
      padding: 10px;
    }

    .remarks-title {
      font-weight: bold;
      margin-bottom: 8px;
    }

    .remarks-text {
      min-height: 50px;
      font-size: 11px;
      line-height: 1.6;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
    }

    .signature-box {
      text-align: center;
    }

    .signature-line {
      border-top: 1px solid #000;
      margin-top: 50px;
      padding-top: 5px;
      font-size: 11px;
    }

    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }

    @media print {
      body { padding: 0; }
      .report-card { border: none; }
    }
  `;
}

// ============================================
// COMMON TEMPLATE PARTS
// ============================================

function generateHeader(data: StateBoardReportData): string {
  return `
    <div class="header">
      ${data.school.logo ? `<img src="${data.school.logo}" alt="School Logo" class="school-logo" />` : ''}
      <div class="school-name">${data.school.name}</div>
      <div class="school-address">${data.school.address}</div>
      <div class="school-info">${data.school.state} State Board${data.school.udise_code ? ` | UDISE: ${data.school.udise_code}` : ''}</div>
    </div>
  `;
}

function generateStudentInfo(data: StateBoardReportData): string {
  return `
    <div class="student-info">
      <div class="info-row">
        <div class="info-label">Student Name:</div>
        <div class="info-value">${data.student.name}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Admission No:</div>
        <div class="info-value">${data.student.admission_no}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Class & Section:</div>
        <div class="info-value">${data.student.class} ${data.student.section}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Roll No:</div>
        <div class="info-value">${data.student.roll_no || '-'}</div>
      </div>
      ${data.student.father_name ? `
      <div class="info-row">
        <div class="info-label">Father's Name:</div>
        <div class="info-value">${data.student.father_name}</div>
      </div>
      ` : ''}
      ${data.student.mother_name ? `
      <div class="info-row">
        <div class="info-label">Mother's Name:</div>
        <div class="info-value">${data.student.mother_name}</div>
      </div>
      ` : ''}
    </div>
  `;
}

function generateStateBoardGradeLegend(type: 'FA' | 'SA'): string {
  const legends = type === 'FA' ? [
    { grade: 'O', range: '19-20', remark: 'Outstanding' },
    { grade: 'A', range: '15-18', remark: 'Very Good' },
    { grade: 'B', range: '11-14', remark: 'Good' },
    { grade: 'C', range: '6-10', remark: 'Pass' },
    { grade: 'D', range: '0-5', remark: 'Work Hard' }
  ] : [
    { grade: 'O', range: '90-100%', remark: 'Outstanding' },
    { grade: 'A', range: '72-89%', remark: 'Excellent' },
    { grade: 'B', range: '52-71%', remark: 'Good' },
    { grade: 'C', range: '34-51%', remark: 'Pass' },
    { grade: 'D', range: '0-33%', remark: 'Need to Improve' }
  ];

  return `
    <div class="grade-legend">
      <strong>Grading Scale ${type === 'FA' ? '(Out of 20 marks per subject)' : '(Percentage-based)'}:</strong>
      <table class="legend-table">
        <tr>
          ${legends.map(l => `<td><strong>${l.grade} (${l.range}):</strong> ${l.remark}</td>`).join('')}
        </tr>
      </table>
    </div>
  `;
}

function generateRemarks(data: StateBoardReportData): string {
  let html = '';

  if (data.class_teacher_remarks) {
    html += `
      <div class="remarks-section">
        <div class="remarks-title">Class Teacher's Remarks:</div>
        <div class="remarks-text">${data.class_teacher_remarks}</div>
      </div>
    `;
  }

  if (data.principal_remarks) {
    html += `
      <div class="remarks-section">
        <div class="remarks-title">Principal's Remarks:</div>
        <div class="remarks-text">${data.principal_remarks}</div>
      </div>
    `;
  }

  return html;
}

function generateSignatures(data: StateBoardReportData): string {
  return `
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line">Parent's Signature</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          Class Teacher<br>
          ${data.class_teacher || ''}
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          Principal<br>
          ${data.principal || ''}
        </div>
      </div>
    </div>
  `;
}

function generateFooter(data: StateBoardReportData): string {
  return `
    <div class="footer">
      Report Generated on: ${new Date(data.report_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  `;
}

// ============================================
// PDF GENERATION FUNCTIONS
// ============================================

export async function generateStateBoardReportCardPDF(
  data: StateBoardReportData,
  options: ReportGenerationOptions = {}
): Promise<Blob> {
  // Select template based on assessment type
  const htmlContent = data.assessment_type === 'FA'
    ? generateStateBoardFATemplate(data)
    : generateStateBoardSATemplate(data);

  // Configure html2pdf options
  const opt = {
    margin: [10, 10, 10, 10],
    filename: options.filename || `${data.student.name}_${data.assessment_type}${data.assessment_number}_Report_${data.academic_year}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: {
      unit: 'mm',
      format: options.format || 'a4',
      orientation: options.orientation || 'portrait',
      compress: true
    },
  };

  // Generate PDF
  const pdfBlob = await html2pdf()
    .set(opt)
    .from(htmlContent)
    .output('blob');

  return pdfBlob;
}

export async function downloadStateBoardReportCard(
  data: StateBoardReportData,
  options: ReportGenerationOptions = {}
): Promise<void> {
  const pdfBlob = await generateStateBoardReportCardPDF(data, options);

  const url = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename || `${data.student.name}_${data.assessment_type}${data.assessment_number}_Report_${data.academic_year}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function printStateBoardReportCard(data: StateBoardReportData): Promise<void> {
  const htmlContent = data.assessment_type === 'FA'
    ? generateStateBoardFATemplate(data)
    : generateStateBoardSATemplate(data);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
