import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  ChevronDown,
  Filter,
  Download,
  Eye,
  Percent,
  Award
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  period_number?: number;
  subject?: string;
  marked_by: string;
  created_at: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
}

export const ParentAttendanceScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  // Fetch children using the correct student_parents table relationship
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

  // Set default selected child when children load
  useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children.length, selectedChild]);

  // Fetch attendance records for selected child and month
  const { data: attendanceRecords = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['child-attendance', selectedChild, selectedMonth],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!selectedChild || !selectedMonth) return [];

      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of the month
      const endDateStr = endDate.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', selectedChild)
        .gte('date', startDate)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!selectedChild && !!selectedMonth,
  });

  // Calculate attendance statistics
  const attendanceStats: AttendanceStats = React.useMemo(() => {
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
    const attendancePercentage = totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendancePercentage
    };
  }, [attendanceRecords]);

  // Filter attendance records based on selected filter
  const filteredRecords = React.useMemo(() => {
    if (filterStatus === 'all') return attendanceRecords;
    return attendanceRecords.filter(record => record.status === filterStatus);
  }, [attendanceRecords, filterStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchChildren(),
      refetchAttendance()
    ]);
    setRefreshing(false);
  };

  const currentChild = children.find(child => child.id === selectedChild);

  const renderAttendanceCard = ({ item: record }: { item: AttendanceRecord }) => {
    const date = new Date(record.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });

    const getStatusColor = () => {
      switch (record.status) {
        case 'present': return '#10b981';
        case 'absent': return '#ef4444';
        case 'late': return '#f59e0b';
        default: return '#6b7280';
      }
    };

    const getStatusIcon = () => {
      switch (record.status) {
        case 'present': return <CheckCircle size={20} color="#10b981" />;
        case 'absent': return <XCircle size={20} color="#ef4444" />;
        case 'late': return <Clock size={20} color="#f59e0b" />;
        default: return <AlertTriangle size={20} color="#6b7280" />;
      }
    };

    return (
      <Card style={{ marginBottom: 12 }}>
        <CardContent style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ 
                width: 50, 
                height: 50, 
                borderRadius: 25, 
                backgroundColor: getStatusColor() + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16
              }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: getStatusColor() }}>
                  {dayNumber}
                </Text>
                <Text style={{ fontSize: 10, color: getStatusColor() }}>
                  {monthName}
                </Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                  {dayName}, {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {getStatusIcon()}
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '500', 
                    color: getStatusColor(),
                    marginLeft: 8,
                    textTransform: 'capitalize'
                  }}>
                    {record.status}
                  </Text>
                </View>
                {record.subject && (
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {record.subject}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {new Date(record.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  const generateMonthOptions = () => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthString = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      months.push({ value: monthString, label: monthName });
    }
    
    return months;
  };

  if (childrenLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Activity size={32} color="#6b7280" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>Loading children...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Child and Month Selection */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              Select Child & Period
            </Text>
          </CardHeader>
          <CardContent style={{ padding: 20 }}>
            {/* Child Selector */}
            {children.length > 1 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  Child
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {children.map((child) => (
                      <TouchableOpacity
                        key={child.id}
                        onPress={() => setSelectedChild(child.id)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          backgroundColor: selectedChild === child.id ? '#3b82f6' : '#f3f4f6',
                          minWidth: 140,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: selectedChild === child.id ? 'white' : '#6b7280'
                        }}>
                          {child.full_name}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: selectedChild === child.id ? 'rgba(255,255,255,0.8)' : '#9ca3af'
                        }}>
                          Grade {child.sections?.grade} {child.sections?.section}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Month Selector */}
            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Month
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {generateMonthOptions().slice(0, 6).map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      onPress={() => setSelectedMonth(month.value)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: selectedMonth === month.value ? '#3b82f6' : '#f3f4f6',
                        minWidth: 120,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: selectedMonth === month.value ? 'white' : '#6b7280'
                      }}>
                        {month.label.split(' ')[0]}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: selectedMonth === month.value ? 'rgba(255,255,255,0.8)' : '#9ca3af'
                      }}>
                        {month.label.split(' ')[1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </CardContent>
        </Card>

        {/* Current Child Info */}
        {currentChild && (
          <Card style={{ marginBottom: 24 }}>
            <CardContent style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ 
                  width: 50, 
                  height: 50, 
                  borderRadius: 25, 
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                    {currentChild.full_name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                    {currentChild.full_name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    Grade {currentChild.sections?.grade} - Section {currentChild.sections?.section}
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>Roll No</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    {currentChild.admission_no}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>Attendance</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: attendanceStats.attendancePercentage >= 75 ? '#10b981' : '#ef4444' }}>
                    {attendanceStats.attendancePercentage.toFixed(1)}%
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>Days Present</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    {attendanceStats.presentDays + attendanceStats.lateDays}/{attendanceStats.totalDays}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Attendance Statistics */}
        {attendanceRecords.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Monthly Statistics
              </Text>
            </CardHeader>
            <CardContent style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>
                    {attendanceStats.presentDays}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Present</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>
                    {attendanceStats.absentDays}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Absent</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>
                    {attendanceStats.lateDays}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Late</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>
                    {attendanceStats.totalDays}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Total Days</Text>
                </View>
              </View>
              
              {/* Attendance Rate Bar */}
              <View style={{ backgroundColor: '#f3f4f6', height: 8, borderRadius: 4, marginBottom: 12 }}>
                <View style={{ 
                  backgroundColor: attendanceStats.attendancePercentage >= 75 ? '#10b981' : '#ef4444',
                  height: 8, 
                  borderRadius: 4,
                  width: `${attendanceStats.attendancePercentage}%`
                }} />
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                  Attendance Rate: {attendanceStats.attendancePercentage.toFixed(1)}%
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {attendanceStats.attendancePercentage >= 75 ? (
                    <TrendingUp size={16} color="#10b981" />
                  ) : (
                    <TrendingDown size={16} color="#ef4444" />
                  )}
                  <Text style={{ 
                    fontSize: 12, 
                    color: attendanceStats.attendancePercentage >= 75 ? '#10b981' : '#ef4444',
                    marginLeft: 4,
                    fontWeight: '500'
                  }}>
                    {attendanceStats.attendancePercentage >= 75 ? 'Good' : 'Needs Improvement'}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Filter Options */}
        {attendanceRecords.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <CardContent style={{ padding: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                Filter by Status
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['all', 'present', 'absent', 'late'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setFilterStatus(status)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: filterStatus === status ? '#3b82f6' : '#f3f4f6',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: filterStatus === status ? 'white' : '#6b7280',
                      textTransform: 'capitalize'
                    }}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Attendance Records */}
        {filteredRecords.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Daily Records ({filteredRecords.length})
              </Text>
            </CardHeader>
            <CardContent style={{ padding: 20 }}>
              <FlatList
                data={filteredRecords}
                renderItem={renderAttendanceCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </CardContent>
          </Card>
        )}

        {/* No Records State */}
        {selectedChild && attendanceRecords.length === 0 && !attendanceLoading && (
          <Card>
            <CardContent style={{ padding: 40, alignItems: 'center' }}>
              <Calendar size={48} color="#6b7280" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                No Attendance Records
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                No attendance records found for the selected period.
              </Text>
            </CardContent>
          </Card>
        )}

        {/* No Children State */}
        {children.length === 0 && (
          <Card>
            <CardContent style={{ padding: 40, alignItems: 'center' }}>
              <Users size={48} color="#6b7280" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                No Children Linked
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                No children are linked to your account. Contact your school administrator.
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
