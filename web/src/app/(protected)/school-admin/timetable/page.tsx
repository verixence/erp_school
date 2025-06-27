'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Clock, 
  Save, 
  Grid,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Section {
  id: string;
  grade: number;
  section: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}

interface Period {
  id?: string;
  section_id: string;
  weekday: number;
  period_no: number;
  subject: string;
  teacher_id: string | null;
  teacher_name?: string;
}

interface TimetableCell {
  weekday: number;
  period_no: number;
  subject?: string;
  teacher_id?: string | null;
  teacher_name?: string;
}

export default function TimetablePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [editingCell, setEditingCell] = useState<TimetableCell | null>(null);
  const [timetableData, setTimetableData] = useState<Period[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Form state for cell editing
  const [cellForm, setCellForm] = useState({
    subject: '',
    teacher_id: ''
  });

  const weekdays = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' }
  ];

  const periodNumbers = Array.from({ length: 8 }, (_, i) => i + 1);

  const subjects = [
    'Mathematics', 'English', 'Science', 'Social Studies', 'Hindi',
    'Physical Education', 'Computer Science', 'Art', 'Music', 'Library'
  ];

  // Fetch sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase
        .from('sections')
        .select('id, grade, section')
        .eq('school_id', user.school_id)
        .order('grade', { ascending: true })
        .order('section', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Auto-select first section when sections load
  useEffect(() => {
    if (!isInitialized && sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0].id);
      setIsInitialized(true);
    }
  }, [sections, selectedSection, isInitialized]);

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('school_id', user.school_id)
        .eq('role', 'teacher')
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Fetch timetable for selected section
  const { data: periodData = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['periods', selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      
      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          teacher:users!periods_teacher_id_fkey(first_name, last_name)
        `)
        .eq('section_id', selectedSection);

      if (error) throw error;

      return data.map((period: any) => ({
        ...period,
        teacher_name: period.teacher 
          ? `${period.teacher.first_name} ${period.teacher.last_name}`
          : undefined
      }));
    },
    enabled: !!selectedSection,
  });

  // Safe initialization of timetable data - only update when periodData actually changes
  useEffect(() => {
    if (selectedSection && periodData !== undefined) {
      setTimetableData(periodData);
    }
  }, [selectedSection, periodData]);

  // Save periods mutation - FIXED: Removed circular refetch
  const savePeriodsMutation = useMutation({
    mutationFn: async (periodsToSave: Period[]) => {
      // Delete existing periods for this section
      await supabase
        .from('periods')
        .delete()
        .eq('section_id', selectedSection);

      // Insert new periods
      const validPeriods = periodsToSave.filter(p => p.subject && p.subject.trim());
      
      if (validPeriods.length > 0) {
        const { error } = await supabase
          .from('periods')
          .insert(validPeriods.map(period => ({
            section_id: selectedSection,
            weekday: period.weekday,
            period_no: period.period_no,
            subject: period.subject,
            teacher_id: period.teacher_id || null
          })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      // FIXED: Only invalidate queries, don't manually refetch
      queryClient.invalidateQueries({ queryKey: ['periods', selectedSection] });
      toast.success('Timetable saved successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save timetable');
    },
  });

  // Create empty timetable mutation
  const createTimetableMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSection) throw new Error('No section selected');
      
      // Create a basic timetable structure with empty periods
      const emptyPeriods: Omit<Period, 'id'>[] = [];
      
      // Add some default periods for demonstration
      for (let day = 1; day <= 5; day++) { // Monday to Friday
        for (let period = 1; period <= 6; period++) {
          emptyPeriods.push({
            section_id: selectedSection,
            weekday: day,
            period_no: period,
            subject: '',
            teacher_id: null
          });
        }
      }

      setTimetableData(emptyPeriods);
      toast.success('Empty timetable created! Click on cells to add subjects.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create timetable');
    },
  });

  const handleCellClick = useCallback((weekday: number, period_no: number) => {
    const existingPeriod = timetableData.find(
      p => p.weekday === weekday && p.period_no === period_no
    );

    setEditingCell({ weekday, period_no });
    setCellForm({
      subject: existingPeriod?.subject || '',
      teacher_id: existingPeriod?.teacher_id || ''
    });
  }, [timetableData]);

  const handleCellSave = useCallback(() => {
    if (!editingCell) return;

    setTimetableData(prevData => {
      const updatedData = prevData.filter(
        p => !(p.weekday === editingCell.weekday && p.period_no === editingCell.period_no)
      );

      if (cellForm.subject.trim()) {
        const selectedTeacher = teachers.find(t => t.id === cellForm.teacher_id);
        updatedData.push({
          section_id: selectedSection,
          weekday: editingCell.weekday,
          period_no: editingCell.period_no,
          subject: cellForm.subject,
          teacher_id: cellForm.teacher_id || null,
          teacher_name: selectedTeacher 
            ? `${selectedTeacher.first_name} ${selectedTeacher.last_name}`
            : undefined
        });
      }

      return updatedData.sort((a, b) => {
        if (a.weekday !== b.weekday) return a.weekday - b.weekday;
        return a.period_no - b.period_no;
      });
    });

    setEditingCell(null);
  }, [editingCell, cellForm, teachers, selectedSection]);

  const handleSaveTimetable = useCallback(() => {
    if (!selectedSection) {
      toast.error('Please select a section first');
      return;
    }
    savePeriodsMutation.mutate(timetableData);
  }, [selectedSection, timetableData, savePeriodsMutation]);

  const handleCreateTimetable = useCallback(() => {
    createTimetableMutation.mutate();
  }, [createTimetableMutation]);

  const getPeriodForCell = useCallback((weekday: number, period_no: number): Period | undefined => {
    return timetableData.find(p => p.weekday === weekday && p.period_no === period_no);
  }, [timetableData]);

  const selectedSectionData = sections.find(s => s.id === selectedSection);
  const hasTimetableData = timetableData.length > 0;
  const hasValidPeriods = timetableData.some(p => p.subject && p.subject.trim());

  if (sectionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Timetable Management</h1>
              <p className="mt-2 text-gray-600">Create and manage class schedules</p>
            </div>
            
            <div className="flex gap-2">
              {selectedSection && !hasValidPeriods && (
                <Button 
                  onClick={handleCreateTimetable}
                  disabled={createTimetableMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Timetable
                </Button>
              )}
              
              <Button 
                onClick={handleSaveTimetable}
                disabled={!selectedSection || !hasValidPeriods || savePeriodsMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {savePeriodsMutation.isPending ? 'Saving...' : 'Save Timetable'}
              </Button>
            </div>
          </div>
        </div>

        {/* Section Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Section</CardTitle>
          </CardHeader>
          <CardContent>
            {sections.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sections.map((section) => (
                  <motion.button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedSection === section.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-center">
                      <div className="font-semibold">Grade {section.grade}</div>
                      <div className="text-sm text-gray-600">Section {section.section}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No sections found. Please create sections first.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timetable Grid */}
        {selectedSection ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Grid className="w-5 h-5 mr-2" />
                  Timetable Grid
                  {selectedSectionData && (
                    <span className="ml-2 text-base font-normal text-gray-600">
                      - Grade {selectedSectionData.grade} Section {selectedSectionData.section}
                    </span>
                  )}
                </div>
                {periodsLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasValidPeriods || hasTimetableData ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-3 text-left font-semibold">
                          Period / Day
                        </th>
                        {weekdays.map((day) => (
                          <th key={day.id} className="border border-gray-300 p-3 text-center font-semibold">
                            {day.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periodNumbers.map((period: number) => (
                        <tr key={period}>
                          <td className="border border-gray-300 p-3 font-medium bg-gray-50">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              Period {period}
                            </div>
                          </td>
                          {weekdays.map((day) => {
                            const cellPeriod = getPeriodForCell(day.id, period);
                            return (
                              <td
                                key={`${day.id}-${period}`}
                                className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-50 transition-colors min-w-[120px]"
                                onClick={() => handleCellClick(day.id, period)}
                              >
                                {cellPeriod && cellPeriod.subject ? (
                                  <div className="text-center">
                                    <div className="font-medium text-sm text-gray-900">{cellPeriod.subject}</div>
                                    {cellPeriod.teacher_name && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {cellPeriod.teacher_name}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-400 text-sm h-8 flex items-center justify-center">
                                    Click to add
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
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No timetable found</h3>
                  <p className="text-gray-600 mb-4">Create a new timetable for this section to get started</p>
                  <Button 
                    onClick={handleCreateTimetable}
                    disabled={createTimetableMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createTimetableMutation.isPending ? 'Creating...' : 'Create Timetable'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a section to start</h3>
            <p className="text-gray-600">Choose a section above to create or edit its timetable</p>
          </div>
        )}

        {/* Cell Edit Dialog */}
        <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Edit Period - {editingCell && weekdays.find(d => d.id === editingCell.weekday)?.name} Period {editingCell?.period_no}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <select
                  id="subject"
                  value={cellForm.subject}
                  onChange={(e) => setCellForm({ ...cellForm, subject: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="teacher">Teacher</Label>
                <select
                  id="teacher"
                  value={cellForm.teacher_id}
                  onChange={(e) => setCellForm({ ...cellForm, teacher_id: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Teacher (Optional)</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingCell(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCellSave}>
                  Save Period
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 