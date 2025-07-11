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
          media_urls: string[] | null
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
          media_urls?: string[] | null
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
          media_urls?: string[] | null
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
      report_templates: {
        Row: {
          id: string
          school_id: string | null
          name: string
          board: string
          class_range: string
          grade_rules: Json
          i18n_bundle: Json
          template_html: string
          template_css: string
          meta: Json | null
          is_default: boolean
          created_at: string
          updated_at: string
          is_public: boolean
          created_by: string | null
          editable_by_school: boolean
          origin_template_id: string | null
          preview_image_url: string | null
          usage_count: number
          last_used_at: string | null
        }
        Insert: {
          id?: string
          school_id?: string | null
          name: string
          board: string
          class_range: string
          grade_rules: Json
          i18n_bundle: Json
          template_html: string
          template_css: string
          meta?: Json | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
          is_public?: boolean
          created_by?: string | null
          editable_by_school?: boolean
          origin_template_id?: string | null
          preview_image_url?: string | null
          usage_count?: number
          last_used_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string | null
          name?: string
          board?: string
          class_range?: string
          grade_rules?: Json
          i18n_bundle?: Json
          template_html?: string
          template_css?: string
          meta?: Json | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
          is_public?: boolean
          created_by?: string | null
          editable_by_school?: boolean
          origin_template_id?: string | null
          preview_image_url?: string | null
          usage_count?: number
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_origin_template_id_fkey"
            columns: ["origin_template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
      template_categories: {
        Row: {
          id: string
          name: string
          description: string
          board: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          board: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          board?: string
          created_at?: string
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
