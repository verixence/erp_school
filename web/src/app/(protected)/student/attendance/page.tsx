'use client';

import { useAuth } from '@/hooks/use-auth';
import { useStudentAttendance } from '../../../../../../common/src/api/student';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  
  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case 'week':
        return {
          start: format(startOfWeek(today), 'yyyy-MM-dd'),
          end: format(endOfWeek(today), 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'quarter':
        return {
          start: format(subDays(today, 90), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      default:
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
    }
  };

  const { start, end } = getDateRange();
  const { data: attendance, isLoading: attendanceLoading } = useStudentAttendance(
    user?.id,
    start,
    end
  );

  // Calculate attendance stats
  const totalDays = attendance?.length || 0;
  const presentDays = attendance?.filter(record => record.status === 'present').length || 0;
  const absentDays = attendance?.filter(record => record.status === 'absent').length || 0;
  const lateDays = attendance?.filter(record => record.status === 'late').length || 0;
  const excusedDays = attendance?.filter(record => record.status === 'excused').length || 0;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Generate calendar days for current month view
  const getCalendarDays = () => {
    if (dateRange !== 'month') return [];
    
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const calendarDays = getCalendarDays();

  const getAttendanceForDate = (date: Date) => {
    return attendance?.find(record => 
      isSameDay(new Date(record.date), date)
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'excused':
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'absent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'late':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'excused':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600 mt-2">
            Track your daily attendance and view your attendance patterns.
          </p>
        </div>
        
        {/* Date Range Selector */}
        <Select value={dateRange} onValueChange={(value: 'week' | 'month' | 'quarter') => setDateRange(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
            <p className="text-xs text-muted-foreground">School days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
            <p className="text-xs text-muted-foreground">Days present</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentDays}</div>
            <p className="text-xs text-muted-foreground">Days absent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lateDays}</div>
            <p className="text-xs text-muted-foreground">Days late</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendancePercentage}%</div>
            <p className="text-xs text-muted-foreground">Overall rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View (for month view) */}
      {dateRange === 'month' && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const attendanceRecord = getAttendanceForDate(day);
                const isCurrentMonth = format(day, 'M') === format(new Date(), 'M');
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={index}
                    className={`
                      p-2 text-center border rounded-lg min-h-12 flex flex-col items-center justify-center
                      ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                      ${attendanceRecord ? getStatusColor(attendanceRecord.status) : 'bg-gray-50'}
                    `}
                  >
                    <span className="text-sm">{format(day, 'd')}</span>
                    {attendanceRecord && (
                      <div className="mt-1">
                        {getStatusIcon(attendanceRecord.status)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-sm">Late</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Excused</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance && attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      {record.notes && (
                        <p className="text-sm text-gray-600">{record.notes}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={record.status === 'present' ? 'default' : 
                           record.status === 'absent' ? 'destructive' : 'secondary'}
                  >
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </Badge>
                </div>
              ))}
              {attendance.length > 10 && (
                <p className="text-center text-gray-500 py-4">
                  Showing latest 10 records. Total: {attendance.length} records.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
              <p className="text-gray-600">No attendance records found for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Insights */}
      {attendance && attendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Attendance Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Excellent (≥95%)</span>
                    <span className={attendancePercentage >= 95 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                      {attendancePercentage >= 95 ? '✓' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Good (≥90%)</span>
                    <span className={attendancePercentage >= 90 && attendancePercentage < 95 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                      {attendancePercentage >= 90 && attendancePercentage < 95 ? '✓' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Needs Improvement (&lt;90%)</span>
                    <span className={attendancePercentage < 90 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {attendancePercentage < 90 ? '⚠️' : '—'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Recent Trends</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Perfect Week</span>
                    <span className="text-gray-500">Coming soon</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Improvement Needed</span>
                    <span className="text-gray-500">Coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 