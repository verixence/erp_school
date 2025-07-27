import { supabase } from './supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface OnlineClass {
  id: string;
  school_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  subject?: string;
  meeting_link: string;
  meeting_password?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Related data
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  sections?: OnlineClassSection[];
  participants?: OnlineClassParticipant[];
}

export interface OnlineClassSection {
  id: string;
  online_class_id: string;
  section_id: string;
  created_at: string;
  // Related data
  section?: {
    id: string;
    grade: number;
    section: string;
  };
}

export interface OnlineClassParticipant {
  id: string;
  online_class_id: string;
  student_id: string;
  parent_id?: string;
  joined_at?: string;
  attendance_status: 'joined' | 'absent' | 'late';
  created_at: string;
  // Related data
  student?: {
    id: string;
    full_name: string;
    admission_no?: string;
    grade: string;
    section: string;
  };
  parent?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface OnlineClassNotification {
  id: string;
  online_class_id: string;
  recipient_id: string;
  recipient_type: 'teacher' | 'parent';
  notification_type: 'scheduled' | 'reminder_15min' | 'reminder_5min' | 'started' | 'cancelled';
  message: string;
  is_sent: boolean;
  sent_at?: string;
  scheduled_for?: string;
  created_at: string;
}

export interface CreateOnlineClassData {
  title: string;
  description?: string;
  subject?: string;
  meeting_link: string;
  meeting_password?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  section_ids: string[];
}

export interface UpdateOnlineClassData {
  title?: string;
  description?: string;
  subject?: string;
  meeting_link?: string;
  meeting_password?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

// Get online classes for a teacher
export const getTeacherOnlineClasses = async (teacherId: string): Promise<OnlineClass[]> => {
  const { data, error } = await supabase
    .from('online_classes')
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      sections:online_class_sections(
        id,
        section_id,
        created_at,
        section:sections(id, grade, section)
      )
    `)
    .eq('teacher_id', teacherId)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get online classes for a parent's students
export const getParentOnlineClasses = async (parentId: string): Promise<OnlineClass[]> => {
  const { data, error } = await supabase
    .from('online_class_participants')
    .select(`
      online_class:online_classes(
        *,
        teacher:users!teacher_id(id, first_name, last_name, email),
        sections:online_class_sections(
          id,
          section_id,
          created_at,
          section:sections(id, grade, section)
        )
      ),
      student:students(id, full_name, admission_no, grade, section)
    `)
    .eq('parent_id', parentId)
    .neq('online_class.status', 'cancelled');

  if (error) throw error;
  
  // Transform the data to return unique online classes with student information
  const classesMap = new Map<string, OnlineClass & { student_names: string[] }>();
  
  data?.forEach((participant: any) => {
    const onlineClass = participant.online_class;
    if (onlineClass) {
      const existingClass = classesMap.get(onlineClass.id);
      if (existingClass) {
        existingClass.student_names.push(participant.student?.full_name || 'Unknown');
      } else {
        classesMap.set(onlineClass.id, {
          ...onlineClass,
          student_names: [participant.student?.full_name || 'Unknown']
        });
      }
    }
  });
  
  return Array.from(classesMap.values()).sort((a, b) => {
    // Sort by scheduled_date first, then by start_time
    const dateCompare = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.start_time.localeCompare(b.start_time);
  });
};

// Get online class by ID
export const getOnlineClassById = async (classId: string): Promise<OnlineClass | null> => {
  const { data, error } = await supabase
    .from('online_classes')
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      sections:online_class_sections(
        id,
        section_id,
        created_at,
        section:sections(id, grade, section)
      ),
      participants:online_class_participants(
        id,
        student_id,
        parent_id,
        joined_at,
        attendance_status,
        created_at,
        student:students(id, full_name, admission_no, grade, section),
        parent:users!parent_id(id, first_name, last_name, email)
      )
    `)
    .eq('id', classId)
    .single();

  if (error) throw error;
  return data;
};

// Create a new online class
export const createOnlineClass = async (classData: CreateOnlineClassData): Promise<OnlineClass> => {
  const { section_ids, ...onlineClassData } = classData;
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // Get user details
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('school_id')
    .eq('id', user.id)
    .single();
    
  if (userError || !userData) throw new Error('User data not found');

  // Create the online class
  const { data: onlineClass, error: classError } = await supabase
    .from('online_classes')
    .insert({
      ...onlineClassData,
      teacher_id: user.id,
      school_id: userData.school_id
    })
    .select()
    .single();

  if (classError) throw classError;

  // Add sections to the online class
  if (section_ids.length > 0) {
    const sectionInserts = section_ids.map(sectionId => ({
      online_class_id: onlineClass.id,
      section_id: sectionId
    }));

    const { error: sectionsError } = await supabase
      .from('online_class_sections')
      .insert(sectionInserts);

    if (sectionsError) throw sectionsError;
  }

  return onlineClass;
};

// Update an online class
export const updateOnlineClass = async (classId: string, updates: UpdateOnlineClassData): Promise<OnlineClass> => {
  const { data, error } = await supabase
    .from('online_classes')
    .update(updates)
    .eq('id', classId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete an online class
export const deleteOnlineClass = async (classId: string): Promise<void> => {
  const { error } = await supabase
    .from('online_classes')
    .delete()
    .eq('id', classId);

  if (error) throw error;
};

// Get upcoming online classes (next 24 hours)
export const getUpcomingOnlineClasses = async (): Promise<OnlineClass[]> => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('online_classes')
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      sections:online_class_sections(
        id,
        section_id,
        created_at,
        section:sections(id, grade, section)
      )
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_date', now.toISOString().split('T')[0])
    .lte('scheduled_date', tomorrow.toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

// React Query hooks

export const useTeacherOnlineClasses = (teacherId: string) => {
  return useQuery({
    queryKey: ['online-classes', 'teacher', teacherId],
    queryFn: () => getTeacherOnlineClasses(teacherId),
    enabled: !!teacherId,
  });
};

export const useParentOnlineClasses = (parentId: string) => {
  return useQuery({
    queryKey: ['online-classes', 'parent', parentId],
    queryFn: () => getParentOnlineClasses(parentId),
    enabled: !!parentId,
  });
};

export const useOnlineClass = (classId: string) => {
  return useQuery({
    queryKey: ['online-classes', classId],
    queryFn: () => getOnlineClassById(classId),
    enabled: !!classId,
  });
};

export const useCreateOnlineClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createOnlineClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-classes'] });
    },
  });
};

export const useUpdateOnlineClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ classId, updates }: { classId: string; updates: UpdateOnlineClassData }) =>
      updateOnlineClass(classId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-classes'] });
    },
  });
};

export const useDeleteOnlineClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteOnlineClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-classes'] });
    },
  });
};

// Process pending notifications
export const processNotifications = async (): Promise<void> => {
  try {
    const response = await fetch('/api/admin/process-notifications', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to process notifications');
    }
    
    const result = await response.json();
    console.log('Notification processing result:', result);
  } catch (error) {
    console.error('Error processing notifications:', error);
    throw error;
  }
}; 