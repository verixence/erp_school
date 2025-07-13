// Shared types for API layer
export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'school_admin' | 'teacher' | 'parent';
  school_id?: string;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  domain: string | null;
  enabled_features: Record<string, boolean>;
  status: string;
  created_at: string;
}

export interface Section {
  id: string;
  grade: string;
  section: string;
  subject?: string;
  teacher_id?: string;
  class_teacher?: string; // Teacher ID who is the class teacher
  capacity?: number;
  school_id: string;
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
  gender: string;
  date_of_birth: string;
  student_email?: string;
  student_phone?: string;
  parent_id?: string;
  school_id: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subjects: string[];
  qualification?: string;
  experience_years?: number;
  school_id: string;
  created_at: string;
}

export interface Timetable {
  id: string;
  school_id: string;
  section: string;
  weekday: number; // 1-7 (Monday-Sunday)
  period_no: number;
  subject: string;
  teacher_id: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface Homework {
  id: string;
  school_id: string;
  section: string;
  subject: string;
  title: string;
  description?: string;
  due_date: string;
  file_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  content: string;
  target_audience: 'students' | 'parents' | 'teachers' | 'all';
  sections?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  published_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  school_id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  recorded_by?: string;
  notes?: string;
  // Enhanced fields for period-wise attendance
  period_id?: string;
  period_number?: number;
  subject?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSettings {
  id: string;
  school_id: string;
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  notification_delay_minutes: number;
  auto_mark_present: boolean;
  grace_period_minutes: number;
  weekend_attendance: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceNotification {
  id: string;
  school_id: string;
  student_id: string;
  parent_id: string;
  attendance_record_id: string;
  notification_type: 'absent' | 'late' | 'excused';
  message: string;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EnhancedAttendanceStats {
  total_students: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
  daily_averages: Array<{
    date: string;
    total: number;
    present: number;
    rate: number;
  }>;
  by_grade: Array<{
    grade: string;
    total: number;
    present: number;
    rate: number;
  }>;
}

export interface StudentAttendancePercentage {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_percentage: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Query parameters
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User | null;
  isLoading: boolean;
  error: string | null;
} 