export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'teacher' | 'parent';
  school_id: string;
  avatar_url?: string;
  phone?: string;
}

export interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  section_id: string;
  gender?: string;
  sections?: {
    id: string;
    grade: string;
    section: string;
  };
}

export interface TeacherSection {
  id: string;
  grade: string;
  section: string;
  class_teacher?: string;
  subject?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  assigned_date: string;
  due_date: string;
  section_id: string;
  teacher_id: string;
  attachments?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  target_audience: 'all' | 'teachers' | 'parents' | 'students';
  is_urgent: boolean;
}

export interface ExamGroup {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
  school_id: string;
}

export interface ExamPaper {
  id: string;
  exam_group_id: string;
  subject: string;
  date: string;
  start_time: string;
  duration: number;
  total_marks: number;
  section_id: string;
}

export interface Mark {
  id: string;
  student_id: string;
  exam_paper_id: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
}

export interface TimetableEntry {
  id: string;
  day_of_week: number;
  period_number: number;
  subject: string;
  teacher_id?: string;
  section_id: string;
  start_time: string;
  end_time: string;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface DashboardStats {
  totalStudents?: number;
  assignedSections?: number;
  completedExams?: number;
  pendingReports?: number;
  childrenCount?: number;
  upcomingHomework?: number;
  attendancePercentage?: number;
} 