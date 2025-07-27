interface CoScholasticAssessment {
  id?: string;
  student_id: string;
  term: 'Term1' | 'Term2';
  academic_year: string;
  school_id?: string;
  assessed_by?: string;  // Changed from teacher_id
  updated_by?: string;
  updated_at?: string;
  
  // Co-Scholastic Activities
  oral_expression?: string;
  handwriting?: string;
  general_knowledge?: string;
  activity_sports?: string;
  
  // Attitude and Values
  towards_teachers?: string;
  towards_students?: string;
  towards_school?: string;
  
  // Personal Qualities
  punctuality?: string;
  initiative?: string;
  confidence?: string;
  neatness?: string;
  
  teacher_remarks?: string;
  status: 'draft' | 'completed';
  [key: string]: string | undefined;
} 