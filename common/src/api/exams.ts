import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export type ExamType = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'unit_test' | 'other';

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
      return result as ExamGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exam-groups', data.school_id] });
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
          student:students(id, full_name, admission_no)
        `)
        .eq('exam_paper_id', examPaperId!)
        .order('student(full_name)', { ascending: true });
      
      if (error) throw error;
      return data as Mark[];
    },
    enabled: !!examPaperId,
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

      const updates = marks.map(mark => ({
        id: mark.id,
        marks_obtained: mark.marks_obtained,
        is_absent: mark.is_absent,
        remarks: mark.remarks,
        entered_by: user.user.id,
      }));

      const { data, error } = await supabase
        .from('marks')
        .upsert(updates)
        .select();
      
      if (error) throw error;
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
  template_id: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
  rank: number;
  status: 'draft' | 'published' | 'distributed';
  generated_at: string;
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
        template_id: 'default', // Use default template for now
        status: 'draft' as const,
      }));

      const { data, error } = await supabase
        .from('report_cards')
        .upsert(reportCards, { onConflict: 'student_id,exam_group_id' })
        .select();
      
      if (error) throw error;
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