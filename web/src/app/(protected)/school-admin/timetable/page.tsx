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
  Plus,
  Wand2,
  Copy,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import TimingSettings from './timing-settings';
import TeacherAnalytics from './teacher-analytics';

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
  const [activeTab, setActiveTab] = useState<'timetable' | 'timing-settings' | 'analytics'>('timetable');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showAutofillDialog, setShowAutofillDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyForm, setCopyForm] = useState({
    sourceSection: '',
    copyTeachers: true
  });

  // Form state for cell editing
  const [cellForm, setCellForm] = useState({
    subject: '',
    teacher_id: ''
  });

  // Get school period configuration
  const { data: periodConfig = [] } = useQuery({
    queryKey: ['school-period-config', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase.rpc('get_school_period_config', {
        p_school_id: user.school_id
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id,
  });

  // Dynamic weekdays and periods based on school configuration
  const weekdays = periodConfig.length > 0 
    ? periodConfig.map((config: any) => ({
        id: config.day_of_week,
        name: config.day_name
      }))
    : [
        { id: 0, name: 'Monday' },
        { id: 1, name: 'Tuesday' },
        { id: 2, name: 'Wednesday' },
        { id: 3, name: 'Thursday' },
        { id: 4, name: 'Friday' },
        { id: 5, name: 'Saturday' }
      ];

  const periodNumbers = periodConfig.length > 0 
    ? Array.from({ length: Math.max(...periodConfig.map((c: any) => 
        Math.max(...c.periods.map((p: any) => p.period_number))
      )) }, (_, i) => i + 1)
    : Array.from({ length: 8 }, (_, i) => i + 1);

  // Get period details for display
  const getPeriodDetails = (dayOfWeek: number, periodNumber: number) => {
    const dayConfig = periodConfig.find((c: any) => c.day_of_week === dayOfWeek);
    if (!dayConfig) return null;
    
    const period = dayConfig.periods.find((p: any) => p.period_number === periodNumber);
    return period || null;
  };

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

  // Auto-fill timetable mutation
  const autofillMutation = useMutation({
    mutationFn: async ({ sectionId, replaceExisting }: { sectionId: string; replaceExisting: boolean }) => {
      const response = await fetch('/api/timetable/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          replace_existing: replaceExisting
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to auto-fill timetable');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['periods', selectedSection] });
      toast.success(`Auto-fill completed! ${data.periods_filled}/${data.total_periods} periods filled (${data.success_rate}% success rate)`);
      
      if (data.unassigned_subjects && data.unassigned_subjects.length > 0) {
        toast.error(`Some subjects couldn't be assigned: ${data.unassigned_subjects.join(', ')}`);
      }
      
      setShowAutofillDialog(false);
    },
    onError: (error: any) => {
      toast.error(`Auto-fill failed: ${error.message}`);
      setShowAutofillDialog(false);
    }
  });

  // Copy timetable mutation
  const copyMutation = useMutation({
    mutationFn: async ({ fromSectionId, toSectionId, copyTeachers }: { fromSectionId: string; toSectionId: string; copyTeachers: boolean }) => {
      const response = await fetch('/api/timetable/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_section_id: fromSectionId,
          to_section_id: toSectionId,
          copy_teachers: copyTeachers
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy timetable');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['periods', selectedSection] });
      toast.success(`Timetable copied successfully! ${data.periods_copied} periods copied.`);
      setShowCopyDialog(false);
    },
    onError: (error: any) => {
      toast.error(`Copy failed: ${error.message}`);
      setShowCopyDialog(false);
    }
  });

  const handleAutoFill = (replaceExisting: boolean) => {
    if (!selectedSection) return;
    
    autofillMutation.mutate({ 
      sectionId: selectedSection, 
      replaceExisting 
    });
  };

  const handleCopyTimetable = (fromSectionId: string, copyTeachers: boolean) => {
    if (!selectedSection) return;
    
    copyMutation.mutate({
      fromSectionId,
      toSectionId: selectedSection,
      copyTeachers
    });
  };

  // Reset copy form when dialog closes
  useEffect(() => {
    if (!showCopyDialog) {
      setCopyForm({ sourceSection: '', copyTeachers: true });
    }
  }, [showCopyDialog]);

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
            
            {activeTab === 'timetable' && (
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
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('timetable')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timetable'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Timetable Grid
              </button>
              <button
                onClick={() => setActiveTab('timing-settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timing-settings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Timing Settings
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Teacher Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'timetable' && (
          <>
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
                <div className="flex items-center gap-3">
                  {periodsLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  )}
                  {hasValidPeriods && (
                    <>
                      <Button
                        onClick={() => setShowAutofillDialog(true)}
                        disabled={autofillMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Wand2 className="w-4 h-4 mr-1" />
                        Auto-Fill
                      </Button>
                      
                      <Button
                        onClick={() => setShowCopyDialog(true)}
                        disabled={copyMutation.isPending}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy From
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weekdays.length > 0 && periodNumbers.length > 0 ? (
                <div className="space-y-4">
                  {periodConfig.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-900">No Period Configuration Found</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Using default 8-period, 6-day schedule. To customize periods and timings for your school, 
                            go to the <strong>Timing Settings</strong> tab.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-3 text-left font-semibold">
                            Period / Day
                          </th>
                          {weekdays.map((day: any) => (
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
                          {weekdays.map((day: any) => {
                            const cellPeriod = getPeriodForCell(day.id, period);
                            const periodDetails = getPeriodDetails(day.id, period);
                            const isBreakPeriod = periodDetails?.is_break;
                            
                            return (
                              <td
                                key={`${day.id}-${period}`}
                                className={`border border-gray-300 p-2 cursor-pointer transition-colors min-w-[120px] ${
                                  isBreakPeriod 
                                    ? 'bg-orange-50 border-orange-200' 
                                    : 'hover:bg-gray-50'
                                }`}
                                onClick={() => !isBreakPeriod && handleCellClick(day.id, period)}
                              >
                                {isBreakPeriod ? (
                                  <div className="text-center text-orange-600 text-sm h-8 flex items-center justify-center">
                                    <div>
                                      <div className="font-medium">{periodDetails.period_name || 'Break'}</div>
                                      <div className="text-xs">{periodDetails.start_time} - {periodDetails.end_time}</div>
                                    </div>
                                  </div>
                                ) : cellPeriod && cellPeriod.subject ? (
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
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No timetable found</h3>
                  <p className="text-gray-600 mb-4">Create a new timetable for this section to get started</p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={handleCreateTimetable}
                      disabled={createTimetableMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createTimetableMutation.isPending ? 'Creating...' : 'Create Timetable'}
                    </Button>
                    
                    <Button
                      onClick={() => setShowAutofillDialog(true)}
                      disabled={autofillMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Auto-Fill
                    </Button>
                    
                    <Button
                      onClick={() => setShowCopyDialog(true)}
                      disabled={copyMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy From
                    </Button>
                  </div>
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
                    Edit Period - {editingCell && weekdays.find((d: any) => d.id === editingCell.weekday)?.name} Period {editingCell?.period_no}
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

            {/* Auto-Fill Dialog */}
            <Dialog open={showAutofillDialog} onOpenChange={setShowAutofillDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-green-600" />
                    Auto-Fill Timetable
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">How Auto-Fill Works</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          The system will automatically assign subjects and teachers based on:
                        </p>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1">
                          <li>• Subject requirements for this grade</li>
                          <li>• Teacher availability and load limits</li>
                          <li>• School's period configuration</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {hasValidPeriods && (
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-900">Existing Timetable Detected</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            This section already has a timetable. Choose how to proceed:
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAutoFill(false)}
                      disabled={autofillMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {autofillMutation.isPending ? 'Filling...' : hasValidPeriods ? 'Fill Empty Slots' : 'Auto-Fill'}
                    </Button>
                    
                    {hasValidPeriods && (
                      <Button
                        onClick={() => handleAutoFill(true)}
                        disabled={autofillMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        {autofillMutation.isPending ? 'Replacing...' : 'Replace All'}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Copy Timetable Dialog */}
            <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Copy className="w-5 h-5 text-purple-600" />
                    Copy Timetable
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Copy from Another Section</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Select a section to copy its timetable structure to the current section.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="source-section">Source Section</Label>
                    <select
                      id="source-section"
                      value={copyForm.sourceSection}
                      onChange={(e) => setCopyForm({ ...copyForm, sourceSection: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md mt-1"
                    >
                      <option value="">Select section to copy from</option>
                      {sections
                        .filter(section => section.id !== selectedSection)
                        .map((section) => (
                          <option key={section.id} value={section.id}>
                            Grade {section.grade} - Section {section.section}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="copy-teachers"
                      checked={copyForm.copyTeachers}
                      onChange={(e) => setCopyForm({ ...copyForm, copyTeachers: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="copy-teachers" className="text-sm">
                      Copy teacher assignments (recommended)
                    </Label>
                  </div>

                  {hasValidPeriods && (
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-700">
                            This will replace the current timetable for this section.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCopyDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (copyForm.sourceSection) {
                          handleCopyTimetable(copyForm.sourceSection, copyForm.copyTeachers);
                        }
                      }}
                      disabled={!copyForm.sourceSection || copyMutation.isPending}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {copyMutation.isPending ? 'Copying...' : 'Copy Timetable'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Timing Settings Tab */}
        {activeTab === 'timing-settings' && (
          <TimingSettings />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <TeacherAnalytics />
        )}
      </div>
    </div>
  );
} 