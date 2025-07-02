import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Student, AttendanceRecord, Homework, Timetable, Announcement } from './types';

// Get children for a parent
export const useChildren = (parentId?: string) => {
  return useQuery({
    queryKey: ['children', parentId],
    queryFn: async () => {
      if (!parentId) return [];

      // First get the student IDs for this parent
      const { data: studentParents, error: spError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId);

      if (spError) throw spError;
      if (!studentParents || studentParents.length === 0) return [];

      const studentIds = studentParents.map(sp => sp.student_id);

      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          sections!inner(
            grade,
            section,
            school_id
          )
        `)
        .in('id', studentIds)
        .order('grade', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as (Student & { sections: { grade: number; section: string; school_id: string } })[];
    },
    enabled: !!parentId,
  });
};

// Get child's attendance records
export const useChildAttendance = (studentId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['child-attendance', studentId, startDate, endDate],
    queryFn: async () => {
      if (!studentId) return [];

      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!studentId,
  });
};

// Get child's homework assignments
export const useChildHomework = (studentId?: string) => {
  return useQuery({
    queryKey: ['child-homework', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Get student's section to find homework assignments
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          sections!inner(
            grade,
            section,
            school_id
          )
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Construct section format to match homework table (e.g., "1 A")
      const homeworkSection = `${student.sections.grade} ${student.sections.section}`;

      const { data, error } = await supabase
        .from('homeworks')
        .select('*')
        .eq('section', homeworkSection)
        .eq('school_id', student.sections.school_id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      // Return homework without submissions since homework_submissions table doesn't exist
      return data.map(hw => ({
        ...hw,
        homework_submissions: [] // Empty array since table doesn't exist
      })) as (Homework & { homework_submissions: any[] })[];
    },
    enabled: !!studentId,
  });
};

// Get child's timetable
export const useChildTimetable = (studentId?: string) => {
  return useQuery({
    queryKey: ['child-timetable', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Get student's section to find timetable
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('section_id')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          teacher:users!periods_teacher_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('section_id', student.section_id)
        .order('weekday', { ascending: true })
        .order('period_no', { ascending: true });

      if (error) throw error;
      
      // Transform data to match expected format
      return data.map((period: any) => ({
        ...period,
        teachers: period.teacher ? {
          first_name: period.teacher.first_name,
          last_name: period.teacher.last_name
        } : null
      })) as (Timetable & { teachers: { first_name: string; last_name: string } })[];
    },
    enabled: !!studentId,
  });
};

// Get parent dashboard stats
export const useParentDashboardStats = (parentId?: string) => {
  return useQuery({
    queryKey: ['parent-dashboard-stats', parentId],
    queryFn: async () => {
      if (!parentId) return null;

      // First get the student IDs for this parent
      const { data: studentParents, error: spError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId);

      if (spError) throw spError;
      if (!studentParents || studentParents.length === 0) {
        return {
          childrenCount: 0,
          upcomingHomework: 0,
          attendancePercentage: 0,
          recentAnnouncements: 0,
        };
      }

      const studentIds = studentParents.map(sp => sp.student_id);

      // Get children
      const { data: children } = await supabase
        .from('students')
        .select('id, full_name, section_id')
        .in('id', studentIds);

      if (!children || children.length === 0) {
        return {
          childrenCount: 0,
          upcomingHomework: 0,
          attendancePercentage: 0,
          recentAnnouncements: 0,
        };
      }

      const sectionIds = [...new Set(children.map(c => c.section_id))];

      // Get upcoming homework count (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data: upcomingHomework } = await supabase
        .from('homeworks')
        .select('*', { count: 'exact', head: true })
        .in('section_id', sectionIds)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0]);

      // Get attendance percentage for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      
      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('status')
        .in('student_id', studentIds)
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      const totalRecords = attendanceRecords?.length || 0;
      const presentRecords = attendanceRecords?.filter(r => r.status === 'present').length || 0;
      const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

      return {
        childrenCount: children.length,
        upcomingHomework: upcomingHomework || 0,
        attendancePercentage,
        recentAnnouncements: 0, // Will be implemented when announcements are added
      };
    },
    enabled: !!parentId,
  });
};

// Update last seen timestamp
export const useUpdateLastSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}; 