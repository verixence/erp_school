'use client';

import { useAuth } from '@/hooks/use-auth';
import { useChildren, useChildAttendance } from '@/hooks/use-parent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, TrendingUp, Clock } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export default function ParentAttendance() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  
  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);
  
  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case 'week':
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
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
  const { data: attendance, isLoading: attendanceLoading } = useChildAttendance(
    selectedChild,
    start,
    end
  );

  // Set default selected child when children load
  if (children && children.length > 0 && !selectedChild) {
    setSelectedChild(children[0].id);
  }

  const currentChild = children?.find(child => child.id === selectedChild);

  // Calculate attendance stats
  const totalDays = attendance?.length || 0;
  const presentDays = attendance?.filter(record => record.status === 'present').length || 0;
  const absentDays = attendance?.filter(record => record.status === 'absent').length || 0;
  const lateDays = attendance?.filter(record => record.status === 'late').length || 0;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  if (childrenLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Attendance Records</h1>
          <p className="text-gray-600 mt-2">
            View daily attendance records for your children.
          </p>
        </div>
        
        <div className="flex gap-4">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(value: 'week' | 'month' | 'quarter') => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>

          {/* Child Selector */}
          {children && children.length > 0 && (
            <div className="min-w-48">
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                                   {children.map((child) => (
                   <SelectItem key={child.id} value={child.id}>
                     {child.full_name}
                   </SelectItem>
                 ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
            <p className="text-xs text-muted-foreground">
              School days recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
            <p className="text-xs text-muted-foreground">
              Days present
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentDays}</div>
            <p className="text-xs text-muted-foreground">
              Days absent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendancePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              Overall attendance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Child Info */}
      {currentChild && (
        <Card>
          <CardHeader>
                       <CardTitle className="flex items-center gap-2">
             <Users className="h-5 w-5" />
             {currentChild.full_name} - Grade {currentChild.sections?.grade}
           </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : attendance && attendance.length > 0 ? (
            <div className="space-y-2">
              {attendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {format(new Date(record.date), 'EEEE, MMMM do, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        record.status === 'present' ? 'default' : 
                        record.status === 'absent' ? 'destructive' : 'secondary'
                      }
                    >
                      {record.status}
                    </Badge>
                    {record.notes && (
                      <span className="text-sm text-gray-500">- {record.notes}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Records</h3>
              <p className="text-gray-600">
                No attendance records found for the selected period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Children State */}
      {!childrenLoading && (!children || children.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-600">
              No children are currently linked to your account.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 