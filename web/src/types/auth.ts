export type UserRole = "super_admin" | "school_admin" | "teacher" | "parent" | "student";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  school_id: string | null;
  created_at: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  employee_id?: string;
  subjects?: string[];
  relation?: string;
  avatar_url?: string;
} 