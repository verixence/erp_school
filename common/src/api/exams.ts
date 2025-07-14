import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export type ExamType = 
  | 'monthly' 
  | 'quarterly' 
  | 'half_yearly' 
  | 'annual' 
  | 'unit_test'
  | 'cbse_fa1'    // CBSE Formative Assessment 1
  | 'cbse_fa2'    // CBSE Formative Assessment 2
  | 'cbse_sa1'    // CBSE Summative Assessment 1 (Mid Term)
  | 'cbse_fa3'    // CBSE Formative Assessment 3
  | 'cbse_fa4'    // CBSE Formative Assessment 4
  | 'cbse_sa2'    // CBSE Summative Assessment 2 (Final)
  | 'other';

export interface Section {
  id: string;
  grade: number;
  section: string;
  capacity: number;
  class_teacher?: string;
}

export interface ExamGroup {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  is_published: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // CBSE-specific fields
  cbse_term?: 'Term1' | 'Term2';
  cbse_exam_type?: 'FA1' | 'FA2' | 'SA1' | 'FA3' | 'FA4' | 'SA2';
}

export interface ExamPaper {
  id: string;
  exam_group_id: string;
  school_id: string;
  section: string;
  subject: string;
  exam_date?: string;
  exam_time?: string;
  duration_minutes: number;
  max_marks: number;
  pass_marks: number;
  instructions?: string;
  teacher_id?: string;
  venue?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface Mark {
  id: string;
  exam_paper_id: string;
  student_id: string;
  school_id: string;
  marks_obtained?: number;
  is_absent: boolean;
  remarks?: string;
  entered_by?: string;
  entered_at: string;
  updated_at: string;
  student?: {
    id: string;
    full_name: string;
    admission_no?: string;
  };
}

export interface CreateExamGroupData {
  name: string;
  description?: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  is_published?: boolean;
  // CBSE-specific fields
  cbse_term?: 'Term1' | 'Term2';
  cbse_exam_type?: 'FA1' | 'FA2' | 'SA1' | 'FA3' | 'FA4' | 'SA2';
  sync_to_calendar?: boolean; // Whether to sync exam dates to academic calendar
}

export interface CreateExamPaperData {
  exam_group_id: string;
  section: string;
  subject: string;
  exam_date?: string;
  exam_time?: string;
  duration_minutes?: number;
  max_marks?: number;
  pass_marks?: number;
  instructions?: string;
  teacher_id?: string;
  venue?: string;
}

export interface UpdateMarkData {
  marks_obtained?: number;
  is_absent?: boolean;
  remarks?: string;
}

// Exam Groups API
export const useExamGroups = (schoolId?: string) => {
  return useQuery({
    queryKey: ['exam-groups', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('exam_groups')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ExamGroup[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateExamGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateExamGroupData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      // Prepare exam group data
      const examGroupData = {
        ...data,
        school_id: userData.school_id,
        created_by: user.user.id,
      };

      // Remove sync_to_calendar from the database insert
      const { sync_to_calendar, ...dbData } = examGroupData;

      const { data: result, error } = await supabase
        .from('exam_groups')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;

      // Sync to academic calendar if requested
      if (sync_to_calendar && result) {
        try {
          const calendarEventData = {
            school_id: userData.school_id,
            title: `${result.name} - Exam Period`,
            description: result.description || `${result.name} examination period`,
            event_date: result.start_date,
            start_time: null,
            end_time: null,
            event_type: 'exam',
            is_published: result.is_published,
            is_recurring: false,
            recurrence_pattern: null,
            recurrence_end_date: null,
            color: '#DC2626', // Red color for exams
            location: null,
            created_by: user.user.id
          };

          // Create calendar event via API
          const response = await fetch('/api/admin/calendar/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(calendarEventData),
          });

          if (!response.ok) {
            console.warn('Failed to sync exam to calendar:', await response.text());
          }
        } catch (error) {
          console.warn('Failed to sync exam to calendar:', error);
          // Don't throw error as exam group creation succeeded
        }
      }

      return result as ExamGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exam-groups', data.school_id] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); // Refresh calendar if synced
    },
  });
};

export const useUpdateExamGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateExamGroupData>) => {
      const { data: result, error } = await supabase
        .from('exam_groups')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as ExamGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exam-groups', data.school_id] });
    },
  });
};

export const useDeleteExamGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-groups'] });
    },
  });
};

// Exam Papers API
export const useExamPapers = (examGroupId?: string) => {
  return useQuery({
    queryKey: ['exam-papers', examGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          teacher:teachers(
            id,
            first_name,
            last_name
          )
        `)
        .eq('exam_group_id', examGroupId!)
        .order('section', { ascending: true })
        .order('subject', { ascending: true });
      
      if (error) throw error;
      return data as ExamPaper[];
    },
    enabled: !!examGroupId,
  });
};

// New hook to fetch single exam paper by ID
export const useExamPaper = (examPaperId?: string) => {
  return useQuery({
    queryKey: ['exam-paper', examPaperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          teacher:teachers(
            id,
            first_name,
            last_name
          ),
          exam_group:exam_groups(
            id,
            name,
            exam_type
          )
        `)
        .eq('id', examPaperId!)
        .single();
      
      if (error) throw error;
      return data as ExamPaper & {
        exam_group: {
          id: string;
          name: string;
          exam_type: string;
        };
      };
    },
    enabled: !!examPaperId,
  });
};

// Hook to fetch all exam papers for a school (for school admin)
export const useSchoolExamPapers = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-exam-papers', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          teacher:teachers(
            id,
            first_name,
            last_name
          ),
          exam_group:exam_groups(
            id,
            name,
            exam_type
          )
        `)
        .eq('school_id', schoolId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (ExamPaper & {
        exam_group: {
          id: string;
          name: string;
          exam_type: string;
        };
      })[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateExamPaper = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateExamPaperData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      const { data: result, error } = await supabase
        .from('exam_papers')
        .insert({
          ...data,
          school_id: userData.school_id,
          created_by: user.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as ExamPaper;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exam-papers', data.exam_group_id] });
    },
  });
};

export const useUpdateExamPaper = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateExamPaperData>) => {
      const { data: result, error } = await supabase
        .from('exam_papers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as ExamPaper;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exam-papers', data.exam_group_id] });
    },
  });
};

export const useDeleteExamPaper = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_papers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-papers'] });
    },
  });
};

// Marks API
export const useMarks = (examPaperId?: string) => {
  return useQuery({
    queryKey: ['marks', examPaperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marks')
        .select(`
          *,
          student:students(id, full_name, admission_no, section, grade)
        `)
        .eq('exam_paper_id', examPaperId!)
        .order('student(full_name)', { ascending: true });
      
      if (error) throw error;
      return data as Mark[];
    },
    enabled: !!examPaperId,
  });
};

// Hook for school admin to view all marks for a school
export const useSchoolMarks = (schoolId?: string, examGroupId?: string) => {
  return useQuery({
    queryKey: ['school-marks', schoolId, examGroupId],
    queryFn: async () => {
      let query = supabase
        .from('marks')
        .select(`
          *,
          student:students(id, full_name, admission_no, section, grade),
          exam_paper:exam_papers(
            id,
            subject,
            section,
            max_marks,
            pass_marks,
            exam_date,
            exam_time,
            exam_group:exam_groups(
              id,
              name,
              exam_type
            )
          )
        `)
        .eq('school_id', schoolId!)
        .order('exam_paper(exam_date)', { ascending: false });
      
      if (examGroupId) {
        query = query.eq('exam_paper.exam_group_id', examGroupId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (Mark & {
        exam_paper: ExamPaper & {
          exam_group: {
            id: string;
            name: string;
            exam_type: string;
          };
        };
      })[];
    },
    enabled: !!schoolId,
  });
};

// Hook to get marks summary for school admin dashboard
export const useMarksSummary = (schoolId?: string) => {
  return useQuery({
    queryKey: ['marks-summary', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_marks_summary', { school_id: schoolId });
      
      if (error) throw error;
      return data as {
        total_marks_entered: number;
        total_exams_conducted: number;
        average_performance: number;
        pending_mark_entries: number;
        total_students_examined: number;
      };
    },
    enabled: !!schoolId,
  });
};

// Hook to automatically create marks entries for students when exam is completed
export const useCreateMarksForExam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (examPaperId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      // Get the exam paper details
      const { data: examPaper, error: examPaperError } = await supabase
        .from('exam_papers')
        .select('*')
        .eq('id', examPaperId)
        .single();

      if (examPaperError) throw examPaperError;

      // Parse section format (e.g., "Grade 1 A" -> grade: "1", section: "A")
      const sectionMatch = examPaper.section.match(/Grade (\d+) ([A-Z]+)/);
      let students = [];
      
      if (sectionMatch) {
        const [, grade, section] = sectionMatch;
        // Get all students in the grade and section
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('school_id', userData.school_id)
          .eq('grade', grade)
          .eq('section', section);
        
        if (studentsError) throw studentsError;
        students = studentsData || [];
      } else {
        // Fallback: try exact section match
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('school_id', userData.school_id)
          .eq('section', examPaper.section);
        
                 if (studentsError) throw studentsError;
         students = studentsData || [];
       }

      if (!students || students.length === 0) {
        throw new Error(`No students found in section ${examPaper.section}. Please ensure students are enrolled in this section.`);
      }

      // Create marks entries for all students
      const marks = students.map(student => ({
        exam_paper_id: examPaperId,
        student_id: student.id,
        school_id: userData.school_id,
        entered_by: user.user.id,
        is_absent: false,
        marks_obtained: null,
      }));

      const { data, error } = await supabase
        .from('marks')
        .upsert(marks, { onConflict: 'exam_paper_id,student_id' })
        .select();
      
      if (error) throw error;
      return data as Mark[];
    },
    onSuccess: (_, examPaperId) => {
      queryClient.invalidateQueries({ queryKey: ['marks', examPaperId] });
    },
  });
};

export const useUpdateMark = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & UpdateMarkData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('marks')
        .update({
          ...data,
          entered_by: user.user.id,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as Mark;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marks', data.exam_paper_id] });
    },
  });
};

export const useBulkCreateMarks = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ examPaperId, studentIds }: { examPaperId: string; studentIds: string[] }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      const marks = studentIds.map(studentId => ({
        exam_paper_id: examPaperId,
        student_id: studentId,
        school_id: userData.school_id,
        entered_by: user.user.id,
        is_absent: false,
      }));

      const { data, error } = await supabase
        .from('marks')
        .upsert(marks, { onConflict: 'exam_paper_id,student_id' })
        .select();
      
      if (error) throw error;
      return data as Mark[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marks', variables.examPaperId] });
    },
  });
};

// Bulk marks import
export const useBulkUpdateMarks = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (marks: Array<{ id: string } & UpdateMarkData>) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Simple and efficient approach - use a single bulk update
      const updateTime = new Date().toISOString();
      const markIds = marks.map(mark => mark.id);
      
      // First, get all existing marks to merge the updates
      const { data: existingMarks, error: fetchError } = await supabase
        .from('marks')
        .select('*')
        .in('id', markIds);

      if (fetchError) {
        throw new Error(`Failed to fetch existing marks: ${fetchError.message}`);
      }

      // Merge the updates with existing data
      const marksToUpdate = existingMarks.map(existingMark => {
        const update = marks.find(m => m.id === existingMark.id);
        return {
          ...existingMark,
          marks_obtained: update?.marks_obtained !== undefined ? update.marks_obtained : existingMark.marks_obtained,
          is_absent: update?.is_absent !== undefined ? update.is_absent : existingMark.is_absent,
          remarks: update?.remarks !== undefined ? update.remarks : existingMark.remarks,
          entered_by: user.user.id,
          updated_at: updateTime
        };
      });

      // Use upsert to update all marks in one operation
      const { data, error } = await supabase
        .from('marks')
        .upsert(marksToUpdate, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Bulk update failed:', error);
        throw new Error(error.message || 'Failed to update marks');
      }

      return data as Mark[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
    },
  });
};

// Report Cards API
export const useStudentReportCard = (studentId: string, examGroupId: string) => {
  return useQuery({
    queryKey: ['report-card', studentId, examGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_student_report_card', {
          student_id: studentId,
          exam_group_id: examGroupId
        });
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!examGroupId,
  });
};

// Report Cards Management
export interface ReportCard {
  id: string;
  student_id: string;
  exam_group_id: string;
  school_id: string;
  template_id?: string | null;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
  rank: number;
  status: 'draft' | 'published' | 'distributed';
  generated_at: string;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    full_name: string;
    admission_no?: string;
    section?: string;
  };
  exam_group?: {
    id: string;
    name: string;
    exam_type: string;
  };
}

export const useReportCards = (schoolId?: string, examGroupId?: string, status?: string) => {
  return useQuery({
    queryKey: ['report-cards', schoolId, examGroupId, status],
    queryFn: async () => {
      let query = supabase
        .from('report_cards')
        .select(`
          *,
          student:students(id, full_name, admission_no, section),
          exam_group:exam_groups(id, name, exam_type)
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
      return data as ReportCard[];
    },
    enabled: !!schoolId,
  });
};

export const useGenerateReportCards = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ examGroupId, sectionIds }: { examGroupId: string; sectionIds?: string[] }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      // Get the default template for the school
      const { data: defaultTemplate } = await supabase
        .from('report_templates')
        .select('id')
        .eq('school_id', userData.school_id)
        .eq('is_default', true)
        .single();

      // Get students for the sections
      let studentsQuery = supabase
        .from('students')
        .select('id')
        .eq('school_id', userData.school_id);
      
      if (sectionIds && sectionIds.length > 0) {
        studentsQuery = studentsQuery.in('section', sectionIds);
      }
      
      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Generate report cards for each student
      const reportCards = students.map(student => ({
        student_id: student.id,
        exam_group_id: examGroupId,
        school_id: userData.school_id,
        template_id: defaultTemplate?.id || null, // Use actual default template ID or null
        status: 'draft' as const,
      }));

      const { data, error } = await supabase
        .from('report_cards')
        .upsert(reportCards, { onConflict: 'student_id,exam_group_id' })
        .select();
      
      if (error) throw error;

      // Calculate data for each report card
      if (data && data.length > 0) {
        for (const reportCard of data) {
          await supabase.rpc('calculate_report_card_data', {
            p_report_card_id: reportCard.id
          });
        }

        // Fetch the updated report cards with calculated data
        const { data: updatedReportCards, error: fetchError } = await supabase
          .from('report_cards')
          .select(`
            *,
            student:students(id, full_name, admission_no, section),
            exam_group:exam_groups(id, name, exam_type)
          `)
          .in('id', data.map(rc => rc.id));
        
        if (fetchError) throw fetchError;
        return updatedReportCards as ReportCard[];
      }
      
      return data as ReportCard[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
      queryClient.invalidateQueries({ queryKey: ['report-card', variables.examGroupId] });
    },
  });
};

export const useUpdateReportCardStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' | 'distributed' }) => {
      const { data, error } = await supabase
        .from('report_cards')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ReportCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
    },
  });
};

// Exam Schedule and Timetable
export interface ExamSchedule {
  id: string;
  exam_group_id: string;
  school_id: string;
  section: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  venue?: string;
  invigilator?: string;
  max_marks: number;
  pass_marks: number;
  instructions?: string;
}

export const useExamSchedule = (examGroupId?: string, section?: string) => {
  return useQuery({
    queryKey: ['exam-schedule', examGroupId, section],
    queryFn: async () => {
      let query = supabase
        .from('exam_papers')
        .select('*')
        .order('exam_date', { ascending: true })
        .order('exam_time', { ascending: true });
      
      if (examGroupId) {
        query = query.eq('exam_group_id', examGroupId);
      }
      if (section) {
        query = query.eq('section', section);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ExamPaper[];
    },
    enabled: !!examGroupId,
  });
};

export const useUpdateExamSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scheduleData: { id: string; exam_date?: string; exam_time?: string; venue?: string; invigilator?: string }) => {
      const { data, error } = await supabase
        .from('exam_papers')
        .update(scheduleData)
        .eq('id', scheduleData.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ExamPaper;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exam-schedule', data.exam_group_id] });
      queryClient.invalidateQueries({ queryKey: ['exam-papers', data.exam_group_id] });
    },
  });
};

// School information for branding
export const useSchoolInfo = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-info', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, address, phone_number, email_address, logo_url, establishment_year, board_affiliation, principal_name')
        .eq('id', schoolId!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });
};

// Sections for a school
export const useSchoolSections = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-sections', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('id, grade, section, capacity, class_teacher')
        .eq('school_id', schoolId!)
        .order('grade', { ascending: true })
        .order('section', { ascending: true });
      
      if (error) throw error;
      return data as Section[];
    },
    enabled: !!schoolId,
  });
};

// ============================================
// CBSE REPORT CARD INTERFACES & CALCULATIONS
// ============================================

export interface CBSESubjectData {
  name: string;
  fa1_marks?: number;
  fa1_max?: number;
  fa1_gp?: number;
  fa2_marks?: number;
  fa2_max?: number;
  fa2_gp?: number;
  sa1_marks?: number;
  sa1_max?: number;
  sa1_gp?: number;
  fa3_marks?: number;
  fa3_max?: number;
  fa3_gp?: number;
  fa4_marks?: number;
  fa4_max?: number;
  fa4_gp?: number;
  sa2_marks?: number;
  sa2_max?: number;
  sa2_gp?: number;
  mid_term_gp?: number; // Average of FA1, FA2
  final_gpa?: number;   // Overall term GPA
  grade?: string;       // A1, A2, B1, etc.
}

export interface CBSETerm1Data {
  student: {
    id: string;
    name: string;
    admission_no?: string;
    section?: string;
    grade?: string;
  };
  subjects: CBSESubjectData[];
  coScholastic: any;
  attendance: {
    working_days: number;
    present_days: number;
    percentage: number;
  };
  overall_gpa: number;
  overall_grade: string;
  term: 'Term1';
}

export interface CBSETerm2Data {
  student: {
    id: string;
    name: string;
    admission_no?: string;
    section?: string;
    grade?: string;
  };
  subjects: CBSESubjectData[];
  coScholastic: any;
  attendance: {
    working_days: number;
    present_days: number;
    percentage: number;
  };
  overall_gpa: number;
  overall_grade: string;
  term: 'Term2';
}

export interface CBSECumulativeData {
  student: {
    id: string;
    name: string;
    admission_no?: string;
    section?: string;
    grade?: string;
  };
  term1_overall_gpa: number;
  term2_overall_gpa: number;
  final_gpa: number;
  final_grade: string;
  promotion_status: 'PROMOTED' | 'DETAINED' | 'COMPARTMENT';
  subjects: CBSESubjectData[];
  coScholastic: any;
  attendance: {
    working_days: number;
    present_days: number;
    percentage: number;
  };
  teacher_remarks?: string;
}

// ============================================
// CBSE GRADING SCALE & CALCULATION FUNCTIONS
// ============================================

/**
 * Rounds a number to the nearest whole number using standard mathematical rounding
 */
export function roundToNearest(value: number): number {
  return Math.round(value);
}

/**
 * Converts percentage to CBSE Grade Point (0-10 scale)
 */
export function convertToGradePoint(marks: number, maxMarks: number): number {
  if (maxMarks === 0) return 0;
  const percentage = (marks / maxMarks) * 100;
  
  if (percentage >= 91) return 10; // A1
  if (percentage >= 81) return 9;  // A2  
  if (percentage >= 71) return 8;  // B1
  if (percentage >= 61) return 7;  // B2
  if (percentage >= 51) return 6;  // C1
  if (percentage >= 41) return 5;  // C2
  if (percentage >= 33) return 4;  // D
  return 0; // E (Failed)
}

/**
 * Converts Grade Point to CBSE Grade Letter
 */
export function convertGradePointToLetter(gp: number): string {
  if (gp >= 10) return 'A1';
  if (gp >= 9) return 'A2';
  if (gp >= 8) return 'B1';
  if (gp >= 7) return 'B2';
  if (gp >= 6) return 'C1';
  if (gp >= 5) return 'C2';
  if (gp >= 4) return 'D';
  return 'E';
}

/**
 * Calculate Term1 GPA for each subject (FA1 + FA2 + SA1)
 */
export function calculateTerm1GPA(subjectMarks: any): CBSESubjectData[] {
  const subjects: CBSESubjectData[] = [];
  
  // Convert object to array of subjects
  for (const [subjectName, marksData] of Object.entries(subjectMarks as Record<string, any>)) {
    const subject: CBSESubjectData = {
      name: subjectName
    };
    
    // Extract FA1, FA2, SA1 data
    if (marksData.FA1) {
      subject.fa1_marks = marksData.FA1.marks_obtained || 0;
      subject.fa1_max = marksData.FA1.max_marks || 100;
      subject.fa1_gp = convertToGradePoint(subject.fa1_marks || 0, subject.fa1_max || 100);
    }
    
    if (marksData.FA2) {
      subject.fa2_marks = marksData.FA2.marks_obtained || 0;
      subject.fa2_max = marksData.FA2.max_marks || 100;
      subject.fa2_gp = convertToGradePoint(subject.fa2_marks || 0, subject.fa2_max || 100);
    }
    
    if (marksData.SA1) {
      subject.sa1_marks = marksData.SA1.marks_obtained || 0;
      subject.sa1_max = marksData.SA1.max_marks || 100;
      subject.sa1_gp = convertToGradePoint(subject.sa1_marks || 0, subject.sa1_max || 100);
    }
    
    // Calculate Mid Term GP (average of FA1 and FA2) with rounding
    if (subject.fa1_gp !== undefined && subject.fa2_gp !== undefined) {
      subject.mid_term_gp = roundToNearest((subject.fa1_gp + subject.fa2_gp) / 2);
    } else if (subject.fa1_gp !== undefined) {
      subject.mid_term_gp = subject.fa1_gp;
    } else if (subject.fa2_gp !== undefined) {
      subject.mid_term_gp = subject.fa2_gp;
    }
    
    // Calculate Final GPA (average of Mid Term GP and SA1 GP) with rounding
    if (subject.mid_term_gp !== undefined && subject.sa1_gp !== undefined) {
      subject.final_gpa = roundToNearest((subject.mid_term_gp + subject.sa1_gp) / 2);
    } else if (subject.mid_term_gp !== undefined) {
      subject.final_gpa = subject.mid_term_gp;
    } else if (subject.sa1_gp !== undefined) {
      subject.final_gpa = subject.sa1_gp;
    }
    
    // Convert final GPA to grade letter
    if (subject.final_gpa !== undefined) {
      subject.grade = convertGradePointToLetter(subject.final_gpa);
    }
    
    subjects.push(subject);
  }
  
  return subjects;
}

/**
 * Calculate Term2 GPA for each subject (FA3 + FA4 + SA2)
 */
export function calculateTerm2GPA(subjectMarks: any): CBSESubjectData[] {
  const subjects: CBSESubjectData[] = [];
  
  // Convert object to array of subjects
  for (const [subjectName, marksData] of Object.entries(subjectMarks as Record<string, any>)) {
    const subject: CBSESubjectData = {
      name: subjectName
    };
    
    // Extract FA3, FA4, SA2 data
    if (marksData.FA3) {
      subject.fa3_marks = marksData.FA3.marks_obtained || 0;
      subject.fa3_max = marksData.FA3.max_marks || 100;
      subject.fa3_gp = convertToGradePoint(subject.fa3_marks || 0, subject.fa3_max || 100);
    }
    
    if (marksData.FA4) {
      subject.fa4_marks = marksData.FA4.marks_obtained || 0;
      subject.fa4_max = marksData.FA4.max_marks || 100;
      subject.fa4_gp = convertToGradePoint(subject.fa4_marks || 0, subject.fa4_max || 100);
    }
    
    if (marksData.SA2) {
      subject.sa2_marks = marksData.SA2.marks_obtained || 0;
      subject.sa2_max = marksData.SA2.max_marks || 100;
      subject.sa2_gp = convertToGradePoint(subject.sa2_marks || 0, subject.sa2_max || 100);
    }
    
    // Calculate Mid Term GP (average of FA3 and FA4) with rounding
    if (subject.fa3_gp !== undefined && subject.fa4_gp !== undefined) {
      subject.mid_term_gp = roundToNearest((subject.fa3_gp + subject.fa4_gp) / 2);
    } else if (subject.fa3_gp !== undefined) {
      subject.mid_term_gp = subject.fa3_gp;
    } else if (subject.fa4_gp !== undefined) {
      subject.mid_term_gp = subject.fa4_gp;
    }
    
    // Calculate Final GPA (average of Mid Term GP and SA2 GP) with rounding
    if (subject.mid_term_gp !== undefined && subject.sa2_gp !== undefined) {
      subject.final_gpa = roundToNearest((subject.mid_term_gp + subject.sa2_gp) / 2);
    } else if (subject.mid_term_gp !== undefined) {
      subject.final_gpa = subject.mid_term_gp;
    } else if (subject.sa2_gp !== undefined) {
      subject.final_gpa = subject.sa2_gp;
    }
    
    // Convert final GPA to grade letter
    if (subject.final_gpa !== undefined) {
      subject.grade = convertGradePointToLetter(subject.final_gpa);
    }
    
    subjects.push(subject);
  }
  
  return subjects;
}

/**
 * Calculate Overall GPA from subject GPAs
 */
export function calculateOverallGPA(subjects: CBSESubjectData[]): { gpa: number; grade: string } {
  const validGPAs = subjects
    .map(s => s.final_gpa)
    .filter((gpa): gpa is number => gpa !== undefined);
  
  if (validGPAs.length === 0) {
    return { gpa: 0, grade: 'E' };
  }
  
  const averageGPA = validGPAs.reduce((sum, gpa) => sum + gpa, 0) / validGPAs.length;
  const roundedGPA = Math.round(averageGPA * 100) / 100; // Round to 2 decimal places
  
  return {
    gpa: roundedGPA,
    grade: convertGradePointToLetter(Math.round(averageGPA))
  };
}

/**
 * Calculate Cumulative GPA from Term1 and Term2 data
 */
export function calculateCumulativeGPA(term1Data: CBSETerm1Data, term2Data: CBSETerm2Data): CBSECumulativeData['subjects'] {
  const cumulativeSubjects: CBSESubjectData[] = [];
  
  // Combine subjects from both terms
  const allSubjects = new Set([
    ...term1Data.subjects.map(s => s.name),
    ...term2Data.subjects.map(s => s.name)
  ]);
  
  for (const subjectName of allSubjects) {
    const term1Subject = term1Data.subjects.find(s => s.name === subjectName);
    const term2Subject = term2Data.subjects.find(s => s.name === subjectName);
    
    const cumulativeSubject: CBSESubjectData = {
      name: subjectName,
      // Copy all term data
      ...term1Subject,
      ...term2Subject
    };
    
    // Calculate final cumulative GPA
    const term1GPA = term1Subject?.final_gpa || 0;
    const term2GPA = term2Subject?.final_gpa || 0;
    
    if (term1GPA > 0 && term2GPA > 0) {
      cumulativeSubject.final_gpa = roundToNearest((term1GPA + term2GPA) / 2);
    } else if (term1GPA > 0) {
      cumulativeSubject.final_gpa = term1GPA;
    } else if (term2GPA > 0) {
      cumulativeSubject.final_gpa = term2GPA;
    }
    
    if (cumulativeSubject.final_gpa !== undefined) {
      cumulativeSubject.grade = convertGradePointToLetter(cumulativeSubject.final_gpa);
    }
    
    cumulativeSubjects.push(cumulativeSubject);
  }
  
  return cumulativeSubjects;
}

/**
 * Determine promotion status based on overall GPA
 */
export function determinePromotionStatus(overallGPA: number): 'PROMOTED' | 'DETAINED' | 'COMPARTMENT' {
  if (overallGPA >= 4) return 'PROMOTED';
  if (overallGPA >= 3) return 'COMPARTMENT';
  return 'DETAINED';
}

 