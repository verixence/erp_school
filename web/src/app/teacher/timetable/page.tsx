'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

interface Timetable {
  id: string;
  school_id: string;
  section: string;
  weekday: number;
  period_no: number;
  subject: string;
  teacher_id: string;
  start_time?: string;
  end_time?: string;
  is_break?: boolean;
  venue?: string;
}

interface TimetableItemProps {
  timetable: Timetable;
}

function TimetableItem({ timetable }: TimetableItemProps) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekday = weekdays[timetable.weekday - 1];
  
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {timetable.subject}
            </h3>
            <p className="text-sm text-gray-600">
              {timetable.section} • Period {timetable.period_no}
            </p>
          </div>
          <div className="bg-blue-100 px-3 py-1 rounded">
            <span className="text-blue-800 font-medium text-sm">{weekday}</span>
          </div>
        </div>
        
        {(timetable.start_time || timetable.end_time) && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-1" />
            {timetable.start_time && timetable.end_time
              ? `${timetable.start_time} - ${timetable.end_time}`
              : timetable.start_time || timetable.end_time}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeacherTimetable() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const { data: timetable = [], isLoading: timetableLoading } = useQuery({
    queryKey: ['teacher-timetable', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          sections!inner(id, grade, grade_text, section, school_id)
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id)
        .order('weekday', { ascending: true })
        .order('period_no', { ascending: true });

      if (error) throw error;

      // Transform data to match expected format
      return data.map((period: any) => ({
        ...period,
        section: `Grade ${period.sections.grade_text || period.sections.grade} ${period.sections.section}`
      })) as Timetable[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.replace('/not-authorized');
    }
  }, [user, isLoading, router]);

  if (isLoading || timetableLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'teacher') {
    return null;
  }

  // Group timetable by weekday and period
  const timetableGrid: Record<string, Timetable> = {};
  timetable.forEach(item => {
    const key = `${item.weekday}-${item.period_no}`;
    timetableGrid[key] = item;
  });

  // Get unique weekdays and periods
  const weekdays = [
    { day: 1, name: 'Monday', short: 'Mon' },
    { day: 2, name: 'Tuesday', short: 'Tue' },
    { day: 3, name: 'Wednesday', short: 'Wed' },
    { day: 4, name: 'Thursday', short: 'Thu' },
    { day: 5, name: 'Friday', short: 'Fri' },
    { day: 6, name: 'Saturday', short: 'Sat' },
    { day: 7, name: 'Sunday', short: 'Sun' },
  ];

  // Get max period number
  const maxPeriod = Math.max(...timetable.map(t => t.period_no), 0);
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  // Get current day for highlighting
  const currentDay = new Date().getDay() === 0 ? 7 : new Date().getDay();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Weekly Schedule</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {timetable.length > 0 ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Calendar Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Header */}
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium text-muted-foreground border-r">
                        Period
                      </th>
                      {weekdays.map(({ day, name, short }) => (
                        <th 
                          key={day} 
                          className={`p-4 text-center font-medium border-r min-w-[140px] ${
                            day === currentDay 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-muted-foreground'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="hidden sm:block">{name}</span>
                            <span className="block sm:hidden">{short}</span>
                            {day === currentDay && (
                              <span className="text-xs font-normal text-primary/80">Today</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  {/* Body */}
                  <tbody>
                    {periods.map(period => (
                      <tr key={period} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 border-r bg-muted/20 font-medium text-center">
                          <div className="flex flex-col">
                            <span className="text-sm">Period {period}</span>
                            <span className="text-xs text-muted-foreground">
                              {/* You could add time slots here if available */}
                            </span>
                          </div>
                        </td>
                        {weekdays.map(({ day }) => {
                          const periodData = timetableGrid[`${day}-${period}`];
                          
                          return (
                            <td 
                              key={`${day}-${period}`} 
                              className={`p-2 border-r align-top ${
                                day === currentDay ? 'bg-primary/5' : ''
                              }`}
                            >
                              {periodData ? (
                                <div className="h-full min-h-[80px]">
                                  <div className={`
                                    p-3 rounded-lg h-full border-l-4 transition-all hover:shadow-md
                                    ${periodData.is_break 
                                      ? 'bg-orange-50 border-orange-400 hover:bg-orange-100' 
                                      : 'bg-blue-50 border-blue-400 hover:bg-blue-100'
                                    }
                                  `}>
                                    <div className="space-y-1">
                                      <h4 className={`
                                        text-sm font-medium leading-tight
                                        ${periodData.is_break ? 'text-orange-800' : 'text-blue-800'}
                                      `}>
                                        {periodData.is_break ? 'Break' : periodData.subject}
                                      </h4>
                                      
                                      {!periodData.is_break && (
                                        <>
                                          <p className="text-xs text-blue-600 font-medium">
                                            {periodData.section}
                                          </p>
                                          
                                          {(periodData.start_time || periodData.end_time) && (
                                            <div className="flex items-center text-xs text-blue-600">
                                              <Clock className="w-3 h-3 mr-1" />
                                              {periodData.start_time && periodData.end_time
                                                ? `${periodData.start_time} - ${periodData.end_time}`
                                                : periodData.start_time || periodData.end_time}
                                            </div>
                                          )}
                                          
                                          {periodData.venue && (
                                            <p className="text-xs text-blue-600 truncate">
                                              📍 {periodData.venue}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-[80px] flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">Free</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Timetable Data</h3>
                <p className="text-sm text-muted-foreground">
                  Your class schedule will appear here once it's been set up by the administration.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Legend */}
        {timetable.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-3">Legend</h4>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-400 rounded"></div>
                  <span>Class Period</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-50 border-l-4 border-orange-400 rounded"></div>
                  <span>Break Period</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary/10 rounded"></div>
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 