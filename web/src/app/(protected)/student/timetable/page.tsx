'use client';

import { useAuth } from '@/hooks/use-auth';
import { useStudentTimetable } from '../../../../../../common/src/api/student';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, BookOpen, GraduationCap } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const WEEKDAYS = [
  { num: 1, name: 'Monday', short: 'Mon' },
  { num: 2, name: 'Tuesday', short: 'Tue' },
  { num: 3, name: 'Wednesday', short: 'Wed' },
  { num: 4, name: 'Thursday', short: 'Thu' },
  { num: 5, name: 'Friday', short: 'Fri' },
  { num: 6, name: 'Saturday', short: 'Sat' },
  { num: 7, name: 'Sunday', short: 'Sun' },
];

const TIME_SLOTS = [
  { period: 1, start: '08:00', end: '08:40' },
  { period: 2, start: '08:40', end: '09:20' },
  { period: 3, start: '09:20', end: '10:00' },
  { period: 4, start: '10:20', end: '11:00' }, // Break after period 3
  { period: 5, start: '11:00', end: '11:40' },
  { period: 6, start: '11:40', end: '12:20' },
  { period: 7, start: '13:00', end: '13:40' }, // Lunch break
  { period: 8, start: '13:40', end: '14:20' },
];

export default function StudentTimetable() {
  const { user } = useAuth();
  const { data: timetable, isLoading } = useStudentTimetable(user?.id);

  // Group timetable by weekday and period
  const groupedTimetable = WEEKDAYS.reduce((acc, day) => {
    acc[day.num] = TIME_SLOTS.reduce((periods, slot) => {
      const entry = timetable?.find(t => t.weekday === day.num && t.period_no === slot.period);
      periods[slot.period] = entry || null;
      return periods;
    }, {} as Record<number, any>);
    return acc;
  }, {} as Record<number, Record<number, any>>);

  // Get current day and period
  const getCurrentPeriod = () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7

    for (const slot of TIME_SLOTS) {
      if (currentTime >= slot.start && currentTime <= slot.end) {
        return { day: currentDay, period: slot.period };
      }
    }
    return null;
  };

  const currentPeriod = getCurrentPeriod();

  // Get today's schedule
  const todaySchedule = () => {
    const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
    return TIME_SLOTS.map(slot => ({
      ...slot,
      subject: groupedTimetable[today]?.[slot.period]
    })).filter(slot => slot.subject);
  };

  const todaysClasses = todaySchedule();

  // Get unique subjects and teachers from timetable
  const subjects = [...new Set(timetable?.map(t => t.subject) || [])];
  const teachers = [...new Set(timetable?.map(t => `${t.teachers.first_name} ${t.teachers.last_name}`) || [])];

  const getSubjectColor = (subject: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200',
    ];
    
    const hash = subject.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
        <p className="text-gray-600 mt-2">
          View your weekly schedule and today's classes.
        </p>
      </div>

      {/* Today's Classes */}
      {todaysClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Classes - {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysClasses.map((classInfo) => {
                const isCurrent = currentPeriod?.period === classInfo.period;
                const subject = classInfo.subject;
                
                return (
                  <div
                    key={classInfo.period}
                    className={`border rounded-lg p-4 ${
                      isCurrent ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getSubjectColor(subject.subject)}>
                        {subject.subject}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Period {classInfo.period}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{classInfo.start} - {classInfo.end}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{subject.teachers.first_name} {subject.teachers.last_name}</span>
                      </div>
                    </div>
                    
                    {isCurrent && (
                      <div className="mt-3 flex items-center gap-1 text-blue-600 text-sm font-medium">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        Current Class
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timetable?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Per week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects.length}</div>
            <p className="text-xs text-muted-foreground">Different subjects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">Different teachers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysClasses.length}</div>
            <p className="text-xs text-muted-foreground">Classes today</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Timetable */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {timetable && timetable.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-3 bg-gray-50 text-left font-medium">Period</th>
                    <th className="border p-3 bg-gray-50 text-left font-medium">Time</th>
                    {WEEKDAYS.map(day => (
                      <th key={day.num} className="border p-3 bg-gray-50 text-center font-medium min-w-32">
                        <div>{day.name}</div>
                        <div className="text-xs text-gray-500 font-normal">{day.short}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(slot => (
                    <tr key={slot.period}>
                      <td className="border p-3 text-center font-medium bg-gray-50">
                        {slot.period}
                      </td>
                      <td className="border p-3 text-sm text-gray-600 bg-gray-50">
                        {slot.start} - {slot.end}
                      </td>
                      {WEEKDAYS.map(day => {
                        const classInfo = groupedTimetable[day.num]?.[slot.period];
                        const isCurrent = currentPeriod?.day === day.num && currentPeriod?.period === slot.period;
                        
                        return (
                          <td
                            key={`${day.num}-${slot.period}`}
                            className={`border p-2 text-center ${
                              isCurrent ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                            }`}
                          >
                            {classInfo ? (
                              <div className="space-y-1">
                                <Badge 
                                  className={`${getSubjectColor(classInfo.subject)} text-xs`}
                                  variant="outline"
                                >
                                  {classInfo.subject}
                                </Badge>
                                <div className="text-xs text-gray-600">
                                  {classInfo.teachers.first_name} {classInfo.teachers.last_name}
                                </div>
                                {isCurrent && (
                                  <div className="text-xs text-blue-600 font-medium">
                                    • Current
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Free</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Timetable Available</h3>
              <p className="text-gray-600">
                Your class timetable hasn't been set up yet. Please contact your teacher or school administrator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject List */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {subjects.map((subject, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getSubjectColor(subject)}`}
                >
                  <div className="font-medium text-center">{subject}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-green-600">📚 Study Tips</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Review yesterday's lessons before class</li>
                <li>• Bring required textbooks and materials</li>
                <li>• Take notes during lectures</li>
                <li>• Ask questions if you don't understand</li>
                <li>• Complete homework on time</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 text-blue-600">🕐 Break Times</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Short Break: 10:00 - 10:20 AM</li>
                <li>• Lunch Break: 12:20 - 1:00 PM</li>
                <li>• Use breaks to rest and prepare for next class</li>
                <li>• Stay hydrated and eat healthy snacks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 