import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Types
export interface Child {
  id: string;
  full_name: string;
  admission_no?: string;
  gender?: string;
  section_id: string;
  sections?: {
    grade: string;
    section: string;
    school_id: string;
  };
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  student_id: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  section: string;
  school_id: string;
  homework_submissions?: any[];
}

export interface Period {
  id: string;
  weekday: number;
  period_no: number;
  subject: string;
  start_time?: string;
  end_time?: string;
  is_break?: boolean;
  venue?: string;
  teacher?: {
    first_name: string;
    last_name: string;
  };
}

export interface ExamGroup {
  id: string;
  name: string;
  description?: string;
  exam_type: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
}

export interface ExamPaper {
  id: string;
  subject: string;
  exam_date: string;
  exam_time: string;
  duration_minutes: number;
  max_marks: number;
  section: string;
  exam_groups?: ExamGroup;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  target_audience: string;
  published_at: string;
  created_at: string;
}

export interface DashboardStats {
  childrenCount: number;
  upcomingHomework: number;
  attendancePercentage: number;
  recentAnnouncements: number;
}

// Get children for a parent
export const useChildren = (parentId?: string) => {
  return useQuery({
    queryKey: ['children', parentId],
    queryFn: async (): Promise<Child[]> => {
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
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Child[];
    },
    enabled: !!parentId,
  });
};

// Get parent dashboard stats
export const useParentDashboardStats = (parentId?: string) => {
  return useQuery({
    queryKey: ['parent-dashboard-stats', parentId],
    queryFn: async (): Promise<DashboardStats | null> => {
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
      const thisMonth = new Date();
      const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('status')
        .in('student_id', studentIds)
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      const totalRecords = attendanceData?.length || 0;
      const presentRecords = attendanceData?.filter(record => record.status === 'present').length || 0;
      const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

      return {
        childrenCount: children.length,
        upcomingHomework: upcomingHomework?.length || 0,
        attendancePercentage,
        recentAnnouncements: 5, // Mock data
      };
    },
    enabled: !!parentId,
  });
};

// Get child's attendance records
export const useChildAttendance = (studentId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['child-attendance', studentId, startDate, endDate],
    queryFn: async (): Promise<AttendanceRecord[]> => {
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
    queryFn: async (): Promise<Homework[]> => {
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
      })) as Homework[];
    },
    enabled: !!studentId,
  });
};

// Get child's timetable
export const useChildTimetable = (studentId?: string) => {
  return useQuery({
    queryKey: ['child-timetable', studentId],
    queryFn: async (): Promise<Period[]> => {
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
      
      return data.map((period: any) => ({
        ...period,
        teacher: period.teacher ? {
          first_name: period.teacher.first_name,
          last_name: period.teacher.last_name
        } : null
      })) as Period[];
    },
    enabled: !!studentId,
  });
};

// Get exam groups for child's school
export const useChildExamGroups = (studentId?: string) => {
  return useQuery({
    queryKey: ['child-exam-groups', studentId],
    queryFn: async (): Promise<ExamGroup[]> => {
      if (!studentId) return [];

      // Get student's school through section
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          sections!inner(
            school_id
          )
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Get all exam groups for the school
      const { data, error } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('school_id', student.sections.school_id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
};

// Get exam papers for child's section
export const useChildExams = (studentId?: string) => {
  return useQuery({
    queryKey: ['child-exams', studentId],
    queryFn: async (): Promise<ExamPaper[]> => {
      if (!studentId) return [];

      // Get student's section to find exam papers
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

      // Construct section format to match exam papers (e.g., "Grade 1 A")
      const examSection = `Grade ${student.sections.grade} ${student.sections.section}`;

      // Get all exam papers for the section
      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups!inner(
            id,
            name,
            exam_type,
            start_date,
            end_date,
            is_published
          )
        `)
        .eq('section', examSection)
        .eq('school_id', student.sections.school_id)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
};

// Get announcements for parent
export const useAnnouncements = (schoolId?: string) => {
  return useQuery({
    queryKey: ['announcements', schoolId],
    queryFn: async (): Promise<Announcement[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .in('target_audience', ['parents', 'all'])
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
}; 

// Community Posts hook
export const useCommunityPosts = (schoolId?: string) => {
  return useQuery({
    queryKey: ['community-posts', schoolId],
    queryFn: async (): Promise<any[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          likes_count:community_post_likes(count),
          comments_count:community_post_comments(count),
          user_liked:community_post_likes!inner(user_id)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching community posts:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!schoolId,
  });
}; 