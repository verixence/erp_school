import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase, withErrorHandling } from './supabase';
import type {
  User,
  Section,
  Student,
  Teacher,
  Timetable,
  Homework,
  Announcement,
  AttendanceRecord,
  QueryOptions,
  ApiResponse
} from './types';

// Auth hooks
export const useAuth = () => {
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { user: null, isAuthenticated: false };
      }

      // Get user details from our users table
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        user: userData as User,
        isAuthenticated: true,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

// Teacher-specific hooks
export const useTeacherSections = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-sections', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      // Get sections via section_teachers junction table
      const { data, error } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id,
            class_teacher,
            created_at
          )
        `)
        .eq('teacher_id', teacherId);

      if (error) throw error;
      
      // Transform the data to match the expected Section interface
      const sectionsData = data?.map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        school_id: item.sections.school_id,
        class_teacher: item.sections.class_teacher,
        created_at: item.sections.created_at
      })) || [];

      return sectionsData as Section[];
    },
    enabled: !!teacherId,
  });
};

export const useTeacherTimetable = (teacherId?: string, options?: QueryOptions) => {
  return useQuery({
    queryKey: ['teacher-timetable', teacherId, options],
    queryFn: async () => {
      if (!teacherId) return [];

      let query = supabase
        .from('timetables')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('weekday', { ascending: true })
        .order('period_no', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as Timetable[];
    },
    enabled: !!teacherId,
  });
};

export const useHomework = (teacherId?: string, options?: QueryOptions) => {
  return useQuery({
    queryKey: ['homework', teacherId, options],
    queryFn: async () => {
      if (!teacherId) return [];

      let query = supabase
        .from('homeworks')
        .select('*')
        .eq('created_by', teacherId)
        .order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as Homework[];
    },
    enabled: !!teacherId,
  });
};

export const useCreateHomework = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (homework: Omit<Homework, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('homeworks')
        .insert(homework)
        .select()
        .single();

      if (error) throw error;
      return data as Homework;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
    },
  });
};

export const useAnnouncements = (schoolId?: string, options?: QueryOptions) => {
  return useQuery({
    queryKey: ['announcements', schoolId, options],
    queryFn: async () => {
      if (!schoolId) return [];

      let query = supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert(announcement)
        .select()
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

// Students and attendance
export const useSectionStudents = (grade?: string, section?: string, schoolId?: string) => {
  return useQuery({
    queryKey: ['section-students', grade, section, schoolId],
    queryFn: async () => {
      if (!grade || !section || !schoolId) return [];

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('grade', grade)
        .eq('section', section)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Student[];
    },
    enabled: !!grade && !!section && !!schoolId,
  });
};

export const useAttendanceRecords = (date: string, studentIds: string[]) => {
  return useQuery({
    queryKey: ['attendance-records', date, studentIds],
    queryFn: async () => {
      if (!date || !studentIds.length) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', date)
        .in('student_id', studentIds);

      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!date && studentIds.length > 0,
  });
};

export const useSaveAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (records: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(records, {
          onConflict: 'student_id,date',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;
      return data as AttendanceRecord[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    },
  });
};

// Dashboard stats
export const useTeacherDashboardStats = (teacherId?: string, schoolId?: string) => {
  return useQuery({
    queryKey: ['teacher-dashboard-stats', teacherId, schoolId],
    queryFn: async () => {
      if (!teacherId || !schoolId) return null;

      // Get today's classes count
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const { data: todaysClasses } = await supabase
        .from('timetables')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherId)
        .eq('weekday', today === 0 ? 7 : today); // Convert Sunday from 0 to 7

      // Get pending homework count (due in next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data: pendingHomework } = await supabase
        .from('homeworks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', teacherId)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0]);

      // Get sections count
      const { data: sectionsCount } = await supabase
        .from('section_teachers')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherId);

      return {
        todaysClasses: todaysClasses || 0,
        pendingHomework: pendingHomework || 0,
        sectionsCount: sectionsCount || 0,
      };
    },
    enabled: !!teacherId && !!schoolId,
  });
}; 