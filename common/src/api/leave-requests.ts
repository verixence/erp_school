import { supabase } from './supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types and Interfaces
export interface LeaveRequest {
  id: string;
  teacher_id: string;
  school_id: string;
  leave_type: 'sick' | 'casual' | 'emergency' | 'maternity' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_response?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateLeaveRequestData {
  leave_type: LeaveRequest['leave_type'];
  start_date: string;
  end_date: string;
  reason: string;
}

export interface UpdateLeaveRequestData {
  status: 'approved' | 'rejected';
  admin_response?: string;
}

export interface LeaveStatistics {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_days_requested: number;
  total_days_approved: number;
}

// API Functions

// Create a new leave request (Teachers only)
export const createLeaveRequest = async (data: CreateLeaveRequestData): Promise<LeaveRequest> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data: userDetails } = await supabase
    .from('users')
    .select('school_id')
    .eq('id', user.user.id)
    .single();

  if (!userDetails) throw new Error('User details not found');

  const { data: result, error } = await supabase
    .from('leave_requests')
    .insert([{
      ...data,
      teacher_id: user.user.id,
      school_id: userDetails.school_id,
    }])
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      reviewer:users!reviewed_by(id, first_name, last_name)
    `)
    .single();

  if (error) throw error;
  return result;
};

// Get teacher's own leave requests
export const getTeacherLeaveRequests = async (teacherId: string): Promise<LeaveRequest[]> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      reviewer:users!reviewed_by(id, first_name, last_name)
    `)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get all leave requests for school admin
export const getSchoolLeaveRequests = async (schoolId: string): Promise<LeaveRequest[]> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      reviewer:users!reviewed_by(id, first_name, last_name)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Update leave request status (Admin only)
export const updateLeaveRequestStatus = async (
  leaveRequestId: string, 
  updateData: UpdateLeaveRequestData
): Promise<LeaveRequest> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update(updateData)
    .eq('id', leaveRequestId)
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      reviewer:users!reviewed_by(id, first_name, last_name)
    `)
    .single();

  if (error) throw error;
  return data;
};

// Update teacher's own pending leave request
export const updateOwnLeaveRequest = async (
  leaveRequestId: string,
  data: Partial<CreateLeaveRequestData>
): Promise<LeaveRequest> => {
  const { data: result, error } = await supabase
    .from('leave_requests')
    .update(data)
    .eq('id', leaveRequestId)
    .eq('status', 'pending') // Can only update pending requests
    .select(`
      *,
      teacher:users!teacher_id(id, first_name, last_name, email),
      reviewer:users!reviewed_by(id, first_name, last_name)
    `)
    .single();

  if (error) throw error;
  return result;
};

// Delete teacher's own pending leave request
export const deleteLeaveRequest = async (leaveRequestId: string): Promise<void> => {
  const { error } = await supabase
    .from('leave_requests')
    .delete()
    .eq('id', leaveRequestId)
    .eq('status', 'pending'); // Can only delete pending requests

  if (error) throw error;
};

// Get leave statistics for school
export const getLeaveStatistics = async (schoolId: string, year?: number): Promise<LeaveStatistics> => {
  const { data, error } = await supabase.rpc('get_leave_statistics', {
    school_id_param: schoolId,
    year_param: year || null
  });

  if (error) throw error;
  return data?.[0] || {
    total_requests: 0,
    pending_requests: 0,
    approved_requests: 0,
    rejected_requests: 0,
    total_days_requested: 0,
    total_days_approved: 0
  };
};

// React Query Hooks

// Hook for teacher's leave requests
export const useTeacherLeaveRequests = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-leave-requests', teacherId],
    queryFn: () => teacherId ? getTeacherLeaveRequests(teacherId) : Promise.resolve([]),
    enabled: !!teacherId,
  });
};

// Hook for school's leave requests (Admin)
export const useSchoolLeaveRequests = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-leave-requests', schoolId],
    queryFn: () => schoolId ? getSchoolLeaveRequests(schoolId) : Promise.resolve([]),
    enabled: !!schoolId,
  });
};

// Hook for leave statistics
export const useLeaveStatistics = (schoolId?: string, year?: number) => {
  return useQuery({
    queryKey: ['leave-statistics', schoolId, year],
    queryFn: () => schoolId ? getLeaveStatistics(schoolId, year) : Promise.resolve({
      total_requests: 0,
      pending_requests: 0,
      approved_requests: 0,
      rejected_requests: 0,
      total_days_requested: 0,
      total_days_approved: 0
    }),
    enabled: !!schoolId,
  });
};

// Mutation for creating leave request
export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['school-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-statistics'] });
    },
  });
};

// Mutation for updating leave request status (Admin)
export const useUpdateLeaveRequestStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveRequestData }) =>
      updateLeaveRequestStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['school-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-statistics'] });
    },
  });
};

// Mutation for updating own leave request (Teacher)
export const useUpdateOwnLeaveRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeaveRequestData> }) =>
      updateOwnLeaveRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['school-leave-requests'] });
    },
  });
};

// Mutation for deleting leave request
export const useDeleteLeaveRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['school-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-statistics'] });
    },
  });
};

// Helper functions
export const getLeaveTypeDisplayName = (type: LeaveRequest['leave_type']): string => {
  const displayNames = {
    sick: 'Sick Leave',
    casual: 'Casual Leave',
    emergency: 'Emergency Leave',
    maternity: 'Maternity Leave',
    personal: 'Personal Leave',
    other: 'Other'
  };
  
  return displayNames[type] || type;
};

export const getStatusColor = (status: LeaveRequest['status']): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const calculateLeaveDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end date
}; 