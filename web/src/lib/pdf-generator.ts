// PDF Generation Utility for Report Cards
// Uses browser's print functionality to generate PDFs

export interface ReportData {
  student: {
    id: string;
    name: string;
    admission_no?: string;
    section?: string;
    grade?: string;
    photo_url?: string;
  };
  school: {
    name: string;
    address: string;
    logo_url?: string;
    principal_name?: string;
  };
  exam: {
    name: string;
    type: string;
    academic_year: string;
    date_range: string;
  };
  marks: Array<{
    subject: string;
    marks_obtained: number;
    max_marks: number;
    percentage: number;
    grade?: string;
    is_absent: boolean;
  }>;
  totals: {
    total_marks: number;
    total_max_marks: number;
    percentage: number;
    grade: string;
    result: string;
    rank?: number;
  };
  template: {
    html: string;
    css: string;
    board_type: string;
  };
}

// Template placeholder replacer
export function replacePlaceholders(template: string, data: ReportData): string {
  let result = template;
  
  // Student placeholders
  result = result.replace(/{{student_name}}/g, data.student.name);
  result = result.replace(/{{student_roll}}/g, data.student.admission_no || 'N/A');
  result = result.replace(/{{admission_no}}/g, data.student.admission_no || 'N/A');
  result = result.replace(/{{student_section}}/g, data.student.section || 'N/A');
  result = result.replace(/{{student_class}}/g, data.student.grade || 'N/A');
  result = result.replace(/{{student_photo}}/g, data.student.photo_url || '/default-student.png');
  
  // School placeholders
  result = result.replace(/{{school_name}}/g, data.school.name);
  result = result.replace(/{{school_address}}/g, data.school.address);
  result = result.replace(/{{school_logo}}/g, data.school.logo_url || '/logo.png');
  result = result.replace(/{{principal_name}}/g, data.school.principal_name || 'Principal');
  
  // Exam placeholders
  result = result.replace(/{{exam_name}}/g, data.exam.name);
  result = result.replace(/{{academic_year}}/g, data.exam.academic_year);
  result = result.replace(/{{exam_date_range}}/g, data.exam.date_range);
  
  // Performance placeholders
  result = result.replace(/{{total_marks}}/g, data.totals.total_marks.toString());
  result = result.replace(/{{total_obtained}}/g, data.totals.total_marks.toString());
  result = result.replace(/{{overall_percentage}}/g, data.totals.percentage.toFixed(1));
  result = result.replace(/{{overall_grade}}/g, data.totals.grade);
  result = result.replace(/{{overall_result}}/g, data.totals.result);
  result = result.replace(/{{final_result}}/g, data.totals.result);
  
  // Handle subject loop
  if (result.includes('{{#each subjects}}')) {
    const subjectMatch = result.match(/{{#each subjects}}([\s\S]*?){{\/each}}/);
    const subjectTemplate = subjectMatch?.[1] || '';
    let subjectsHtml = '';
    
    data.marks.forEach(mark => {
      let subjectRow = subjectTemplate;
      subjectRow = subjectRow.replace(/{{name}}/g, mark.subject);
      subjectRow = subjectRow.replace(/{{marks_obtained}}/g, mark.is_absent ? 'Absent' : mark.marks_obtained.toString());
      subjectRow = subjectRow.replace(/{{full_marks}}/g, mark.max_marks.toString());
      subjectRow = subjectRow.replace(/{{max_marks}}/g, mark.max_marks.toString());
      subjectRow = subjectRow.replace(/{{percentage}}/g, mark.is_absent ? '-' : mark.percentage.toFixed(1));
      subjectRow = subjectRow.replace(/{{grade}}/g, mark.grade || calculateGrade(mark.percentage));
      subjectRow = subjectRow.replace(/{{remarks}}/g, mark.is_absent ? 'Absent' : 'Good');
      subjectsHtml += subjectRow;
    });
    
    result = result.replace(/{{#each subjects}}[\s\S]*?{{\/each}}/, subjectsHtml);
  }
  
  // Additional placeholders with default values
  result = result.replace(/{{class_teacher_name}}/g, 'Class Teacher');
  result = result.replace(/{{class_teacher_signature}}/g, '');
  result = result.replace(/{{principal_signature}}/g, '');
  result = result.replace(/{{total_working_days}}/g, '200');
  result = result.replace(/{{days_present}}/g, '195');
  result = result.replace(/{{attendance_percentage}}/g, '97.5');
  result = result.replace(/{{conduct_grade}}/g, 'A');
  result = result.replace(/{{conduct_remarks}}/g, 'Excellent');
  result = result.replace(/{{teacher_remarks}}/g, 'Keep up the good work!');
  
  return result;
}

// Helper function to calculate grade from percentage
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

// Generate PDF using browser's print functionality
export async function generateReportCardPDF(data: ReportData): Promise<void> {
  // Create a new window for the report
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }
  
  // Process the template
  const htmlContent = replacePlaceholders(data.template.html, data);
  
  // Create the complete HTML document
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Report Card - ${data.student.name}</title>
      <style>
        ${data.template.css}
        
        /* Print-specific styles */
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        
        /* Additional responsive styles */
        .report-card {
          max-width: 800px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      
      <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
        <button onclick="window.print()" style="
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          margin-right: 10px;
        ">
          Print/Save as PDF
        </button>
        <button onclick="window.close()" style="
          background: #6b7280; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
        ">
          Close
        </button>
      </div>
    </body>
    </html>
  `;
  
  // Write the HTML to the new window
  printWindow.document.write(fullHtml);
  printWindow.document.close();
  
  // Focus the window
  printWindow.focus();
}

// Download report as HTML file (fallback)
export function downloadReportAsHTML(data: ReportData): void {
  const htmlContent = replacePlaceholders(data.template.html, data);
  
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Report Card - ${data.student.name}</title>
      <style>${data.template.css}</style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `;
  
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `report-card-${data.student.name.replace(/\s+/g, '-')}-${data.exam.name.replace(/\s+/g, '-')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Preview report in modal (for preview functionality)
export function previewReportCard(data: ReportData): string {
  const htmlContent = replacePlaceholders(data.template.html, data);
  
  return `
    <style>${data.template.css}</style>
    <div style="transform: scale(0.7); transform-origin: top left; width: 142.86%; height: 142.86%; overflow: hidden;">
      ${htmlContent}
    </div>
  `;
} 