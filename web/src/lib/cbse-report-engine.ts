// CBSE Report Card Engine - Multi-Board Support
// Handles Term 1, Term 2, and Cumulative report generation

export interface CBSESubjectMarks {
  subject: string;
  fa1?: number;
  fa2?: number;
  sa1?: number;
  fa3?: number;
  fa4?: number;
  sa2?: number;
  max_marks: number;
  is_absent: boolean;
}

export interface CBSECoScholastic {
  oral_grade?: string;
  handwriting_grade?: string;
  general_knowledge_grade?: string;
  activity_grade?: string;
  attitude_teachers?: string;
  attitude_students?: string;
  attitude_school?: string;
  punctuality?: string;
  initiative?: string;
  confidence?: string;
  neatness?: string;
  teacher_remarks?: string;
}

export interface CBSETerm1Data {
  student: {
    id: string;
    name: string;
    admission_no: string;
    section: string;
    grade: string;
  };
  subjects: Array<{
    name: string;
    fa1_gp: number;
    fa2_gp: number;
    mid_term_gp: number;
    sa1_gp: number;
    final_gpa: number;
    grade: string;
  }>;
  coScholastic: CBSECoScholastic;
  attendance: {
    working_days: number;
    present_days: number;
    percentage: number;
    monthly_breakdown?: Record<string, number>;
  };
  overall_gpa: number;
  overall_grade: string;
  term: 'Term1';
}

export interface CBSETerm2Data extends Omit<CBSETerm1Data, 'subjects' | 'term'> {
  subjects: Array<{
    name: string;
    fa3_gp: number;
    fa4_gp: number;
    mid_term_gp: number;
    sa2_gp: number;
    final_gpa: number;
    grade: string;
  }>;
  term: 'Term2';
}

export interface CBSECumulativeData {
  student: {
    id: string;
    name: string;
    admission_no: string;
    section: string;
    grade: string;
  };
  subjects: Array<{
    name: string;
    term1_gpa: number;
    term2_gpa: number;
    final_gpa: number;
    grade: string;
  }>;
  term1_overall_gpa: number;
  term2_overall_gpa: number;
  final_gpa: number;
  final_grade: string;
  promotion_status: 'PROMOTED' | 'NOT_PROMOTED';
  coScholastic: CBSECoScholastic; // Combined from both terms
  attendance: {
    working_days: number;
    present_days: number;
    percentage: number;
  };
  teacher_remarks: string;
}

// CBSE 10-Point Grading Scale
export const CBSE_GRADE_SCALE = {
  'A1': { min: 91, max: 100, gp: 10 },
  'A2': { min: 81, max: 90, gp: 9 },
  'B1': { min: 71, max: 80, gp: 8 },
  'B2': { min: 61, max: 70, gp: 7 },
  'C1': { min: 51, max: 60, gp: 6 },
  'C2': { min: 41, max: 50, gp: 5 },
  'D': { min: 33, max: 40, gp: 4 },
  'E1': { min: 21, max: 32, gp: 3 },
  'E2': { min: 0, max: 20, gp: 2 }
};

/**
 * Convert marks to CBSE Grade Points
 */
export function getGradePoints(marks: number, maxMarks: number): { gp: number; grade: string } {
  const percentage = (marks / maxMarks) * 100;
  
  for (const [grade, range] of Object.entries(CBSE_GRADE_SCALE)) {
    if (percentage >= range.min && percentage <= range.max) {
      return { gp: range.gp, grade };
    }
  }
  
  return { gp: 2, grade: 'E2' }; // Default for very low marks
}

/**
 * Calculate CBSE Term 1 GPA
 * Formula: Mid Term GPA = average(FA1, FA2), Term GPA = average(Mid Term GPA, SA1)
 */
export function calculateTerm1GPA(subjectMarks: CBSESubjectMarks[]): CBSETerm1Data['subjects'] {
  return subjectMarks.map(subject => {
    if (subject.is_absent || !subject.fa1 || !subject.fa2 || !subject.sa1) {
      return {
        name: subject.subject,
        fa1_gp: 0,
        fa2_gp: 0,
        mid_term_gp: 0,
        sa1_gp: 0,
        final_gpa: 0,
        grade: 'AB' // Absent
      };
    }

    const fa1_gp = getGradePoints(subject.fa1, subject.max_marks).gp;
    const fa2_gp = getGradePoints(subject.fa2, subject.max_marks).gp;
    const sa1_gp = getGradePoints(subject.sa1, subject.max_marks).gp;
    
    const mid_term_gp = (fa1_gp + fa2_gp) / 2;
    const final_gpa = (mid_term_gp + sa1_gp) / 2;
    const grade = Object.entries(CBSE_GRADE_SCALE).find(([_, range]) => range.gp === Math.round(final_gpa))?.[0] || 'E2';

    return {
      name: subject.subject,
      fa1_gp,
      fa2_gp,
      mid_term_gp,
      sa1_gp,
      final_gpa,
      grade
    };
  });
}

/**
 * Calculate CBSE Term 2 GPA
 * Formula: Mid Term GPA = average(FA3, FA4), Term GPA = average(Mid Term GPA, SA2)
 */
export function calculateTerm2GPA(subjectMarks: CBSESubjectMarks[]): CBSETerm2Data['subjects'] {
  return subjectMarks.map(subject => {
    if (subject.is_absent || !subject.fa3 || !subject.fa4 || !subject.sa2) {
      return {
        name: subject.subject,
        fa3_gp: 0,
        fa4_gp: 0,
        mid_term_gp: 0,
        sa2_gp: 0,
        final_gpa: 0,
        grade: 'AB' // Absent
      };
    }

    const fa3_gp = getGradePoints(subject.fa3, subject.max_marks).gp;
    const fa4_gp = getGradePoints(subject.fa4, subject.max_marks).gp;
    const sa2_gp = getGradePoints(subject.sa2, subject.max_marks).gp;
    
    const mid_term_gp = (fa3_gp + fa4_gp) / 2;
    const final_gpa = (mid_term_gp + sa2_gp) / 2;
    const grade = Object.entries(CBSE_GRADE_SCALE).find(([_, range]) => range.gp === Math.round(final_gpa))?.[0] || 'E2';

    return {
      name: subject.subject,
      fa3_gp,
      fa4_gp,
      mid_term_gp,
      sa2_gp,
      final_gpa,
      grade
    };
  });
}

/**
 * Calculate CBSE Cumulative GPA
 * Formula: Final GPA = average(Term 1 GPA, Term 2 GPA)
 */
export function calculateCumulativeGPA(
  term1Subjects: CBSETerm1Data['subjects'],
  term2Subjects: CBSETerm2Data['subjects']
): CBSECumulativeData['subjects'] {
  const subjectMap = new Map<string, { term1?: any; term2?: any }>();
  
  // Group subjects by name
  term1Subjects.forEach(subject => {
    subjectMap.set(subject.name, { term1: subject });
  });
  
  term2Subjects.forEach(subject => {
    const existing = subjectMap.get(subject.name) || {};
    subjectMap.set(subject.name, { ...existing, term2: subject });
  });

  return Array.from(subjectMap.entries()).map(([name, data]) => {
    const term1_gpa = data.term1?.final_gpa || 0;
    const term2_gpa = data.term2?.final_gpa || 0;
    const final_gpa = (term1_gpa + term2_gpa) / 2;
    const grade = Object.entries(CBSE_GRADE_SCALE).find(([_, range]) => range.gp === Math.round(final_gpa))?.[0] || 'E2';

    return {
      name,
      term1_gpa,
      term2_gpa,
      final_gpa,
      grade
    };
  });
}

/**
 * Calculate overall GPA from subject GPAs
 */
export function calculateOverallGPA(subjects: Array<{ final_gpa: number }>): { gpa: number; grade: string } {
  const validSubjects = subjects.filter(s => s.final_gpa > 0);
  if (validSubjects.length === 0) {
    return { gpa: 0, grade: 'E2' };
  }

  const totalGPA = validSubjects.reduce((sum, subject) => sum + subject.final_gpa, 0);
  const avgGPA = totalGPA / validSubjects.length;
  const grade = Object.entries(CBSE_GRADE_SCALE).find(([_, range]) => range.gp === Math.round(avgGPA))?.[0] || 'E2';

  return { gpa: avgGPA, grade };
}

/**
 * Determine promotion status based on CBSE criteria
 */
export function determinePromotionStatus(overallGPA: number, failedSubjects: number): 'PROMOTED' | 'NOT_PROMOTED' {
  // CBSE promotion criteria: Minimum 4 GP in each subject or overall 5 GP
  if (overallGPA >= 5 && failedSubjects <= 1) {
    return 'PROMOTED';
  }
  return 'NOT_PROMOTED';
}

/**
 * Board-specific report generation dispatcher
 */
export function generateBoardReport(boardType: string, data: any) {
  switch (boardType) {
    case 'CBSE':
      return generateCBSEReport(data);
    case 'ICSE':
      // Future implementation
      throw new Error('ICSE board reports not yet implemented');
    case 'STATE':
      // Future implementation  
      throw new Error('State board reports not yet implemented');
    default:
      throw new Error(`Unsupported board type: ${boardType}`);
  }
}

/**
 * Generate CBSE-specific report data
 */
function generateCBSEReport(data: any) {
  // This will be called by the main report generation system
  // Implementation depends on the specific term being generated
  return data;
} 