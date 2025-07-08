import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Hook to get teacher's assigned sections
export const useTeacherSections = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-sections', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id
          )
        `)
        .eq('teacher_id', teacherId);

      if (error) throw error;
      
      return data?.map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        school_id: item.sections.school_id
      })) || [];
    },
    enabled: !!teacherId,
  });
};

// Hook to get students in a section
export const useSectionStudents = (sectionId?: string) => {
  return useQuery({
    queryKey: ['section-students', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('section_id', sectionId)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!sectionId,
  });
};

// Hook to get teacher's timetable
export const useTeacherTimetable = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-timetable', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          sections!inner(
            grade,
            section
          )
        `)
        .eq('teacher_id', teacherId)
        .order('weekday')
        .order('period_no');

      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });
};

// Hook to get homework assignments
export const useHomework = (teacherId?: string) => {
  return useQuery({
    queryKey: ['homework', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('homeworks')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });
};

// Hook to create homework
export const useCreateHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (homeworkData: any) => {
      const { data, error } = await supabase
        .from('homeworks')
        .insert(homeworkData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
    },
  });
};

// Hook to save attendance
export const useSaveAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceData: any) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(attendanceData, {
          onConflict: 'student_id,date'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

// Hook to get attendance records
export const useAttendanceRecords = (sectionId?: string, date?: string) => {
  return useQuery({
    queryKey: ['attendance', sectionId, date],
    queryFn: async () => {
      if (!sectionId || !date) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students!inner(
            full_name,
            admission_no
          )
        `)
        .eq('students.section_id', sectionId)
        .eq('date', date);

      if (error) throw error;
      return data || [];
    },
    enabled: !!sectionId && !!date,
  });
};

// Hook to get announcements
export const useAnnouncements = (schoolId?: string) => {
  return useQuery({
    queryKey: ['announcements', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
};

// Hook to create announcement
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementData: any) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert(announcementData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

// Hook to get exam papers
export const useExamPapers = (teacherId?: string) => {
  return useQuery({
    queryKey: ['exam-papers', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups(
            name,
            exam_type,
            start_date,
            end_date,
            is_published
          )
        `)
        .eq('teacher_id', teacherId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });
};

// Hook to get teacher dashboard stats
export const useTeacherDashboardStats = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-dashboard-stats', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;

      // Get sections count
      const { data: sections } = await supabase
        .from('section_teachers')
        .select('sections!inner(id)')
        .eq('teacher_id', teacherId);

      // Get total students across all sections
      const sectionIds = sections?.map((s: any) => s.sections.id) || [];
      const { data: students } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .in('section_id', sectionIds);

      // Get today's classes
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const weekdayNum = today === 0 ? 7 : today;
      
      const { data: todaysClasses } = await supabase
        .from('periods')
        .select('id', { count: 'exact' })
        .eq('teacher_id', teacherId)
        .eq('weekday', weekdayNum);

      // Get pending homework
      const { data: pendingHomework } = await supabase
        .from('homeworks')
        .select('id', { count: 'exact' })
        .eq('teacher_id', teacherId)
        .gte('due_date', new Date().toISOString());

      return {
        sectionsCount: sections?.length || 0,
        studentsCount: students?.length || 0,
        todaysClasses: todaysClasses?.length || 0,
        pendingHomework: pendingHomework?.length || 0,
      };
    },
    enabled: !!teacherId,
  });
}; 