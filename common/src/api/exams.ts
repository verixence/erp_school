import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export type ExamType = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'unit_test' | 'other';

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
  created_by?: string;
  created_at: string;
  updated_at: string;
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
        .select('*')
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
        .from('marks')
        .select(`
          *,
          exam_paper:exam_papers(
            id,
            subject,
            max_marks,
            pass_marks
          )
        `)
        .eq('student_id', studentId)
        .eq('exam_paper.exam_group_id', examGroupId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!examGroupId,
  });
}; 