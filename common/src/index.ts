// User roles
export type UserRole = "super_admin" | "school_admin" | "teacher" | "parent" | "student";

// Feature flags
export const featureKeys = [
  "core",
  "attend", 
  "exam",
  "fee",
  "hw",
  "announce",
  "chat",
  "lib",
  "transport"
] as const;

export type FeatureKey = typeof featureKeys[number];

// Database types
export interface School {
  id: string;
  name: string;
  domain: string | null;
  enabled_features: Record<FeatureKey, boolean>;
  custom_modules: string[];
  status: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  school_id: string | null;
  created_at: string;
}

// Student interface moved to api/types.ts

export interface Class {
  id: string;
  school_id: string;
  name: string;
  created_at: string;
}

// Feature metadata for UI
export const featureLabels: Record<FeatureKey, string> = {
  core: "Core Management",
  attend: "Attendance",
  exam: "Examinations", 
  fee: "Fee Management",
  hw: "Homework",
  announce: "Announcements",
  chat: "Communication",
  lib: "Library",
  transport: "Transportation"
};

export const featureDescriptions: Record<FeatureKey, string> = {
  core: "Basic school management features",
  attend: "Student attendance tracking",
  exam: "Exam scheduling and results",
  fee: "Fee collection and management", 
  hw: "Homework assignment and tracking",
  announce: "School announcements and notices",
  chat: "Internal messaging system",
  lib: "Library book management",
  transport: "School bus and transport management"
};

// Export API functionality
export * from './api'; 