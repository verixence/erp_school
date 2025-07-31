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
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Send
} from 'lucide-react-native';

interface LeaveRequest {
  id: string;
  teacher_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_date: string;
  approved_by?: string;
  admin_notes?: string;
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Form state
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Fetch leave requests
  const { data: leaveRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-leave-requests', user?.id],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          teacher:users!leave_requests_teacher_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('teacher_id', user.id)
        .order('applied_date', { ascending: false });

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
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...requestData,
          teacher_id: user?.id,
          status: 'pending',
          applied_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Leave request submitted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to submit leave request. Please try again.');
    },
  });

  const resetForm = () => {
    setLeaveType('casual');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const handleSubmitLeave = () => {
    if (!startDate || !endDate || !reason.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    submitLeaveRequest.mutate({
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
    });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

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
              {calculateDays(request.start_date, request.end_date)} day(s)
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
              Applied: {formatDate(request.applied_date)}
            </Text>
          </View>
        </View>

        {request.admin_notes && (
          <View style={styles.adminNotes}>
            <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
            <Text style={styles.adminNotesText}>{request.admin_notes}</Text>
          </View>
        )}
      </View>
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
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Leave Request</Text>
            <TouchableOpacity 
              onPress={handleSubmitLeave}
              disabled={submitLeaveRequest.isPending}
            >
              <Text style={[
                styles.submitButton,
                submitLeaveRequest.isPending && styles.disabledButton
              ]}>
                Submit
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
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
}); 