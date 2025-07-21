import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Users,
  ChevronDown,
  TrendingUp,
  Filter,
  GraduationCap,
  BarChart3,
  Activity
} from 'lucide-react-native';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  section_id: string;
  sections?: {
    id: string;
    grade: number;
    section: string;
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by?: string;
  notes?: string;
  period_number?: number;
  subject?: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendancePercentage: number;
}

export const ParentAttendanceScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [refreshing, setRefreshing] = useState(false);

  // Fetch children using correct student_parents relationship
  const { data: children = [], isLoading: childrenLoading, refetch: refetchChildren } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            admission_no,
            section_id,
            sections!inner(
              id,
              grade,
              section
            )
          )
        `)
        .eq('parent_id', user.id)
        .eq('students.school_id', user.school_id);

      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        section_id: item.students.section_id,
        sections: item.students.sections
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Set default selected child
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children.length, selectedChild]); // Use children.length instead of children array

  // Fetch attendance records
  const { data: attendanceRecords = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['child-attendance', selectedChild, selectedMonth],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!selectedChild || !selectedMonth) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          date,
          status,
          marked_by,
          notes,
          period_number,
          subject
        `)
        .eq('student_id', selectedChild)
        .eq('school_id', user?.school_id)
        .gte('date', selectedMonth + '-01')
        .lt('date', selectedMonth + '-32')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!selectedChild && !!selectedMonth,
    staleTime: 1000 * 60 * 5, // Consider attendance fresh for 5 minutes
  });

  // Calculate attendance statistics
  const attendanceStats: AttendanceStats = React.useMemo(() => {
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
    const excusedDays = attendanceRecords.filter(r => r.status === 'excused').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      excusedDays,
      attendancePercentage
    };
  }, [attendanceRecords.length, selectedChild, selectedMonth]); // Use stable dependencies

  const currentChild = children.find(child => child.id === selectedChild);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchChildren(),
      refetchAttendance()
    ]);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#10b981';
      case 'absent':
        return '#ef4444';
      case 'late':
        return '#f59e0b';
      case 'excused':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return CheckCircle;
      case 'absent':
        return XCircle;
      case 'late':
        return Clock;
      case 'excused':
        return AlertCircle;
      default:
        return Calendar;
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Enhanced Header */}
      <View style={{ 
        backgroundColor: 'white', 
        paddingHorizontal: 24, 
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            backgroundColor: '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <Calendar size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Attendance Tracker
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Monitor daily attendance records
            </Text>
          </View>
        </View>
        
        {/* Child and Month Selectors */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Child Selector */}
          {children.length > 1 && (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
                Child
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#d1d5db'
                }}
                onPress={() => console.log('Open child selector')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <GraduationCap size={16} color="#6b7280" />
                  <Text style={{ fontSize: 14, color: '#111827', marginLeft: 8 }}>
                    {currentChild ? currentChild.full_name : 'Select child'}
                  </Text>
                </View>
                <ChevronDown size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* Month Selector */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
              Month
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1d5db'
              }}
              onPress={() => console.log('Open month selector')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Filter size={16} color="#6b7280" />
                <Text style={{ fontSize: 14, color: '#111827', marginLeft: 8 }}>
                  {monthNames[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
                </Text>
              </View>
              <ChevronDown size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Current Child Info */}
        {currentChild && (
          <View style={{ marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 50, 
                    height: 50, 
                    borderRadius: 25,
                    backgroundColor: '#3b82f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                      {currentChild.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                      {currentChild.full_name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                      Grade {currentChild.sections?.grade} - Section {currentChild.sections?.section}
                    </Text>
                  </View>
                  <View style={{ 
                    backgroundColor: '#10b981',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                      Active
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Attendance Statistics */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <BarChart3 size={20} color="#111827" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Attendance Summary
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                        {attendanceStats.attendancePercentage}%
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        Attendance
                      </Text>
                    </View>
                    <TrendingUp size={20} color="#10b981" />
                  </View>
                </CardContent>
              </Card>
            </View>

            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                        {attendanceStats.presentDays}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        Present Days
                      </Text>
                    </View>
                    <CheckCircle size={20} color="#10b981" />
                  </View>
                </CardContent>
              </Card>
            </View>

            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                        {attendanceStats.absentDays}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        Absent Days
                      </Text>
                    </View>
                    <XCircle size={20} color="#ef4444" />
                  </View>
                </CardContent>
              </Card>
            </View>

            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                        {attendanceStats.totalDays}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        Total Days
                      </Text>
                    </View>
                    <Calendar size={20} color="#6b7280" />
                  </View>
                </CardContent>
              </Card>
            </View>
          </View>
        </View>

        {/* Attendance Records */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Activity size={20} color="#111827" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Daily Records
            </Text>
          </View>
          
          {attendanceRecords.length > 0 ? (
            <View>
              {attendanceRecords.map((record, index) => {
                const StatusIcon = getStatusIcon(record.status);
                const statusColor = getStatusColor(record.status);
                
                return (
                  <Card key={record.id} style={{ marginBottom: 12 }}>
                    <CardContent style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 20,
                            backgroundColor: statusColor + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                          }}>
                            <StatusIcon size={20} color={statusColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                              {new Date(record.date).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                              {record.subject && `${record.subject} - `}
                              {record.period_number && `Period ${record.period_number}`}
                            </Text>
                            {record.notes && (
                              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                                {record.notes}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={{ 
                          backgroundColor: statusColor,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12
                        }}>
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' }}>
                            {record.status}
                          </Text>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <Calendar size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                  No Records Found
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                  No attendance records found for the selected month.
                </Text>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
