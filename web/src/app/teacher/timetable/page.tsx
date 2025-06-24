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
        .from('timetables')
        .select('*')
        .eq('teacher_id', user.id)
        .order('weekday', { ascending: true })
        .order('period_no', { ascending: true });

      if (error) throw error;
      return data as Timetable[];
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

  // Group timetable by weekday
  const groupedTimetable = timetable.reduce((acc, item) => {
    if (!acc[item.weekday]) {
      acc[item.weekday] = [];
    }
    acc[item.weekday].push(item);
    return acc;
  }, {} as Record<number, Timetable[]>);

  const weekdays = [
    { day: 1, name: 'Monday' },
    { day: 2, name: 'Tuesday' },
    { day: 3, name: 'Wednesday' },
    { day: 4, name: 'Thursday' },
    { day: 5, name: 'Friday' },
    { day: 6, name: 'Saturday' },
    { day: 7, name: 'Sunday' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">My Timetable</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {timetable.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {weekdays.map(({ day, name }) => {
              const dayClasses = groupedTimetable[day] || [];
              
              if (dayClasses.length === 0) return null;
              
              return (
                <div key={day}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{name}</h2>
                  {dayClasses
                    .sort((a, b) => a.period_no - b.period_no)
                    .map(item => (
                      <TimetableItem key={`${item.id}-${item.period_no}`} timetable={item} />
                    ))}
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timetable data</h3>
              <p className="text-gray-600">Your class schedule will appear here once it's been set up.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 