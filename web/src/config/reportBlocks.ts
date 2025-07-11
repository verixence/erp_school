/**
 * 🧱 Report Card Template Blocks
 * 
 * This module defines pre-built blocks for the GrapesJS no-code template builder.
 * Each block represents a common component used in report cards.
 */

export interface ReportBlock {
  id: string;
  label: string;
  category: string;
  media: string;
  content: {
    type: string;
    content?: string;
    style?: Record<string, string>;
    classes?: string[];
    attributes?: Record<string, string>;
    components?: any[];
  };
  activate?: boolean;
  select?: boolean;
}

/**
 * Pre-defined theme presets for different boards
 */
export const themePresets = {
  'cbse-classic': {
    name: 'CBSE Classic',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    accentColor: '#dbeafe',
    fontFamily: 'Arial, sans-serif',
    borderRadius: '8px'
  },
  'modern-minimal': {
    name: 'Modern Minimal',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    accentColor: '#d1fae5',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '12px'
  },
  'ssc-bold': {
    name: 'SSC Bold',
    primaryColor: '#dc2626',
    secondaryColor: '#b91c1c',
    accentColor: '#fee2e2',
    fontFamily: 'Georgia, serif',
    borderRadius: '4px'
  },
  'icse-elegant': {
    name: 'ICSE Elegant',
    primaryColor: '#7c3aed',
    secondaryColor: '#6d28d9',
    accentColor: '#ede9fe',
    fontFamily: 'Times New Roman, serif',
    borderRadius: '6px'
  }
};

/**
 * All available report blocks for the template builder
 */
export const reportBlocks: ReportBlock[] = [
  // Header Section Blocks
  {
    id: 'header-basic',
    label: 'Basic Header',
    category: 'Header',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v4H3V4zm0 6h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>`,
    content: {
      type: 'header',
      content: `
        <header class="header text-center mb-8 pb-4 border-b-2 border-blue-600">
          <div class="school-info">
            <h1 class="school-name text-3xl font-bold text-blue-900 mb-2">{{school.name}}</h1>
            <p class="school-address text-gray-600 mb-4">{{school.address}}</p>
            <h2 class="report-title text-xl text-gray-700 font-semibold">{{t.reportTitle}}</h2>
          </div>
        </header>
      `,
      classes: ['gjs-no-pointer']
    }
  },
  {
    id: 'header-with-logo',
    label: 'Header with Logo',
    category: 'Header',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="8" r="3"/><path d="M3 4h18v4H3V4zm0 6h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>`,
    content: {
      type: 'header',
      content: `
        <header class="header flex items-center justify-center mb-8 pb-4 border-b-2 border-blue-600">
          {{#if school.logo_url}}
          <img src="{{school.logo_url}}" alt="School Logo" class="logo w-20 h-20 mr-6 object-contain" />
          {{/if}}
          <div class="school-info text-center">
            <h1 class="school-name text-3xl font-bold text-blue-900 mb-2">{{school.name}}</h1>
            <p class="school-address text-gray-600 mb-4">{{school.address}}</p>
            <h2 class="report-title text-xl text-gray-700 font-semibold">{{t.reportTitle}}</h2>
          </div>
        </header>
      `,
      classes: ['gjs-no-pointer']
    }
  },

  // Student Info Blocks
  {
    id: 'student-info-grid',
    label: 'Student Info Grid',
    category: 'Student Info',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    content: {
      type: 'section',
      content: `
        <section class="student-info my-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
          <div class="info-grid grid grid-cols-2 gap-4">
            <div class="info-item flex items-center">
              <span class="label font-semibold text-gray-700 min-w-[120px]">{{t.studentName}}:</span>
              <span class="value font-medium text-gray-900">{{student.full_name}}</span>
            </div>
            <div class="info-item flex items-center">
              <span class="label font-semibold text-gray-700 min-w-[120px]">{{t.admissionNo}}:</span>
              <span class="value font-medium text-gray-900">{{student.admission_no}}</span>
            </div>
            <div class="info-item flex items-center">
              <span class="label font-semibold text-gray-700 min-w-[120px]">{{t.grade}}:</span>
              <span class="value font-medium text-gray-900">{{student.section}}</span>
            </div>
            <div class="info-item flex items-center">
              <span class="label font-semibold text-gray-700 min-w-[120px]">{{t.rollNo}}:</span>
              <span class="value font-medium text-gray-900">{{student.roll_no}}</span>
            </div>
          </div>
        </section>
      `,
      classes: ['gjs-no-pointer']
    }
  },
  {
    id: 'student-info-card',
    label: 'Student Info Card',
    category: 'Student Info',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M12 13v4h6v-4"/></svg>`,
    content: {
      type: 'section',
      content: `
        <section class="student-info my-6 p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500">
          <div class="flex items-start space-x-6">
            {{#if student.photo_url}}
            <img src="{{student.photo_url}}" alt="Student Photo" class="w-24 h-24 rounded-lg object-cover border-2 border-gray-200" />
            {{/if}}
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Student Information</h3>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block text-sm font-medium text-gray-500">{{t.studentName}}</span>
                  <span class="block text-lg font-semibold text-gray-900">{{student.full_name}}</span>
                </div>
                <div>
                  <span class="block text-sm font-medium text-gray-500">{{t.admissionNo}}</span>
                  <span class="block text-lg font-semibold text-gray-900">{{student.admission_no}}</span>
                </div>
                <div>
                  <span class="block text-sm font-medium text-gray-500">{{t.grade}}</span>
                  <span class="block text-lg font-semibold text-gray-900">{{student.section}}</span>
                </div>
                <div>
                  <span class="block text-sm font-medium text-gray-500">{{t.rollNo}}</span>
                  <span class="block text-lg font-semibold text-gray-900">{{student.roll_no}}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      `,
      classes: ['gjs-no-pointer']
    }
  },

  // Subject Table Blocks
  {
    id: 'marks-table-basic',
    label: 'Basic Marks Table',
    category: 'Subject Table',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>`,
    content: {
      type: 'section',
      content: `
        <section class="marks-section my-6">
          <table class="marks-table w-full border-collapse shadow-lg rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <th class="p-4 text-left font-semibold">{{t.subjects}}</th>
                <th class="p-4 text-center font-semibold">{{t.totalMarks}}</th>
                <th class="p-4 text-center font-semibold">{{t.obtainedMarks}}</th>
                <th class="p-4 text-center font-semibold">{{t.percentage}}</th>
                <th class="p-4 text-center font-semibold">{{t.grade_display}}</th>
              </tr>
            </thead>
            <tbody>
              {{#each subjects}}
              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="p-3 font-medium">{{this.name}}</td>
                <td class="p-3 text-center">{{this.total_marks}}</td>
                <td class="p-3 text-center">{{this.obtained_marks}}</td>
                <td class="p-3 text-center">{{calculatePercentage this.obtained_marks this.total_marks}}%</td>
                <td class="p-3 text-center">
                  <span class="grade-badge inline-block px-3 py-1 rounded-full text-white font-bold" style="background-color: {{getGradeColor this.grade}}">
                    {{this.grade}}
                  </span>
                </td>
              </tr>
              {{/each}}
            </tbody>
            <tfoot>
              <tr class="bg-gray-100 font-bold text-lg">
                <td class="p-4 border-t-2 border-blue-600">Total</td>
                <td class="p-4 text-center border-t-2 border-blue-600">{{overall.total_marks}}</td>
                <td class="p-4 text-center border-t-2 border-blue-600">{{overall.obtained_marks}}</td>
                <td class="p-4 text-center border-t-2 border-blue-600">{{overall.percentage}}%</td>
                <td class="p-4 text-center border-t-2 border-blue-600">
                  <span class="grade-badge inline-block px-3 py-1 rounded-full text-white font-bold" style="background-color: {{getGradeColor overall.grade}}">
                    {{overall.grade}}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      `,
      classes: ['gjs-no-pointer']
    }
  },

  // Grade Summary Blocks
  {
    id: 'grade-summary-cards',
    label: 'Grade Summary Cards',
    category: 'Grade Summary',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="6" height="6" rx="1"/><rect x="9" y="6" width="6" height="6" rx="1"/><rect x="16" y="6" width="6" height="6" rx="1"/></svg>`,
    content: {
      type: 'section',
      content: `
        <section class="performance my-6 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
          <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Overall Performance
          </h3>
          <div class="performance-grid grid grid-cols-3 gap-6 text-center">
            <div class="performance-item">
              <span class="block text-sm font-medium text-gray-500 mb-2">{{t.percentage}}</span>
              <span class="block text-3xl font-bold text-gray-900">{{overall.percentage}}%</span>
            </div>
            <div class="performance-item">
              <span class="block text-sm font-medium text-gray-500 mb-2">{{t.grade_display}}</span>
              <span class="block text-3xl font-bold" style="color: {{getGradeColor overall.grade}}">{{overall.grade}}</span>
            </div>
            <div class="performance-item">
              <span class="block text-sm font-medium text-gray-500 mb-2">{{t.rank}}</span>
              <span class="block text-3xl font-bold text-gray-900">{{overall.rank}}</span>
            </div>
          </div>
        </section>
      `,
      classes: ['gjs-no-pointer']
    }
  },

  // Attendance Blocks
  {
    id: 'attendance-info',
    label: 'Attendance Info',
    category: 'Attendance',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    content: {
      type: 'section',
      content: `
        <section class="attendance my-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 class="text-lg font-bold text-blue-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Attendance Record
          </h3>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div class="bg-white p-4 rounded-lg shadow-sm">
              <span class="block text-sm font-medium text-gray-500 mb-1">Total Days</span>
              <span class="block text-2xl font-bold text-gray-900">{{attendance.total_days}}</span>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm">
              <span class="block text-sm font-medium text-gray-500 mb-1">Present</span>
              <span class="block text-2xl font-bold text-green-600">{{attendance.present_days}}</span>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm">
              <span class="block text-sm font-medium text-gray-500 mb-1">Percentage</span>
              <span class="block text-2xl font-bold text-blue-600">{{attendance.percentage}}%</span>
            </div>
          </div>
        </section>
      `,
      classes: ['gjs-no-pointer']
    }
  },

  // Remarks Blocks
  {
    id: 'remarks-section',
    label: 'Remarks Section',
    category: 'Remarks',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`,
    content: {
      type: 'section',
      content: `
        <section class="remarks my-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 class="text-lg font-bold text-yellow-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
            </svg>
            Teacher's Remarks
          </h3>
          <div class="bg-white p-4 rounded-lg border-2 border-dashed border-yellow-300 min-h-[100px]">
            <p class="text-gray-700 leading-relaxed">
              {{#if remarks}}
                {{remarks}}
              {{else}}
                <span class="text-gray-400 italic">Teacher's comments will appear here</span>
              {{/if}}
            </p>
          </div>
        </section>
      `,
      classes: ['gjs-no-pointer']
    }
  },

  // Signature Blocks
  {
    id: 'signature-block',
    label: 'Signature Block',
    category: 'Signatures',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="21"/><line x1="16" y1="17" x2="12" y2="21"/></svg>`,
    content: {
      type: 'footer',
      content: `
        <footer class="signatures grid grid-cols-3 gap-8 mt-12 pt-8">
          <div class="signature text-center">
            <div class="signature-line w-full h-0.5 bg-gray-800 mt-16 mb-2"></div>
            <p class="font-semibold text-gray-700">{{t.classTeacherSignature}}</p>
          </div>
          <div class="signature text-center">
            <div class="signature-line w-full h-0.5 bg-gray-800 mt-16 mb-2"></div>
            <p class="font-semibold text-gray-700">{{t.principalSignature}}</p>
          </div>
          <div class="signature text-center">
            <div class="signature-line w-full h-0.5 bg-gray-800 mt-16 mb-2"></div>
            <p class="font-semibold text-gray-700">{{t.parentSignature}}</p>
          </div>
        </footer>
      `,
      classes: ['gjs-no-pointer']
    }
  },

  // Text Blocks
  {
    id: 'text-heading',
    label: 'Heading',
    category: 'Text',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>`,
    content: {
      type: 'text',
      content: 'Heading Text',
      style: {
        'font-size': '24px',
        'font-weight': 'bold',
        'margin': '16px 0'
      }
    }
  },
  {
    id: 'text-paragraph',
    label: 'Paragraph',
    category: 'Text',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>`,
    content: {
      type: 'text',
      content: 'This is a paragraph of text. You can edit this content and add dynamic tokens.',
      style: {
        'line-height': '1.6',
        'margin': '8px 0'
      }
    }
  }
];

/**
 * Get blocks by category
 */
export const getBlocksByCategory = (category: string): ReportBlock[] => {
  return reportBlocks.filter(block => block.category === category);
};

/**
 * Get all available categories
 */
export const getCategories = (): string[] => {
  return [...new Set(reportBlocks.map(block => block.category))];
}; 