/**
 * CBSE Report Card PDF Generator
 * Generates Term 1, Term 2, and Annual report cards for CBSE schools
 * Includes GPA calculation, co-scholastic areas, and attendance
 */

import html2pdf from 'html2pdf.js';

// Placeholder GPA calculations - these should be implemented in @erp/common
const calculateTerm1GPA = (subjects: any[]) => 0;
const calculateTerm2GPA = (subjects: any[]) => 0;
const calculateOverallGPA = (term1: number, term2: number) => 0;
const convertGradePointToLetter = (gpa: number) => 'A';

export type CBSESubjectData = any;

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface CBSEReportData {
  // School info
  school: {
    name: string;
    logo?: string;
    address: string;
    affiliation_no?: string;
    school_code?: string;
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
  };

  // Academic year and term
  academic_year: string;
  term: 'Term1' | 'Term2' | 'Annual';

  // Subject-wise marks and GPA
  subjects: CBSESubjectData[];

  // Overall performance
  overall_gpa: number;
  overall_grade: string;

  // Co-scholastic areas (optional)
  co_scholastic?: {
    art?: { grade: string; remark?: string };
    music?: { grade: string; remark?: string };
    sports?: { grade: string; remark?: string };
    discipline?: { grade: string; remark?: string };
    conduct?: { grade: string; remark?: string };
  };

  // Attendance
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
  includeWatermark?: boolean;
  filename?: string;
}

// ============================================
// HTML TEMPLATE GENERATOR
// ============================================

function generateCBSETerm1Template(data: CBSEReportData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CBSE Progress Report - ${data.term}</title>
      <style>
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

        .affiliation {
          font-size: 10px;
          font-style: italic;
        }

        .report-title {
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          margin: 15px 0;
          padding: 8px;
          background: #f0f0f0;
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
          text-align: center;
        }

        .marks-table th {
          background: #e0e0e0;
          font-weight: bold;
          font-size: 11px;
        }

        .marks-table .subject-name {
          text-align: left;
          padding-left: 10px;
          font-weight: 600;
        }

        .overall-performance {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .performance-box {
          border: 1px solid #000;
          padding: 10px;
        }

        .performance-title {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .gpa-display {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          padding: 15px;
          background: #f0f0f0;
          border-radius: 5px;
        }

        .grade-legend {
          font-size: 10px;
          margin-top: 15px;
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
          margin-top: 15px;
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
      </style>
    </head>
    <body>
      <div class="report-card">
        <!-- Header -->
        <div class="header">
          ${data.school.logo ? `<img src="${data.school.logo}" alt="School Logo" class="school-logo" />` : ''}
          <div class="school-name">${data.school.name}</div>
          <div class="school-address">${data.school.address}</div>
          ${data.school.affiliation_no ? `<div class="affiliation">CBSE Affiliation No.: ${data.school.affiliation_no}</div>` : ''}
          ${data.school.school_code ? `<div class="affiliation">School Code: ${data.school.school_code}</div>` : ''}
        </div>

        <!-- Report Title -->
        <div class="report-title">
          PROGRESS REPORT - ${data.term.toUpperCase()}<br>
          Academic Year: ${data.academic_year}
        </div>

        <!-- Student Information -->
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
            <div class="info-label">Class:</div>
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

        <!-- Scholastic Areas - Marks Table -->
        <table class="marks-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 25%;">Subject</th>
              <th colspan="2">FA-1<br>(10 Marks)</th>
              <th colspan="2">FA-2<br>(10 Marks)</th>
              <th rowspan="2">Mid<br>Term<br>GP</th>
              <th colspan="2">SA-1<br>(80 Marks)</th>
              <th rowspan="2">Final<br>GP</th>
              <th rowspan="2">Grade</th>
            </tr>
            <tr>
              <th>Marks</th>
              <th>GP</th>
              <th>Marks</th>
              <th>GP</th>
              <th>Marks</th>
              <th>GP</th>
            </tr>
          </thead>
          <tbody>
            ${data.subjects.map(subject => `
              <tr>
                <td class="subject-name">${subject.name}</td>
                <td>${subject.fa1_marks !== undefined ? subject.fa1_marks : '-'}</td>
                <td>${subject.fa1_gp !== undefined ? subject.fa1_gp : '-'}</td>
                <td>${subject.fa2_marks !== undefined ? subject.fa2_marks : '-'}</td>
                <td>${subject.fa2_gp !== undefined ? subject.fa2_gp : '-'}</td>
                <td><strong>${subject.mid_term_gp !== undefined ? subject.mid_term_gp : '-'}</strong></td>
                <td>${subject.sa1_marks !== undefined ? subject.sa1_marks : '-'}</td>
                <td>${subject.sa1_gp !== undefined ? subject.sa1_gp : '-'}</td>
                <td><strong>${subject.final_gpa !== undefined ? subject.final_gpa : '-'}</strong></td>
                <td><strong>${subject.grade || '-'}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Overall Performance and Attendance -->
        <div class="overall-performance">
          <div class="performance-box">
            <div class="performance-title">Overall Performance</div>
            <div class="gpa-display">
              GPA: ${data.overall_gpa.toFixed(2)}<br>
              <span style="font-size: 18px;">Grade: ${data.overall_grade}</span>
            </div>
          </div>
          <div class="performance-box">
            <div class="performance-title">Attendance</div>
            <div style="padding: 10px;">
              <div style="margin-bottom: 8px;"><strong>Total Working Days:</strong> ${data.attendance.total_working_days}</div>
              <div style="margin-bottom: 8px;"><strong>Days Present:</strong> ${data.attendance.days_present}</div>
              <div style="font-size: 16px; font-weight: bold; margin-top: 10px;">
                Attendance: ${data.attendance.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <!-- Co-Scholastic Areas (if provided) -->
        ${data.co_scholastic ? `
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">Co-Scholastic Areas</div>
            <table class="marks-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${data.co_scholastic.art ? `<tr><td>Art/Craft</td><td>${data.co_scholastic.art.grade}</td><td>${data.co_scholastic.art.remark || ''}</td></tr>` : ''}
                ${data.co_scholastic.music ? `<tr><td>Music</td><td>${data.co_scholastic.music.grade}</td><td>${data.co_scholastic.music.remark || ''}</td></tr>` : ''}
                ${data.co_scholastic.sports ? `<tr><td>Sports/Physical Education</td><td>${data.co_scholastic.sports.grade}</td><td>${data.co_scholastic.sports.remark || ''}</td></tr>` : ''}
                ${data.co_scholastic.discipline ? `<tr><td>Discipline</td><td>${data.co_scholastic.discipline.grade}</td><td>${data.co_scholastic.discipline.remark || ''}</td></tr>` : ''}
                ${data.co_scholastic.conduct ? `<tr><td>Conduct</td><td>${data.co_scholastic.conduct.grade}</td><td>${data.co_scholastic.conduct.remark || ''}</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- CBSE Grade Legend -->
        <div class="grade-legend">
          <strong>Grade Point to Letter Grade Conversion:</strong>
          <table class="legend-table">
            <tr>
              <td><strong>A1 (10 GP):</strong> 91-100%</td>
              <td><strong>A2 (9 GP):</strong> 81-90%</td>
              <td><strong>B1 (8 GP):</strong> 71-80%</td>
              <td><strong>B2 (7 GP):</strong> 61-70%</td>
            </tr>
            <tr>
              <td><strong>C1 (6 GP):</strong> 51-60%</td>
              <td><strong>C2 (5 GP):</strong> 41-50%</td>
              <td><strong>D (4 GP):</strong> 33-40%</td>
              <td><strong>E (0 GP):</strong> Below 33%</td>
            </tr>
          </table>
        </div>

        <!-- Class Teacher Remarks -->
        ${data.class_teacher_remarks ? `
          <div class="remarks-section">
            <div class="remarks-title">Class Teacher's Remarks:</div>
            <div class="remarks-text">${data.class_teacher_remarks}</div>
          </div>
        ` : ''}

        <!-- Principal Remarks -->
        ${data.principal_remarks ? `
          <div class="remarks-section">
            <div class="remarks-title">Principal's Remarks:</div>
            <div class="remarks-text">${data.principal_remarks}</div>
          </div>
        ` : ''}

        <!-- Signatures -->
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

        <!-- Footer -->
        <div class="footer">
          Report Generated on: ${new Date(data.report_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// PDF GENERATION FUNCTION
// ============================================

export async function generateCBSEReportCardPDF(
  data: CBSEReportData,
  options: ReportGenerationOptions = {}
): Promise<Blob> {
  // Generate HTML template
  const htmlContent = generateCBSETerm1Template(data);

  // Configure html2pdf options
  const opt = {
    margin: [10, 10, 10, 10], // [top, left, bottom, right] in mm
    filename: options.filename || `${data.student.name}_${data.term}_Report_${data.academic_year}.pdf`,
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

// ============================================
// DOWNLOAD PDF FUNCTION
// ============================================

export async function downloadCBSEReportCard(
  data: CBSEReportData,
  options: ReportGenerationOptions = {}
): Promise<void> {
  const pdfBlob = await generateCBSEReportCardPDF(data, options);

  // Create download link
  const url = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename || `${data.student.name}_${data.term}_Report_${data.academic_year}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ============================================
// PRINT PDF FUNCTION
// ============================================

export async function printCBSEReportCard(data: CBSEReportData): Promise<void> {
  const htmlContent = generateCBSETerm1Template(data);

  // Open print window
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
