'use client';

import { useAuth } from '@/hooks/use-auth';
import { useChildren, useChildTimetable } from '@/hooks/use-parent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, Clock } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ParentTimetable() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  
  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);
  const { data: timetable, isLoading: timetableLoading } = useChildTimetable(selectedChild);

  // Set default selected child when children load
  if (children && children.length > 0 && !selectedChild) {
    setSelectedChild(children[0].id);
  }

  const currentChild = children?.find(child => child.id === selectedChild);

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
          <h1 className="text-3xl font-bold text-gray-900">Class Timetable</h1>
          <p className="text-gray-600 mt-2">
            View weekly class schedule for your children.
          </p>
        </div>
        
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

      {/* Timetable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timetableLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : timetable && timetable.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {weekdays.slice(0, 5).map((day, dayIndex) => {
                const dayNumber = dayIndex + 1;
                const dayClasses = timetable.filter(item => item.weekday === dayNumber);
                
                return (
                  <div key={day} className="space-y-2">
                    <h3 className="font-semibold text-center p-2 bg-gray-100 rounded">
                      {day}
                    </h3>
                    <div className="space-y-2">
                      {dayClasses.length > 0 ? (
                        dayClasses.map((item) => (
                          <div key={item.id} className="p-2 bg-blue-50 rounded border">
                            <div className="text-sm font-medium">{item.subject}</div>
                            <div className="text-xs text-gray-600">
                              Period {item.period_no}
                            </div>
                            {item.teachers && (
                              <div className="text-xs text-gray-500">
                                {item.teachers.first_name} {item.teachers.last_name}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-center text-gray-500 text-sm">
                          No classes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timetable Found</h3>
              <p className="text-gray-600">
                No timetable available for the selected child.
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