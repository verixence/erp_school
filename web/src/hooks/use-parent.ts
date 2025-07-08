'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

// Parent API hooks using the web app's React Query instance

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
      return data as any[];
    },
    enabled: !!parentId,
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
        recentAnnouncements: 0, // TODO: Implement announcements count
      };
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
      return data as any[];
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
        .select(`
          *,
          homework_submissions(
            id,
            submitted_at,
            status,
            file_url,
            notes,
            submission_type,
            student_id
          )
        `)
        .eq('section', homeworkSection)
        .eq('school_id', student.sections.school_id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      // Filter submissions for this specific student
      return data.map(hw => ({
        ...hw,
        homework_submissions: (hw.homework_submissions || []).filter(
          (sub: any) => sub && sub.student_id === studentId
        )
      })) as any[];
    },
    enabled: !!studentId,
  });
};

// Get exam groups for child's school (only published ones for parents)
export const useChildExamGroups = (studentId?: string) => {
  return useQuery({
    queryKey: ['child-exam-groups', studentId],
    queryFn: async () => {
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

      // Get only published exam groups for the school (parents should only see published ones)
      const { data, error } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('school_id', student.sections.school_id)
        .eq('is_published', true)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
};

// Get exam papers for child's section (all papers, not just published)
export const useChildExams = (studentId?: string) => {
  return useQuery({
    queryKey: ['child-exams', studentId],
    queryFn: async () => {
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

      // Get all exam papers for the section with exam group info
      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups(
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

      if (error) {
        console.error('Error fetching exams:', error);
        throw error;
      }
      
      // Filter for published exams only (parents should only see published ones)
      const publishedExams = data?.filter(exam => 
        exam.exam_groups && exam.exam_groups.is_published === true
      ) || [];
      
      return publishedExams;
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
      })) as any[];
    },
    enabled: !!studentId,
  });
};

// Submit homework on behalf of child
export const useSubmitHomeworkForChild = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      homeworkId, 
      studentId, 
      fileUrl, 
      notes, 
      submissionType = 'online' 
    }: {
      homeworkId: string;
      studentId: string;
      fileUrl?: string;
      notes?: string;
      submissionType?: 'online' | 'offline';
    }) => {
      // Get student's school_id first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('sections!inner(school_id)')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      if (!student?.sections) throw new Error('Student section not found');

      const schoolId = (student.sections as any).school_id;
      if (!schoolId) throw new Error('School ID not found');

      // Create submission record
      const { data, error } = await supabase
        .from('homework_submissions')
        .upsert({
          homework_id: homeworkId,
          student_id: studentId,
          school_id: schoolId,
          file_url: submissionType === 'online' ? fileUrl : null,
          notes: notes || (submissionType === 'offline' ? 'Submitted offline by parent' : ''),
          status: 'submitted',
          submission_type: submissionType,
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
      queryClient.invalidateQueries({ queryKey: ['child-homework'] });
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard-stats'] });
    },
  });
};

// Media upload for homework submissions
export const useUploadHomeworkFile = () => {
  return useMutation({
    mutationFn: async ({ file, schoolId }: { file: File; schoolId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `homework-submissions/${schoolId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return {
        url: publicData.publicUrl,
        name: file.name,
        size: file.size
      };
    },
  });
};

// Get announcements for parent (school-wide and parent-specific)
export const useParentAnnouncements = (parentId?: string) => {
  return useQuery({
    queryKey: ['parent-announcements', parentId],
    queryFn: async () => {
      if (!parentId) return [];

      // Get parent's school through children
      const { data: studentParents, error: spError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId)
        .limit(1);

      if (spError) throw spError;
      if (!studentParents || studentParents.length === 0) return [];

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          sections!inner(
            school_id
          )
        `)
        .eq('id', studentParents[0].student_id)
        .single();

      if (studentError) throw studentError;
      if (!student?.sections) throw new Error('Student section not found');

      // Extract school_id from the joined data
      const schoolId = (student.sections as any)[0]?.school_id || (student.sections as any).school_id;
      if (!schoolId) throw new Error('School ID not found');

      // Get announcements that are:
      // 1. Published
      // 2. For this school
      // 3. Target audience is 'all', 'parents', or null
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_published', true)
        .in('target_audience', ['all', 'parents'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!parentId,
  });
}; 