import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { calculateLast2MonthsMonthlyAttendance } from './attendance-calculator';

// ============================================
// TYPES AND INTERFACES
// ============================================

export type AssessmentType = 'FA' | 'SA' | 'Unit_Test' | 'Monthly' | 'Other';
export type StateBoardTerm = 'Term1' | 'Term2' | 'Annual';
export type ReportStatus = 'draft' | 'generated' | 'published' | 'distributed';

export interface SchoolSubject {
  id: string;
  school_id: string;
  subject_name: string;
  subject_code?: string;
  grade: number;
  academic_year: string;
  is_active: boolean;
  display_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface GradeBand {
  min: number;
  max: number;
  grade: string;
  remark: string;
}

export interface GradingScale {
  id: string;
  school_id: string;
  assessment_type: AssessmentType;
  max_total_marks: number;
  grade_bands: GradeBand[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StateBoardExamGroup {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  exam_type: string;
  assessment_type?: AssessmentType;
  assessment_number?: number;
  total_marks: number;
  state_board_term?: StateBoardTerm;
  start_date: string;
  end_date: string;
  is_published: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyAttendance {
  id: string;
  student_id: string;
  school_id: string;
  exam_group_id?: string;
  month: number;
  year: number;
  working_days: number;
  present_days: number;
  attendance_percentage: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectMarks {
  subject_id: string;
  subject_name: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string;
  remark: string;
  is_absent: boolean;
}

export interface StateBoardReport {
  id: string;
  school_id: string;
  student_id: string;
  exam_group_id: string;
  academic_year: string;
  report_type: AssessmentType;
  assessment_number?: number;
  subject_marks: SubjectMarks[];
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  overall_grade?: string;
  overall_remark?: string;
  attendance_data: Record<string, MonthlyAttendance>;
  status: ReportStatus;
  is_published: boolean;
  published_at?: string;
  generated_by?: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
  // Relations
  student?: {
    id: string;
    full_name: string;
    admission_no?: string;
    section?: string;
    grade?: string;
    student_parents?: Array<{
      parent: {
        first_name: string;
        last_name: string;
      };
    }>;
  };
  exam_group?: StateBoardExamGroup;
}

export interface CreateSchoolSubjectData {
  subject_name: string;
  subject_code?: string;
  grade: number;
  academic_year: string;
  is_active?: boolean;
  display_order?: number;
}

export interface CreateMonthlyAttendanceData {
  student_id: string;
  exam_group_id?: string;
  month: number;
  year: number;
  working_days: number;
  present_days: number;
}

export interface CreateStateBoardExamGroupData {
  name: string;
  description?: string;
  exam_type: string;
  assessment_type: AssessmentType;
  assessment_number?: number;
  total_marks?: number;
  state_board_term?: StateBoardTerm;
  start_date: string;
  end_date: string;
  is_published?: boolean;
}

// ============================================
// GRADING LOGIC FUNCTIONS
// ============================================

/**
 * Calculate grade and remark for given marks using grading scales
 */
export function calculateGrade(
  marks: number,
  maxMarks: number,
  gradingScale: GradingScale
): { grade: string; remark: string } {
  const percentage = (marks / maxMarks) * 100;
  
  // Find matching grade band
  const gradeBand = gradingScale.grade_bands.find(
    band => percentage >= band.min && percentage <= band.max
  );
  
  return gradeBand 
    ? { grade: gradeBand.grade, remark: gradeBand.remark }
    : { grade: 'D', remark: 'Need Assessment' };
}

/**
 * Calculate overall grade for SA assessment (total across subjects)
 */
export function calculateOverallGrade(
  subjectMarks: SubjectMarks[],
  gradingScale: GradingScale
): { grade: string; remark: string; totalObtained: number; totalMax: number } {
  const totalObtained = subjectMarks.reduce((sum, subject) => 
    sum + (subject.is_absent ? 0 : subject.marks_obtained), 0);
  const totalMax = subjectMarks.reduce((sum, subject) => sum + subject.max_marks, 0);
  
  const overallGrade = calculateGrade(totalObtained, totalMax, gradingScale);
  
  return {
    ...overallGrade,
    totalObtained,
    totalMax
  };
}

/**
 * Default grading scales for Telangana State Board
 */
export const DEFAULT_FA_GRADING: GradeBand[] = [
  { min: 19, max: 20, grade: "O", remark: "Outstanding" },
  { min: 15, max: 18, grade: "A", remark: "Excellent Progress" },
  { min: 11, max: 14, grade: "B", remark: "Good" },
  { min: 6, max: 10, grade: "C", remark: "Pass" },
  { min: 0, max: 5, grade: "D", remark: "Needs Improvement" }
];

export const DEFAULT_SA_GRADING: GradeBand[] = [
  { min: 540, max: 600, grade: "O", remark: "Outstanding" },
  { min: 432, max: 539, grade: "A", remark: "Excellent" },
  { min: 312, max: 431, grade: "B", remark: "Good" },
  { min: 205, max: 311, grade: "C", remark: "Pass" },
  { min: 0, max: 204, grade: "D", remark: "Need to Improve" }
];

// ============================================
// API HOOKS - SCHOOL SUBJECTS
// ============================================

export const useSchoolSubjects = (schoolId?: string, grade?: number, academicYear?: string) => {
  return useQuery({
    queryKey: ['school-subjects', schoolId, grade, academicYear],
    queryFn: async () => {
      let query = supabase
        .from('school_subjects')
        .select('*')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .order('display_order, subject_name');
      
      if (grade) {
        query = query.eq('grade', grade);
      }
      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SchoolSubject[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateSchoolSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateSchoolSubjectData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      const { data: result, error } = await supabase
        .from('school_subjects')
        .insert({
          ...data,
          school_id: userData.school_id,
          created_by: user.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as SchoolSubject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-subjects', data.school_id, data.grade, data.academic_year] 
      });
    },
  });
};

export const useUpdateSchoolSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateSchoolSubjectData>) => {
      const { data: result, error } = await supabase
        .from('school_subjects')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as SchoolSubject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-subjects', data.school_id] 
      });
    },
  });
};

export const useDeleteSchoolSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects'] });
    },
  });
};

// ============================================
// API HOOKS - GRADING SCALES
// ============================================

export const useGradingScales = (schoolId?: string, assessmentType?: AssessmentType) => {
  return useQuery({
    queryKey: ['grading-scales', schoolId, assessmentType],
    queryFn: async () => {
      let query = supabase
        .from('grading_scales')
        .select('*')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .order('assessment_type, max_total_marks');
      
      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as GradingScale[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateGradingScale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<GradingScale, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('grading_scales')
        .insert({
          ...data,
          created_by: user.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as GradingScale;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['grading-scales', data.school_id] 
      });
    },
  });
};

// ============================================
// API HOOKS - STATE BOARD EXAM GROUPS
// ============================================

export const useStateBoardExamGroups = (schoolId?: string, assessmentType?: AssessmentType) => {
  return useQuery({
    queryKey: ['state-board-exam-groups', schoolId, assessmentType],
    queryFn: async () => {
      let query = supabase
        .from('exam_groups')
        .select('*')
        .eq('school_id', schoolId!)
        .in('exam_type', ['state_fa1', 'state_fa2', 'state_fa3', 'state_fa4', 'state_sa1', 'state_sa2', 'state_sa3'])
        .order('assessment_number, created_at');
      
      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StateBoardExamGroup[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateStateBoardExamGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateStateBoardExamGroupData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      const { data: result, error } = await supabase
        .from('exam_groups')
        .insert({
          ...data,
          school_id: userData.school_id,
          created_by: user.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as StateBoardExamGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['state-board-exam-groups', data.school_id] 
      });
    },
  });
};

// ============================================
// API HOOKS - MONTHLY ATTENDANCE
// ============================================

export const useMonthlyAttendance = (studentId?: string, year?: number) => {
  return useQuery({
    queryKey: ['monthly-attendance', studentId, year],
    queryFn: async () => {
      let query = supabase
        .from('monthly_attendance')
        .select('*')
        .eq('student_id', studentId!)
        .order('year, month');
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MonthlyAttendance[];
    },
    enabled: !!studentId,
  });
};

export const useCreateMonthlyAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateMonthlyAttendanceData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      const { data: result, error } = await supabase
        .from('monthly_attendance')
        .upsert({
          ...data,
          school_id: userData.school_id,
          created_by: user.user.id,
        }, {
          onConflict: 'student_id,school_id,month,year'
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as MonthlyAttendance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['monthly-attendance', data.student_id] 
      });
    },
  });
};

export const useBulkCreateMonthlyAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendanceData: CreateMonthlyAttendanceData[]) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      const dataWithSchool = attendanceData.map(data => ({
        ...data,
        school_id: userData.school_id,
        created_by: user.user.id,
      }));

      const { data: result, error } = await supabase
        .from('monthly_attendance')
        .upsert(dataWithSchool, {
          onConflict: 'student_id,school_id,month,year'
        })
        .select();
      
      if (error) throw error;
      return result as MonthlyAttendance[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-attendance'] });
    },
  });
};

// ============================================
// API HOOKS - STATE BOARD REPORTS
// ============================================

export const useStateBoardReports = (schoolId?: string, examGroupId?: string, status?: ReportStatus) => {
  return useQuery({
    queryKey: ['state-board-reports', schoolId, examGroupId, status],
    queryFn: async () => {
      let query = supabase
        .from('state_board_reports')
        .select(`
          *,
          student:students(
            id,
            full_name,
            admission_no,
            section,
            grade,
            student_parents(
              parent:users!student_parents_parent_id_fkey(
                first_name,
                last_name
              )
            )
          ),
          exam_group:exam_groups(id, name, assessment_type, assessment_number)
        `)
        .order('generated_at', { ascending: false });
      
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      if (examGroupId) {
        query = query.eq('exam_group_id', examGroupId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StateBoardReport[];
    },
    enabled: !!schoolId,
  });
};

export const useGenerateStateBoardReports = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      examGroupId, 
      studentIds 
    }: { 
      examGroupId: string; 
      studentIds: string[]; 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      // Get exam group details
      const { data: examGroup, error: examGroupError } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('id', examGroupId)
        .single();

      if (examGroupError) throw examGroupError;

      // Process each student
      const results = await Promise.all(
        studentIds.map(async (studentId) => {
          // Get student's marks for this exam group
          const { data: marks, error: marksError } = await supabase
            .from('marks')
            .select(`
              *,
              exam_paper:exam_papers(
                id,
                subject,
                max_marks,
                exam_date,
                exam_time
              )
            `)
            .eq('student_id', studentId)
            .eq('exam_paper.exam_group_id', examGroupId);

          if (marksError) throw marksError;

          // Calculate subject-wise performance
          const subjectMarks: SubjectMarks[] = marks
            .sort((a, b) => {
              // Sort by exam date and time
              const dateA = new Date(`${a.exam_paper.exam_date} ${a.exam_paper.exam_time || '00:00'}`);
              const dateB = new Date(`${b.exam_paper.exam_date} ${b.exam_paper.exam_time || '00:00'}`);
              return dateA.getTime() - dateB.getTime();
            })
            .map(mark => {
              const marksObtained = mark.is_absent ? 0 : mark.marks_obtained;
              const percentage = mark.is_absent ? 0 : (marksObtained / mark.exam_paper.max_marks) * 100;
              
              // Calculate grade using appropriate grading scale
              const assessmentType = examGroup.assessment_type as AssessmentType;
              
              // Use default grading for now (can be enhanced to fetch from database)
              const gradeBands = assessmentType === 'FA' ? DEFAULT_FA_GRADING : DEFAULT_SA_GRADING;
              
              // For FA, use actual marks (0-20), for SA use percentage or total marks
              const valueForGrading = assessmentType === 'FA' ? marksObtained : percentage;
              const gradeInfo = gradeBands.find(band => valueForGrading >= band.min && valueForGrading <= band.max) 
                || { grade: 'D', remark: 'Need Assessment' };

              return {
                subject_id: mark.exam_paper.id, // Use exam paper ID as unique identifier
                subject_name: mark.exam_paper.subject, // Use the subject text directly
                marks_obtained: marksObtained,
                max_marks: mark.exam_paper.max_marks,
                percentage,
                grade: gradeInfo.grade,
                remark: gradeInfo.remark,
                is_absent: mark.is_absent
              };
            });

          // Calculate overall performance
          const totalObtained = subjectMarks.reduce((sum, subject) => sum + subject.marks_obtained, 0);
          const totalMax = subjectMarks.reduce((sum, subject) => sum + subject.max_marks, 0);
          
          // Calculate attendance for the last 2 months using actual attendance records
          const attendanceData = await calculateLast2MonthsMonthlyAttendance(studentId, userData.school_id);

          // Calculate overall grade
          let overallGrade = '';
          let overallRemark = '';
          
          if (totalMax > 0) {
            const assessmentType = examGroup.assessment_type as AssessmentType;
            const gradeBands = assessmentType === 'FA' ? DEFAULT_FA_GRADING : DEFAULT_SA_GRADING;
            
            if (assessmentType === 'FA') {
              // For FA, calculate average marks (since each subject is out of 20)
              const averageMarks = totalObtained / subjectMarks.length;
              const overallGradeInfo = gradeBands.find(band =>
                averageMarks >= band.min && averageMarks <= band.max
              ) || { grade: 'D', remark: 'Needs Improvement' };
              
              overallGrade = overallGradeInfo.grade;
              overallRemark = overallGradeInfo.remark;
            } else {
              // For SA, use total marks (600 max for 6 subjects x 100 each)
              const overallGradeInfo = gradeBands.find(band => 
                totalObtained >= band.min && totalObtained <= band.max
              ) || { grade: 'D', remark: 'Need to Improve' };
              
              overallGrade = overallGradeInfo.grade;
              overallRemark = overallGradeInfo.remark;
            }
          }

          // Create/update report
          const { data: report, error: reportError } = await supabase
            .from('state_board_reports')
            .upsert({
              school_id: userData.school_id,
              student_id: studentId,
              exam_group_id: examGroupId,
              academic_year: examGroup.academic_year || '2024-25',
              report_type: examGroup.assessment_type as AssessmentType,
              assessment_number: examGroup.assessment_number,
              subject_marks: subjectMarks,
              total_marks: totalMax,
              obtained_marks: totalObtained,
              overall_grade: overallGrade,
              overall_remark: overallRemark,
              attendance_data: attendanceData,
              status: 'generated',
              generated_by: user.user.id,
            }, {
              onConflict: 'student_id,exam_group_id,academic_year'
            })
            .select()
            .single();

          if (reportError) throw reportError;
          return report;
        })
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['state-board-reports'] });
    },
  });
};

export const usePublishStateBoardReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data: result, error } = await supabase
        .from('state_board_reports')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          status: 'published'
        })
        .eq('id', reportId)
        .select()
        .single();
      
      if (error) throw error;
      return result as StateBoardReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['state-board-reports'] });
    },
  });
};