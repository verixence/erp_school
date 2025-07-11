/**
 * 🎯 Report Card Template Tokens
 * 
 * This module defines all available Handlebars tokens that can be used
 * in report card templates. These tokens are used by the no-code builder
 * to populate dynamic content.
 */

export interface TokenCategory {
  id: string;
  label: string;
  description: string;
  tokens: Token[];
}

export interface Token {
  id: string;
  label: string;
  token: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'image' | 'list';
  example: string;
}

/**
 * All available token categories for report card templates
 */
export const tokenCategories: TokenCategory[] = [
  {
    id: 'student',
    label: 'Student Information',
    description: 'Basic student details and personal information',
    tokens: [
      {
        id: 'student_name',
        label: 'Student Name',
        token: '{{student.full_name}}',
        description: 'Full name of the student',
        type: 'text',
        example: 'John Doe'
      },
      {
        id: 'student_admission',
        label: 'Admission Number',
        token: '{{student.admission_no}}',
        description: 'Unique admission number',
        type: 'text',
        example: 'ADM001'
      },
      {
        id: 'student_roll',
        label: 'Roll Number',
        token: '{{student.roll_no}}',
        description: 'Class roll number',
        type: 'text',
        example: '15'
      },
      {
        id: 'student_section',
        label: 'Class & Section',
        token: '{{student.section}}',
        description: 'Class and section information',
        type: 'text',
        example: 'Class 10-A'
      },
      {
        id: 'student_dob',
        label: 'Date of Birth',
        token: '{{student.date_of_birth}}',
        description: 'Student\'s date of birth',
        type: 'date',
        example: '2008-05-15'
      },
      {
        id: 'student_photo',
        label: 'Student Photo',
        token: '{{student.photo_url}}',
        description: 'URL to student\'s photograph',
        type: 'image',
        example: '/images/students/john-doe.jpg'
      }
    ]
  },
  {
    id: 'school',
    label: 'School Information',
    description: 'School details, branding, and contact information',
    tokens: [
      {
        id: 'school_name',
        label: 'School Name',
        token: '{{school.name}}',
        description: 'Official name of the school',
        type: 'text',
        example: 'Green Valley High School'
      },
      {
        id: 'school_address',
        label: 'School Address',
        token: '{{school.address}}',
        description: 'Complete school address',
        type: 'text',
        example: '123 Education Street, Learning City - 123456'
      },
      {
        id: 'school_logo',
        label: 'School Logo',
        token: '{{school.logo_url}}',
        description: 'URL to school logo/emblem',
        type: 'image',
        example: '/images/school-logo.png'
      },
      {
        id: 'school_phone',
        label: 'School Phone',
        token: '{{school.phone}}',
        description: 'School contact phone number',
        type: 'text',
        example: '+1-234-567-8900'
      },
      {
        id: 'school_website',
        label: 'School Website',
        token: '{{school.website}}',
        description: 'School website URL',
        type: 'text',
        example: 'www.greenvalley.edu'
      },
      {
        id: 'school_principal',
        label: 'Principal Name',
        token: '{{school.principal_name}}',
        description: 'Name of the school principal',
        type: 'text',
        example: 'Dr. Sarah Johnson'
      }
    ]
  },
  {
    id: 'exam',
    label: 'Exam Information',
    description: 'Examination details and academic session info',
    tokens: [
      {
        id: 'exam_name',
        label: 'Exam Name',
        token: '{{exam.name}}',
        description: 'Name of the examination',
        type: 'text',
        example: 'First Term Examination'
      },
      {
        id: 'exam_year',
        label: 'Academic Year',
        token: '{{exam.academic_year}}',
        description: 'Current academic year',
        type: 'text',
        example: '2024-25'
      },
      {
        id: 'exam_date',
        label: 'Exam Date',
        token: '{{exam.exam_date}}',
        description: 'Date when exam was conducted',
        type: 'date',
        example: '2024-12-15'
      },
      {
        id: 'exam_term',
        label: 'Term/Semester',
        token: '{{exam.term}}',
        description: 'Academic term or semester',
        type: 'text',
        example: 'Term 1'
      }
    ]
  },
  {
    id: 'marks',
    label: 'Academic Performance',
    description: 'Marks, grades, and performance metrics',
    tokens: [
      {
        id: 'total_marks',
        label: 'Total Marks',
        token: '{{overall.total_marks}}',
        description: 'Total maximum marks across all subjects',
        type: 'number',
        example: '500'
      },
      {
        id: 'obtained_marks',
        label: 'Obtained Marks',
        token: '{{overall.obtained_marks}}',
        description: 'Total marks obtained by student',
        type: 'number',
        example: '412'
      },
      {
        id: 'percentage',
        label: 'Percentage',
        token: '{{overall.percentage}}',
        description: 'Overall percentage score',
        type: 'number',
        example: '82.4'
      },
      {
        id: 'grade',
        label: 'Overall Grade',
        token: '{{overall.grade}}',
        description: 'Overall grade based on percentage',
        type: 'text',
        example: 'A'
      },
      {
        id: 'rank',
        label: 'Class Rank',
        token: '{{overall.rank}}',
        description: 'Student\'s rank in the class',
        type: 'number',
        example: '5'
      },
      {
        id: 'gpa',
        label: 'GPA',
        token: '{{overall.gpa}}',
        description: 'Grade Point Average',
        type: 'number',
        example: '3.8'
      }
    ]
  },
  {
    id: 'subjects',
    label: 'Subject-wise Performance',
    description: 'Individual subject marks and grades (use in loops)',
    tokens: [
      {
        id: 'subject_name',
        label: 'Subject Name',
        token: '{{this.name}}',
        description: 'Name of the subject (inside subjects loop)',
        type: 'text',
        example: 'Mathematics'
      },
      {
        id: 'subject_total',
        label: 'Subject Total Marks',
        token: '{{this.total_marks}}',
        description: 'Maximum marks for this subject',
        type: 'number',
        example: '100'
      },
      {
        id: 'subject_obtained',
        label: 'Subject Obtained Marks',
        token: '{{this.obtained_marks}}',
        description: 'Marks obtained in this subject',
        type: 'number',
        example: '85'
      },
      {
        id: 'subject_grade',
        label: 'Subject Grade',
        token: '{{this.grade}}',
        description: 'Grade for this subject',
        type: 'text',
        example: 'A'
      },
      {
        id: 'subject_percentage',
        label: 'Subject Percentage',
        token: '{{calculatePercentage this.obtained_marks this.total_marks}}',
        description: 'Calculated percentage for subject',
        type: 'number',
        example: '85.0'
      }
    ]
  },
  {
    id: 'attendance',
    label: 'Attendance Information',
    description: 'Student attendance records and statistics',
    tokens: [
      {
        id: 'total_days',
        label: 'Total Working Days',
        token: '{{attendance.total_days}}',
        description: 'Total number of working days',
        type: 'number',
        example: '180'
      },
      {
        id: 'present_days',
        label: 'Days Present',
        token: '{{attendance.present_days}}',
        description: 'Number of days student was present',
        type: 'number',
        example: '165'
      },
      {
        id: 'attendance_percentage',
        label: 'Attendance Percentage',
        token: '{{attendance.percentage}}',
        description: 'Attendance percentage',
        type: 'number',
        example: '91.7'
      }
    ]
  },
  {
    id: 'translations',
    label: 'Multi-language Labels',
    description: 'Translated text labels for internationalization',
    tokens: [
      {
        id: 't_report_title',
        label: 'Report Title',
        token: '{{t.reportTitle}}',
        description: 'Translated report card title',
        type: 'text',
        example: 'Academic Report Card'
      },
      {
        id: 't_student_name',
        label: 'Student Name Label',
        token: '{{t.studentName}}',
        description: 'Translated "Student Name" label',
        type: 'text',
        example: 'Student Name'
      },
      {
        id: 't_subjects',
        label: 'Subjects Label',
        token: '{{t.subjects}}',
        description: 'Translated "Subjects" label',
        type: 'text',
        example: 'Subjects'
      },
      {
        id: 't_total_marks',
        label: 'Total Marks Label',
        token: '{{t.totalMarks}}',
        description: 'Translated "Total Marks" label',
        type: 'text',
        example: 'Total Marks'
      },
      {
        id: 't_obtained_marks',
        label: 'Obtained Marks Label',
        token: '{{t.obtainedMarks}}',
        description: 'Translated "Obtained Marks" label',
        type: 'text',
        example: 'Obtained Marks'
      },
      {
        id: 't_grade',
        label: 'Grade Label',
        token: '{{t.grade_display}}',
        description: 'Translated "Grade" label',
        type: 'text',
        example: 'Grade'
      },
      {
        id: 't_percentage',
        label: 'Percentage Label',
        token: '{{t.percentage}}',
        description: 'Translated "Percentage" label',
        type: 'text',
        example: 'Percentage'
      },
      {
        id: 't_principal_signature',
        label: 'Principal Signature Label',
        token: '{{t.principalSignature}}',
        description: 'Translated "Principal" signature label',
        type: 'text',
        example: 'Principal'
      },
      {
        id: 't_teacher_signature',
        label: 'Class Teacher Signature Label',
        token: '{{t.classTeacherSignature}}',
        description: 'Translated "Class Teacher" signature label',
        type: 'text',
        example: 'Class Teacher'
      },
      {
        id: 't_parent_signature',
        label: 'Parent Signature Label',
        token: '{{t.parentSignature}}',
        description: 'Translated "Parent/Guardian" signature label',
        type: 'text',
        example: 'Parent/Guardian'
      }
    ]
  },
  {
    id: 'helpers',
    label: 'Helper Functions',
    description: 'Utility functions for calculations and formatting',
    tokens: [
      {
        id: 'calculate_percentage',
        label: 'Calculate Percentage',
        token: '{{calculatePercentage obtained total}}',
        description: 'Calculate percentage from two numbers',
        type: 'number',
        example: '85.0'
      },
      {
        id: 'format_date',
        label: 'Format Date',
        token: '{{formatDate date "DD/MM/YYYY"}}',
        description: 'Format date in specified format',
        type: 'text',
        example: '15/12/2024'
      },
      {
        id: 'grade_color',
        label: 'Grade Color',
        token: '{{getGradeColor grade}}',
        description: 'Get color code for a grade',
        type: 'text',
        example: '#22c55e'
      },
      {
        id: 'upper_case',
        label: 'Uppercase',
        token: '{{toUpperCase text}}',
        description: 'Convert text to uppercase',
        type: 'text',
        example: 'JOHN DOE'
      },
      {
        id: 'lower_case',
        label: 'Lowercase',
        token: '{{toLowerCase text}}',
        description: 'Convert text to lowercase',
        type: 'text',
        example: 'john doe'
      }
    ]
  }
];

/**
 * Get all tokens flattened into a single array
 */
export const getAllTokens = (): Token[] => {
  return tokenCategories.flatMap(category => category.tokens);
};

/**
 * Find token by ID
 */
export const getTokenById = (id: string): Token | undefined => {
  return getAllTokens().find(token => token.id === id);
};

/**
 * Search tokens by label or description
 */
export const searchTokens = (query: string): Token[] => {
  const lowercaseQuery = query.toLowerCase();
  return getAllTokens().filter(
    token =>
      token.label.toLowerCase().includes(lowercaseQuery) ||
      token.description.toLowerCase().includes(lowercaseQuery) ||
      token.token.toLowerCase().includes(lowercaseQuery)
  );
};

/**
 * Get tokens by category
 */
export const getTokensByCategory = (categoryId: string): Token[] => {
  const category = tokenCategories.find(cat => cat.id === categoryId);
  return category ? category.tokens : [];
}; 