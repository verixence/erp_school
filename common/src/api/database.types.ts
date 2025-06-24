// Auto-generated types for Supabase database
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      announcements: {
        Row: {
          id: string
          school_id: string
          title: string
          content: string
          target_audience: 'students' | 'parents' | 'teachers' | 'all'
          sections: string[] | null
          priority: 'low' | 'normal' | 'high' | 'urgent'
          is_published: boolean
          published_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          content: string
          target_audience: 'students' | 'parents' | 'teachers' | 'all'
          sections?: string[] | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          is_published?: boolean
          published_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          content?: string
          target_audience?: 'students' | 'parents' | 'teachers' | 'all'
          sections?: string[] | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          is_published?: boolean
          published_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          school_id: string
          student_id: string
          date: string
          status: 'present' | 'absent' | 'late' | 'excused'
          recorded_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          student_id: string
          date: string
          status: 'present' | 'absent' | 'late' | 'excused'
          recorded_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          student_id?: string
          date?: string
          status?: 'present' | 'absent' | 'late' | 'excused'
          recorded_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      homeworks: {
        Row: {
          id: string
          school_id: string
          section: string
          subject: string
          title: string
          description: string | null
          due_date: string
          file_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          section: string
          subject: string
          title: string
          description?: string | null
          due_date: string
          file_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          section?: string
          subject?: string
          title?: string
          description?: string | null
          due_date?: string
          file_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          domain: string | null
          enabled_features: Json
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          enabled_features?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          enabled_features?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      sections: {
        Row: {
          id: string
          grade: string
          section: string
          subject: string | null
          teacher_id: string | null
          capacity: number | null
          school_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          grade: string
          section: string
          subject?: string | null
          teacher_id?: string | null
          capacity?: number | null
          school_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          grade?: string
          section?: string
          subject?: string | null
          teacher_id?: string | null
          capacity?: number | null
          school_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          full_name: string
          admission_no: string
          grade: string
          section: string
          gender: string
          date_of_birth: string
          student_email: string | null
          student_phone: string | null
          parent_id: string | null
          school_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          admission_no: string
          grade: string
          section: string
          gender: string
          date_of_birth: string
          student_email?: string | null
          student_phone?: string | null
          parent_id?: string | null
          school_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          admission_no?: string
          grade?: string
          section?: string
          gender?: string
          date_of_birth?: string
          student_email?: string | null
          student_phone?: string | null
          parent_id?: string | null
          school_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          user_id: string
          employee_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          subjects: string[]
          qualification: string | null
          experience_years: number | null
          school_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          employee_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          subjects: string[]
          qualification?: string | null
          experience_years?: number | null
          school_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          employee_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          subjects?: string[]
          qualification?: string | null
          experience_years?: number | null
          school_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      timetables: {
        Row: {
          id: string
          school_id: string
          section: string
          weekday: number
          period_no: number
          subject: string
          teacher_id: string
          start_time: string | null
          end_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          section: string
          weekday: number
          period_no: number
          subject: string
          teacher_id: string
          start_time?: string | null
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          section?: string
          weekday?: number
          period_no?: number
          subject?: string
          teacher_id?: string
          start_time?: string | null
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          role: 'super_admin' | 'school_admin' | 'teacher' | 'parent'
          school_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'super_admin' | 'school_admin' | 'teacher' | 'parent'
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'super_admin' | 'school_admin' | 'teacher' | 'parent'
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attendance_pivot: {
        Args: {
          start_date: string
          end_date: string
          school_id_param: string
        }
        Returns: {
          student_id: string
          student_name: string
          admission_no: string
          grade: string
          section: string
          attendance_data: Json
        }[]
      }
      get_attendance_stats: {
        Args: {
          start_date: string
          end_date: string
          school_id_param: string
        }
        Returns: {
          total_students: number
          total_records: number
          present_count: number
          absent_count: number
          late_count: number
          excused_count: number
          attendance_rate: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 