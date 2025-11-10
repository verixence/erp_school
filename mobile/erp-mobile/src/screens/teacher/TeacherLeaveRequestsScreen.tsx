import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Send,
  Edit3,
  Trash2,
  BarChart3
} from 'lucide-react-native';

interface LeaveRequest {
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
  applied_date?: string; // For backward compatibility
  admin_notes?: string; // For backward compatibility
  approved_by?: string; // For backward compatibility
  teacher: {
    first_name: string;
    last_name: string;
  };
}

export const TeacherLeaveRequestsScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  
  // Form state
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState('');
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

  // Fetch leave requests
  const { data: leaveRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-leave-requests', user?.id],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          teacher:users!teacher_id(first_name, last_name)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Submit leave request mutation
  const submitLeaveRequest = useMutation({
    mutationFn: async (requestData: {
      leave_type: string;
      start_date: string;
      end_date: string;
      reason: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // First, get the user's school_id
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (!userDetails) throw new Error('User details not found');

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...requestData,
          teacher_id: user.id,
          school_id: userDetails.school_id,
          status: 'pending',
        })
        .select(`
          *,
          teacher:users!teacher_id(first_name, last_name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      setShowCreateModal(false);
      setShowEditModal(false);
      resetForm();
      Alert.alert('Success', 'Leave request submitted successfully!');
    },
    onError: (error: any) => {
      console.error('Leave request submission error:', error);
      const errorMessage = error?.message || 'Failed to submit leave request. Please try again.';
      Alert.alert('Error', errorMessage);
    },
  });

  // Edit leave request mutation
  const editLeaveRequest = useMutation({
    mutationFn: async (requestData: {
      id: string;
      leave_type: string;
      start_date: string;
      end_date: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          leave_type: requestData.leave_type,
          start_date: requestData.start_date,
          end_date: requestData.end_date,
          reason: requestData.reason,
        })
        .eq('id', requestData.id)
        .eq('teacher_id', user?.id)
        .eq('status', 'pending')
        .select(`
          *,
          teacher:users!teacher_id(first_name, last_name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      setShowEditModal(false);
      resetForm();
      Alert.alert('Success', 'Leave request updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to update leave request. Please try again.');
    },
  });

  // Delete leave request mutation
  const deleteLeaveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)
        .eq('teacher_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      Alert.alert('Success', 'Leave request deleted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to delete leave request. Please try again.');
    },
  });

  const resetForm = () => {
    setLeaveType('casual');
    setStartDate(new Date());
    setEndDate(new Date());
    setReason('');
    setEditingRequest(null);
  };

  const handleSubmitLeave = () => {
    console.log('Submitting leave request with data:', {
      leave_type: leaveType,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      reason: reason.trim(),
      user_id: user?.id
    });

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your leave request');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    submitLeaveRequest.mutate({
      leave_type: leaveType,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      reason: reason.trim(),
    });
  };

  const handleEditLeave = () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your leave request');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    if (!editingRequest) return;

    editLeaveRequest.mutate({
      id: editingRequest.id,
      leave_type: leaveType,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      reason: reason.trim(),
    });
  };

  const openEditModal = (request: LeaveRequest) => {
    setEditingRequest(request);
    setLeaveType(request.leave_type);
    setStartDate(new Date(request.start_date));
    setEndDate(new Date(request.end_date));
    setReason(request.reason);
    setShowEditModal(true);
  };

  const handleDeleteLeave = (requestId: string) => {
    Alert.alert(
      'Delete Leave Request',
      'Are you sure you want to delete this leave request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLeaveRequest.mutate(requestId),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (selectedFilter === 'all') return true;
    return request.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'pending': return AlertCircle;
      default: return Clock;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const calculateDays = (startDate: string | Date, endDate: string | Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Statistics calculations
  const pendingCount = leaveRequests.filter(req => req.status === 'pending').length;
  const approvedCount = leaveRequests.filter(req => req.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(req => req.status === 'rejected').length;
  const totalDaysThisYear = leaveRequests
    .filter(req => {
      const dateStr = req.created_at || req.applied_date;
      if (!dateStr) return false;
      const requestYear = new Date(dateStr).getFullYear();
      const currentYear = new Date().getFullYear();
      return req.status === 'approved' && requestYear === currentYear;
    })
    .reduce((sum, req) => sum + (req.total_days || calculateDays(req.start_date, req.end_date)), 0);

  // Handle date picker
  const openDatePicker = (mode: 'start' | 'end') => {
    console.log(`Opening ${mode} date picker`);
    setDatePickerMode(mode);
    
    // If we're inside a modal, temporarily close it
    const wasCreateModalOpen = showCreateModal;
    const wasEditModalOpen = showEditModal;
    
    if (wasCreateModalOpen) setShowCreateModal(false);
    if (wasEditModalOpen) setShowEditModal(false);
    
    // Small delay to allow modal to close, then show date picker
    setTimeout(() => {
      setShowDatePicker(true);
      console.log('Date picker state set to true');
    }, 100);
  };

  const handleDateConfirm = (selectedDate: Date) => {
    console.log('Date selected:', selectedDate);
    if (datePickerMode === 'start') {
      setStartDate(selectedDate);
      // Auto-adjust end date if it's before start date
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    } else {
      setEndDate(selectedDate);
    }
    setShowDatePicker(false);
    
    // Restore the modal that was open
    setTimeout(() => {
      if (editingRequest) {
        setShowEditModal(true);
      } else {
        setShowCreateModal(true);
      }
    }, 100);
  };

  const handleDateCancel = () => {
    console.log('Date picker cancelled');
    setShowDatePicker(false);
    
    // Restore the modal that was open
    setTimeout(() => {
      if (editingRequest) {
        setShowEditModal(true);
      } else {
        setShowCreateModal(true);
      }
    }, 100);
  };

  const renderStatisticsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <View style={styles.statHeader}>
            <Clock size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{pendingCount}</Text>
          </View>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <View style={styles.statHeader}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.statValue}>{approvedCount}</Text>
          </View>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
          <View style={styles.statHeader}>
            <XCircle size={20} color="#ef4444" />
            <Text style={styles.statValue}>{rejectedCount}</Text>
          </View>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <View style={styles.statHeader}>
            <Calendar size={20} color="#3b82f6" />
            <Text style={styles.statValue}>{totalDaysThisYear}</Text>
          </View>
          <Text style={styles.statLabel}>Days Taken</Text>
        </View>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            selectedFilter === filter && styles.activeFilter
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === filter && styles.activeFilterText
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderLeaveRequest = (request: LeaveRequest) => {
    const StatusIcon = getStatusIcon(request.status);
    
    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.leaveType}>{request.leave_type.toUpperCase()}</Text>
            <Text style={styles.dateRange}>
              {formatDate(request.start_date)} - {formatDate(request.end_date)}
            </Text>
            <Text style={styles.duration}>
              {request.total_days || calculateDays(request.start_date, request.end_date)} day(s)
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
            <StatusIcon size={16} color={getStatusColor(request.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
              {request.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.reason}>{request.reason}</Text>
        
        <View style={styles.requestFooter}>
          <View style={styles.dateInfo}>
            <Calendar size={14} color="#6b7280" />
            <Text style={styles.appliedDate}>
              Applied: {formatDate(request.created_at || request.applied_date || new Date().toISOString())}
            </Text>
          </View>
          
          {request.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditModal(request)}
                disabled={editLeaveRequest.isPending || deleteLeaveRequest.isPending}
              >
                <Edit3 size={16} color="#3b82f6" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteLeave(request.id)}
                disabled={editLeaveRequest.isPending || deleteLeaveRequest.isPending}
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {(request.admin_response || request.admin_notes) && (
          <View style={styles.adminNotes}>
            <Text style={styles.adminNotesLabel}>Admin Response:</Text>
            <Text style={styles.adminNotesText}>{request.admin_response || request.admin_notes}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDatePickerSection = () => (
    <View style={styles.dateRow}>
      <View style={styles.dateGroup}>
        <Text style={styles.label}>Start Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            console.log('Start date button pressed, showDatePicker:', showDatePicker);
            openDatePicker('start');
          }}
          activeOpacity={0.7}
        >
          <Calendar size={16} color="#6b7280" />
          <Text style={styles.dateButtonText}>
            {formatDate(startDate)}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.dateGroup}>
        <Text style={styles.label}>End Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            console.log('End date button pressed, showDatePicker:', showDatePicker);
            openDatePicker('end');
          }}
          activeOpacity={0.7}
        >
          <Calendar size={16} color="#6b7280" />
          <Text style={styles.dateButtonText}>
            {formatDate(endDate)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFormModal = (isEdit: boolean = false) => {
    const isVisible = isEdit ? showEditModal : showCreateModal;
    const onClose = () => {
      if (isEdit) {
        setShowEditModal(false);
      } else {
        setShowCreateModal(false);
      }
      resetForm();
    };
    const onSubmit = isEdit ? handleEditLeave : handleSubmitLeave;
    const isPending = isEdit ? editLeaveRequest.isPending : submitLeaveRequest.isPending;
    const title = isEdit ? 'Edit Leave Request' : 'New Leave Request';
    const submitText = isEdit ? 'Update' : 'Submit';

    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity 
              onPress={onSubmit}
              disabled={isPending}
            >
              <Text style={[
                styles.submitButton,
                isPending && styles.disabledButton
              ]}>
                {isPending ? 'Submitting...' : submitText}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Leave Type</Text>
              <View style={styles.typeSelector}>
                {['casual', 'sick', 'emergency', 'maternity', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      leaveType === type && styles.selectedType
                    ]}
                    onPress={() => setLeaveType(type)}
                  >
                    <Text style={[
                      styles.typeText,
                      leaveType === type && styles.selectedTypeText
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {renderDatePickerSection()}
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Days</Text>
              <View style={[styles.dateInput, styles.disabledInput]}>
                <Text style={styles.disabledText}>
                  {calculateDays(startDate, endDate)} days
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Please provide a reason for your leave request..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leave Requests</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      {renderStatisticsCards()}

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Leave Requests List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading leave requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No leave requests found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'You haven\'t submitted any leave requests yet'
                : `No ${selectedFilter} leave requests`
              }
            </Text>
          </View>
        ) : (
          filteredRequests.map(renderLeaveRequest)
        )}
      </ScrollView>

      {/* Create Leave Request Modal */}
      {renderFormModal(false)}

      {/* Edit Leave Request Modal */}
      {renderFormModal(true)}

      {/* Native Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? startDate : endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            console.log('DateTimePicker onChange called', event.type, selectedDate);
            if (event.type === 'dismissed' || !selectedDate) {
              handleDateCancel();
            } else {
              handleDateConfirm(selectedDate);
            }
          }}
          minimumDate={datePickerMode === 'start' ? new Date() : startDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeFilterText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  reason: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedDate: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  adminNotes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  adminNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  submitButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  disabledButton: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedType: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedTypeText: {
    color: '#fff',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 100,
  },
  // Statistics Cards
  statsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Date picker styles
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  disabledText: {
    fontSize: 16,
    color: '#6b7280',
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});