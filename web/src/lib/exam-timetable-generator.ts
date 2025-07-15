import { format } from 'date-fns';

export interface ExamTimetableData {
  school: {
    name: string;
    address: string;
    logo_url?: string;
  };
  exam: {
    name: string;
    date_range: string;
  };
  sections: Array<{
    name: string;
    exams: Array<{
      date: string;
      time: string;
      subject: string;
      duration: string;
      max_marks: number;
      venue: string;
    }>;
  }>;
}

export function generateExamTimetable(data: ExamTimetableData): void {
  // Create a new window for the timetable
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }

  // Generate HTML for each section
  const sectionsHtml = data.sections.map(section => `
    <div class="section-page">
      <div class="watermark"></div>
      <header>
        <div class="logo">
          <img src="${data.school.logo_url || '/logo.png'}" alt="${data.school.name} Logo" />
        </div>
        <div class="school-info">
          <h1>${data.school.name}</h1>
          <p class="school-address">${data.school.address}</p>
          <h2>${data.exam.name} - Examination Timetable</h2>
          <p>Date Range: ${data.exam.date_range}</p>
          <h3>SECTION: ${section.name}</h3>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Subject</th>
            <th>Duration</th>
            <th>Max Marks</th>
            <th>Venue</th>
          </tr>
        </thead>
        <tbody>
          ${section.exams.map(exam => `
            <tr>
              <td>${exam.date}</td>
              <td>${exam.time}</td>
              <td>${exam.subject}</td>
              <td>${exam.duration}</td>
              <td>${exam.max_marks}</td>
              <td>${exam.venue}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <footer>
        <div class="signature-space">
          <div class="signature-line"></div>
          <p>Principal</p>
        </div>
      </footer>
    </div>
  `).join('<div class="page-break"></div>');

  // Create the complete HTML document
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Exam Timetable - ${data.exam.name}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .page-break { page-break-after: always; }
        }

        .section-page {
          position: relative;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          min-height: 100vh;
          box-sizing: border-box;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 400px;
          background-image: url('${data.school.logo_url}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.1;
          pointer-events: none;
          z-index: -1;
        }

        header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 30px;
        }

        .logo {
          width: 100px;
          margin-right: 20px;
        }

        .logo img {
          width: 100%;
          height: auto;
        }

        .school-info {
          flex: 1;
        }

        .school-info h1 {
          margin: 0;
          color: #1a365d;
          font-size: 24px;
        }

        .school-address {
          margin: 5px 0;
          font-size: 12px;
          color: #4a5568;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }

        th, td {
          border: 1px solid #cbd5e0;
          padding: 8px;
          text-align: left;
        }

        th {
          background-color: #f7fafc;
          font-weight: 600;
        }

        .signature-space {
          margin-top: 50px;
          float: right;
          text-align: center;
        }

        .signature-line {
          width: 150px;
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
        }

        footer {
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      ${sectionsHtml}
      
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
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Focus the window
  printWindow.focus();
} 