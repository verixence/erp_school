import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Calendar, Clock, BookOpen, Users, GraduationCap, MapPin } from 'lucide-react-native';

interface TimetableEntry {
  id: string;
  weekday: number;
  period_no: number;
  subject: string;
  section_id: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  section: string;
  grade: number;
}

export const TeacherTimetableScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch teacher's timetable
  const { data: timetable = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-timetable', user?.id],
    queryFn: async (): Promise<TimetableEntry[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          sections!inner(id, grade, section, school_id)
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id)
        .order('weekday', { ascending: true })
        .order('period_no', { ascending: true });

      if (error) throw error;
      
      // Transform data to match expected format
      return data.map((period: any) => ({
        ...period,
        section: `Grade ${period.sections.grade} ${period.sections.section}`,
        grade: period.sections.grade
      })) as TimetableEntry[];
    },
    enabled: !!user?.id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Group timetable by weekday
  const weekdays = [
    { day: 1, name: 'Monday', short: 'Mon' },
    { day: 2, name: 'Tuesday', short: 'Tue' },
    { day: 3, name: 'Wednesday', short: 'Wed' },
    { day: 4, name: 'Thursday', short: 'Thu' },
    { day: 5, name: 'Friday', short: 'Fri' },
    { day: 6, name: 'Saturday', short: 'Sat' },
  ];

  // Get current day for highlighting
  const currentDay = new Date().getDay() === 0 ? 7 : new Date().getDay();

  // Get unique periods
  const allPeriods = [...new Set(timetable.map(t => t.period_no))].sort((a, b) => a - b);
  const maxPeriods = Math.max(...allPeriods, 0);

  // Create timetable grid
  const timetableGrid: Record<string, TimetableEntry> = {};
  timetable.forEach(item => {
    const key = `${item.weekday}-${item.period_no}`;
    timetableGrid[key] = item;
  });

  // Get today's schedule
  const todaySchedule = timetable.filter(item => item.weekday === currentDay);

  // Calculate stats
  const totalClasses = timetable.length;
  const uniqueSubjects = [...new Set(timetable.map(t => t.subject))].length;
  const uniqueSections = [...new Set(timetable.map(t => t.section))].length;
  const todayClasses = todaySchedule.length;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading timetable...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
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
              My Timetable
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Weekly class schedule
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          <View style={{ width: '25%', paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6' }}>
                {totalClasses}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Total Classes
              </Text>
            </View>
          </View>
          <View style={{ width: '25%', paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>
                {uniqueSubjects}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Subjects
              </Text>
            </View>
          </View>
          <View style={{ width: '25%', paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b' }}>
                {uniqueSections}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Sections
              </Text>
            </View>
          </View>
          <View style={{ width: '25%', paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6' }}>
                {todayClasses}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Today
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {timetable.length > 0 ? (
          <>
            {/* Today's Schedule */}
            {todaySchedule.length > 0 && (
              <View style={{ padding: 24, paddingBottom: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Clock size={20} color="#111827" />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
                    Today's Classes
                  </Text>
                </View>
                <View style={{ gap: 12 }}>
                  {todaySchedule.map((classItem) => (
                    <Card key={classItem.id}>
                      <CardContent style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                              {classItem.subject}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <GraduationCap size={14} color="#6b7280" />
                              <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                                {classItem.section}
                              </Text>
                            </View>
                            {classItem.venue && (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MapPin size={14} color="#6b7280" />
                                <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                                  {classItem.venue}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={{ 
                              backgroundColor: '#3b82f6', 
                              paddingHorizontal: 8, 
                              paddingVertical: 4, 
                              borderRadius: 6,
                              marginBottom: 4
                            }}>
                              <Text style={{ fontSize: 12, color: 'white', fontWeight: '500' }}>
                                Period {classItem.period_no}
                              </Text>
                            </View>
                            {(classItem.start_time || classItem.end_time) && (
                              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {classItem.start_time && classItem.end_time
                                  ? `${classItem.start_time} - ${classItem.end_time}`
                                  : classItem.start_time || classItem.end_time}
                              </Text>
                            )}
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {/* Weekly Timetable Grid */}
            <View style={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <BookOpen size={20} color="#111827" />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
                  Weekly Schedule
                </Text>
              </View>

              <Card>
                <CardContent style={{ padding: 0 }}>
                  {/* Header Row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    backgroundColor: '#f9fafb', 
                    borderBottomWidth: 1, 
                    borderBottomColor: '#e5e7eb' 
                  }}>
                    <View style={{ 
                      width: 60, 
                      padding: 12, 
                      borderRightWidth: 1, 
                      borderRightColor: '#e5e7eb',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>
                        Period
                      </Text>
                    </View>
                    {weekdays.map(({ day, name, short }) => (
                      <View 
                        key={day}
                        style={{ 
                          flex: 1, 
                          padding: 12, 
                          borderRightWidth: day < 6 ? 1 : 0, 
                          borderRightColor: '#e5e7eb',
                          alignItems: 'center',
                          backgroundColor: day === currentDay ? '#dbeafe' : 'transparent'
                        }}
                      >
                        <Text style={{ 
                          fontSize: 12, 
                          fontWeight: '600', 
                          color: day === currentDay ? '#1d4ed8' : '#6b7280' 
                        }}>
                          {short}
                        </Text>
                        {day === currentDay && (
                          <Text style={{ fontSize: 10, color: '#1d4ed8', marginTop: 2 }}>
                            Today
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Timetable Rows */}
                  {Array.from({ length: maxPeriods }, (_, i) => i + 1).map(period => (
                    <View 
                      key={period}
                      style={{ 
                        flexDirection: 'row', 
                        borderBottomWidth: period < maxPeriods ? 1 : 0, 
                        borderBottomColor: '#e5e7eb' 
                      }}
                    >
                      {/* Period Number */}
                      <View style={{ 
                        width: 60, 
                        padding: 12, 
                        borderRightWidth: 1, 
                        borderRightColor: '#e5e7eb',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f9fafb'
                      }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                          {period}
                        </Text>
                      </View>

                      {/* Day Cells */}
                      {weekdays.map(({ day }) => {
                        const periodData = timetableGrid[`${day}-${period}`];
                        
                        return (
                          <View 
                            key={`${day}-${period}`}
                            style={{ 
                              flex: 1, 
                              minHeight: 60,
                              padding: 8, 
                              borderRightWidth: day < 6 ? 1 : 0, 
                              borderRightColor: '#e5e7eb',
                              backgroundColor: day === currentDay ? '#f0f9ff' : 'white'
                            }}
                          >
                            {periodData ? (
                              <View style={{ flex: 1 }}>
                                <View style={{
                                  backgroundColor: '#3b82f6',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  marginBottom: 4
                                }}>
                                  <Text style={{ 
                                    fontSize: 10, 
                                    fontWeight: '600', 
                                    color: 'white',
                                    textAlign: 'center'
                                  }}>
                                    {periodData.subject}
                                  </Text>
                                </View>
                                <Text style={{ 
                                  fontSize: 9, 
                                  color: '#6b7280', 
                                  textAlign: 'center',
                                  marginBottom: 2
                                }}>
                                  {periodData.section}
                                </Text>
                                {(periodData.start_time || periodData.end_time) && (
                                  <Text style={{ 
                                    fontSize: 8, 
                                    color: '#9ca3af', 
                                    textAlign: 'center' 
                                  }}>
                                    {periodData.start_time && periodData.end_time
                                      ? `${periodData.start_time}-${periodData.end_time}`
                                      : periodData.start_time || periodData.end_time}
                                  </Text>
                                )}
                              </View>
                            ) : (
                              <View style={{ 
                                flex: 1, 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}>
                                <Text style={{ fontSize: 10, color: '#d1d5db' }}>
                                  Free
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                  Summary
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <View style={{ 
                    backgroundColor: 'white', 
                    padding: 12, 
                    borderRadius: 8, 
                    flex: 1,
                    minWidth: '45%'
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>
                      Classes per Day
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Avg: {(totalClasses / 6).toFixed(1)} classes
                    </Text>
                  </View>
                  <View style={{ 
                    backgroundColor: 'white', 
                    padding: 12, 
                    borderRadius: 8, 
                    flex: 1,
                    minWidth: '45%'
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>
                      Peak Day
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {weekdays.find(w => w.day === currentDay)?.name || 'Today'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={{ flex: 1, padding: 24 }}>
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <Calendar size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  No Timetable Found
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                  Your weekly class schedule hasn't been set up yet. Please contact the administration.
                </Text>
              </CardContent>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}; 