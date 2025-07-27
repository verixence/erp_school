import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Student, AttendanceRecord, Homework, Timetable, Announcement } from './types';

// Get student's own profile
export const useStudentProfile = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: async () => {
      if (!studentId) return null;

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
        .eq('id', studentId)
        .single();

      if (error) throw error;
      return data as Student & { sections: { grade: number; section: string; school_id: string } };
    },
    enabled: !!studentId,
  });
};

// Get student's own attendance records
export const useStudentAttendance = (studentId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['student-attendance', studentId, startDate, endDate],
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

// Get student's homework assignments
export const useStudentHomework = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-homework', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Get student's section to find homework assignments
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('section_id')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Get section details for homework query
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('grade, section, school_id')
        .eq('id', student.section_id)
        .single();

      if (sectionError) throw sectionError;

      // Construct section format to match homework table (e.g., "1 A")
      const homeworkSection = `${sectionData.grade} ${sectionData.section}`;

      const { data, error } = await supabase
        .from('homeworks')
        .select(`
          *,
          homework_submissions!left(
            id,
            submitted_at,
            status,
            file_url,
            notes
          )
        `)
        .eq('section', homeworkSection)
        .eq('school_id', sectionData.school_id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as (Homework & { homework_submissions: any[] })[];
    },
    enabled: !!studentId,
  });
};

// Get student's timetable
export const useStudentTimetable = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-timetable', studentId],
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

// Submit homework
export const useSubmitHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ homeworkId, studentId, fileUrl, notes }: {
      homeworkId: string;
      studentId: string;
      fileUrl?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('homework_submissions')
        .upsert({
          homework_id: homeworkId,
          student_id: studentId,
          file_url: fileUrl,
          notes,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        }, {
          onConflict: 'homework_id, student_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-homework'] });
    },
  });
};

// Get student dashboard stats
export const useStudentDashboardStats = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-dashboard-stats', studentId],
    queryFn: async () => {
      if (!studentId) return null;

      // Get today's classes count
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const weekdayNum = today === 0 ? 7 : today; // Convert Sunday from 0 to 7

      // Get student's section
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('section_id')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Get section details for homework query
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('grade, section, school_id')
        .eq('id', student.section_id)
        .single();

      if (sectionError) throw sectionError;

      const { data: todaysClasses } = await supabase
        .from('timetables')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', student.section_id)
        .eq('weekday', weekdayNum);

      // Get pending homework count (due in next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Construct section format to match homework table (e.g., "1 A")
      const homeworkSection = `${sectionData.grade} ${sectionData.section}`;
      
      const { data: pendingHomework } = await supabase
        .from('homeworks')
        .select('*', { count: 'exact', head: true })
        .eq('section', homeworkSection)
        .eq('school_id', sectionData.school_id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0]);

      // Get attendance percentage for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      
      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', studentId)
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      const totalRecords = attendanceRecords?.length || 0;
      const presentRecords = attendanceRecords?.filter(r => r.status === 'present').length || 0;
      const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

      return {
        todaysClasses: todaysClasses || 0,
        pendingHomework: pendingHomework || 0,
        attendancePercentage,
        recentAnnouncements: 0, // Will be implemented when announcements are added
      };
    },
    enabled: !!studentId,
  });
}; 