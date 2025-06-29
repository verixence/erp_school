import { supabase, withErrorHandling } from './supabase'
import type { Database } from '../../../common/src/api/database.types'

type Tables = Database['public']['Tables']
type User = Tables['users']['Row']
type Teacher = Tables['teachers']['Row']
type Section = Tables['sections']['Row']
type Student = Tables['students']['Row']
type AttendanceRecord = Tables['attendance_records']['Row']
type Homework = Tables['homeworks']['Row']
type Timetable = Tables['timetables']['Row']

// Auth helpers
export const getCurrentUser = async (): Promise<{ data: User | null; error: string | null }> => {
  return withErrorHandling(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return { data: null, error: null }
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    return { data, error }
  })
}

export const getTeacherProfile = async (userId: string): Promise<{ data: Teacher | null; error: string | null }> => {
  if (!userId) {
    return { data: null, error: 'User ID is required' }
  }
  
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', userId)
      .single()

    return { data, error }
  })
}

// Section helpers
export const getTeacherSections = async (teacherId: string): Promise<{ data: Section[] | null; error: string | null }> => {
  if (!teacherId) {
    return { data: [], error: null }
  }
  
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('section_teachers')
      .select(`
        sections!inner(
          id,
          grade,
          section,
          subject,
          school_id,
          created_at,
          updated_at
        )
      `)
      .eq('teacher_id', teacherId)

    if (error) return { data: null, error }

    // Transform the data to match Section interface
    const sections = data?.map((item: any) => ({
      id: item.sections.id,
      grade: item.sections.grade,
      section: item.sections.section,
      subject: item.sections.subject,
      teacher_id: teacherId,
      capacity: null,
      school_id: item.sections.school_id,
      created_at: item.sections.created_at,
      updated_at: item.sections.updated_at,
    })) || []

    return { data: sections, error: null }
  })
}

export const getSectionStudents = async (
  schoolId: string,
  grade: string,
  section: string
): Promise<{ data: Student[] | null; error: string | null }> => {
  if (!schoolId || !grade || !section) {
    return { data: [], error: null }
  }
  
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .eq('grade', grade)
      .eq('section', section)
      .order('full_name')

    return { data, error }
  })
}

// Attendance helpers
export const getAttendanceRecords = async (
  schoolId: string,
  date: string,
  studentIds: string[]
): Promise<{ data: AttendanceRecord[] | null; error: string | null }> => {
  if (!schoolId || !date || studentIds.length === 0) {
    return { data: [], error: null }
  }
  
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('school_id', schoolId)
      .eq('date', date)
      .in('student_id', studentIds)

    return { data, error }
  })
}

export const saveAttendanceRecords = async (
  records: Array<{
    school_id: string
    student_id: string
    date: string
    status: 'present' | 'absent' | 'late' | 'excused'
    recorded_by: string
    notes?: string | null
  }>
): Promise<{ data: AttendanceRecord[] | null; error: string | null }> => {
  if (records.length === 0) {
    return { data: [], error: null }
  }
  
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(records, {
        onConflict: 'student_id,date',
        ignoreDuplicates: false
      })
      .select()

    return { data, error }
  })
}

// Homework helpers
export const getTeacherHomework = async (
  teacherId: string,
  limit: number = 10
): Promise<{ data: Homework[] | null; error: string | null }> => {
  if (!teacherId) {
    return { data: [], error: null }
  }
  
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('homeworks')
      .select('*')
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  })
}

export const createHomework = async (
  homework: Tables['homeworks']['Insert']
): Promise<{ data: Homework | null; error: string | null }> => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('homeworks')
      .insert(homework)
      .select()
      .single()

    return { data, error }
  })
}

// Timetable helpers
export const getTeacherTimetable = async (
  teacherId: string,
  weekday?: number
): Promise<{ data: Timetable[] | null; error: string | null }> => {
  if (!teacherId) {
    return { data: [], error: null }
  }
  
  return withErrorHandling(async () => {
    let query = supabase
      .from('timetables')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('weekday')
      .order('period_no')

    if (weekday !== undefined) {
      query = query.eq('weekday', weekday)
    }

    const { data, error } = await query

    return { data, error }
  })
}

// Dashboard stats
export const getTeacherDashboardStats = async (teacherId: string): Promise<{
  data: {
    todaysClasses: number
    pendingHomework: number
    sectionsCount: number
    recentAnnouncements: number
  } | null
  error: string | null
}> => {
  if (!teacherId) {
    return {
      data: {
        todaysClasses: 0,
        pendingHomework: 0,
        sectionsCount: 0,
        recentAnnouncements: 0,
      },
      error: null
    }
  }
  
  return withErrorHandling(async () => {
    const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
    const convertedDay = today === 0 ? 7 : today // Convert Sunday from 0 to 7

    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const [
      { count: todaysClasses },
      { count: pendingHomework },
      { count: sectionsCount },
      { count: recentAnnouncements }
    ] = await Promise.all([
      supabase
        .from('timetables')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherId)
        .eq('weekday', convertedDay),
      
      supabase
        .from('homeworks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', teacherId)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0]),
      
      supabase
        .from('section_teachers')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherId),
      
      supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', teacherId)
        .eq('is_published', true)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ])

    return {
      data: {
        todaysClasses: todaysClasses || 0,
        pendingHomework: pendingHomework || 0,
        sectionsCount: sectionsCount || 0,
        recentAnnouncements: recentAnnouncements || 0,
      },
      error: null
    }
  })
} 