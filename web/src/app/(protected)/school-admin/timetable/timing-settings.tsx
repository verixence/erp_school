'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Coffee,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PeriodSetting {
  id?: string;
  day_of_week: number;
  period_number: number;
  period_name?: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  is_active: boolean;
}

interface DayConfig {
  day_of_week: number;
  day_name: string;
  periods: PeriodSetting[];
}

const WEEKDAYS = [
  { id: 0, name: 'Monday', short: 'Mon' },
  { id: 1, name: 'Tuesday', short: 'Tue' },
  { id: 2, name: 'Wednesday', short: 'Wed' },
  { id: 3, name: 'Thursday', short: 'Thu' },
  { id: 4, name: 'Friday', short: 'Fri' },
  { id: 5, name: 'Saturday', short: 'Sat' },
  { id: 6, name: 'Sunday', short: 'Sun' }
];

const GRADE_GROUPS = [
  { value: 'all', label: 'All Grades (Default)', description: 'Default timing for all grades' },
  { value: '1-5', label: 'Primary (1-5)', description: 'Grades 1 to 5' },
  { value: '6-10', label: 'Middle/High (6-10)', description: 'Grades 6 to 10' },
  { value: '11-12', label: 'Senior (11-12)', description: 'Grades 11 to 12' },
  { value: '1', label: 'Grade 1 Only', description: 'Grade 1 specific' },
  { value: '2', label: 'Grade 2 Only', description: 'Grade 2 specific' },
  { value: '3', label: 'Grade 3 Only', description: 'Grade 3 specific' },
  { value: '4', label: 'Grade 4 Only', description: 'Grade 4 specific' },
  { value: '5', label: 'Grade 5 Only', description: 'Grade 5 specific' },
  { value: '6', label: 'Grade 6 Only', description: 'Grade 6 specific' },
  { value: '7', label: 'Grade 7 Only', description: 'Grade 7 specific' },
  { value: '8', label: 'Grade 8 Only', description: 'Grade 8 specific' },
  { value: '9', label: 'Grade 9 Only', description: 'Grade 9 specific' },
  { value: '10', label: 'Grade 10 Only', description: 'Grade 10 specific' },
  { value: '11', label: 'Grade 11 Only', description: 'Grade 11 specific' },
  { value: '12', label: 'Grade 12 Only', description: 'Grade 12 specific' }
];

export default function TimingSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGradeGroup, setSelectedGradeGroup] = useState('all');
  const [editingPeriod, setEditingPeriod] = useState<PeriodSetting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkEditDay, setBulkEditDay] = useState<number | null>(null);

  // Form state for period editing
  const [periodForm, setPeriodForm] = useState({
    day_of_week: 0,
    period_number: 1,
    period_name: '',
    start_time: '08:00',
    end_time: '08:45',
    is_break: false
  });

  // Fetch current period settings
  const { data: periodSettings = [], isLoading } = useQuery({
    queryKey: ['school-period-settings', user?.school_id, selectedGradeGroup],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase
        .from('school_period_settings')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('grade_group', selectedGradeGroup)
        .eq('is_active', true)
        .order('day_of_week')
        .order('period_number');

      if (error) throw error;
      return data as PeriodSetting[];
    },
    enabled: !!user?.school_id,
  });

  // Group periods by day
  const dayConfigs: DayConfig[] = WEEKDAYS.map(day => ({
    day_of_week: day.id,
    day_name: day.name,
    periods: periodSettings.filter(p => p.day_of_week === day.id)
  })).filter(day => day.periods.length > 0);

  // Save period mutation
  const savePeriodMutation = useMutation({
    mutationFn: async (period: Omit<PeriodSetting, 'id'>) => {
      if (editingPeriod?.id) {
        // Update existing
        const { error } = await supabase
          .from('school_period_settings')
          .update(period)
          .eq('id', editingPeriod.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('school_period_settings')
          .insert({
            ...period,
            school_id: user?.school_id,
            grade_group: selectedGradeGroup
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-period-settings'] });
      setIsDialogOpen(false);
      setEditingPeriod(null);
      toast.success('Period settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  // Delete period mutation
  const deletePeriodMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from('school_period_settings')
        .delete()
        .eq('id', periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-period-settings'] });
      toast.success('Period deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  // Bulk operations
  const createStandardDay = async (dayOfWeek: number) => {
    const standardPeriods = [];
    
    // 8 periods with lunch break at period 4
    for (let i = 1; i <= 8; i++) {
      const isLunchBreak = i === 4;
      const startHour = 8 + Math.floor((i - 1) * 0.75); // 45-minute periods
      const startMinute = ((i - 1) * 45) % 60;
      const endMinute = (i * 45) % 60;
      const endHour = 8 + Math.floor((i * 45) / 60);

      standardPeriods.push({
        school_id: user?.school_id,
        grade_group: selectedGradeGroup,
        day_of_week: dayOfWeek,
        period_number: i,
        period_name: isLunchBreak ? 'Lunch Break' : `Period ${i}`,
        start_time: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
        end_time: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
        is_break: isLunchBreak,
        is_active: true
      });
    }

    const { error } = await supabase
      .from('school_period_settings')
      .insert(standardPeriods);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['school-period-settings'] });
    toast.success(`Standard day created for ${WEEKDAYS[dayOfWeek].name}`);
  };

  const handleEditPeriod = (period: PeriodSetting) => {
    setEditingPeriod(period);
    setPeriodForm({
      day_of_week: period.day_of_week,
      period_number: period.period_number,
      period_name: period.period_name || '',
      start_time: period.start_time,
      end_time: period.end_time,
      is_break: period.is_break
    });
    setIsDialogOpen(true);
  };

  const handleAddPeriod = (dayOfWeek: number) => {
    const existingPeriods = periodSettings.filter(p => p.day_of_week === dayOfWeek);
    const nextPeriodNumber = Math.max(0, ...existingPeriods.map(p => p.period_number)) + 1;
    
    setEditingPeriod(null);
    setPeriodForm({
      day_of_week: dayOfWeek,
      period_number: nextPeriodNumber,
      period_name: '',
      start_time: '08:00',
      end_time: '08:45',
      is_break: false
    });
    setIsDialogOpen(true);
  };

  const handleSavePeriod = () => {
    savePeriodMutation.mutate({
      day_of_week: periodForm.day_of_week,
      period_number: periodForm.period_number,
      period_name: periodForm.period_name || undefined,
      start_time: periodForm.start_time,
      end_time: periodForm.end_time,
      is_break: periodForm.is_break,
      is_active: true
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}min`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            School Timing Settings
          </h2>
          <p className="text-gray-600">Configure periods, timings, and breaks for your school</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="grade-group" className="font-medium">Configure for:</Label>
          <select
            id="grade-group"
            value={selectedGradeGroup}
            onChange={(e) => setSelectedGradeGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md min-w-[200px]"
          >
            {GRADE_GROUPS.map(group => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grade Group Info */}
      {selectedGradeGroup !== 'all' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Grade-Specific Configuration</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You're configuring timing for{' '}
                  <strong>{GRADE_GROUPS.find(g => g.value === selectedGradeGroup)?.label}</strong>.
                  These settings will override the default "All Grades" configuration for the selected grade(s).
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Priority: Exact Grade &gt; Grade Group &gt; All Grades (Default)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Days Configuration */}
      {dayConfigs.length > 0 ? (
        <div className="grid gap-6">
          {dayConfigs.map((dayConfig) => (
            <Card key={dayConfig.day_of_week}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {dayConfig.day_name}
                    <Badge variant="outline">
                      {dayConfig.periods.length} periods
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddPeriod(dayConfig.day_of_week)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Period
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {dayConfig.periods.map((period) => (
                    <div
                      key={`${period.day_of_week}-${period.period_number}`}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                        period.is_break 
                          ? 'border-orange-200 bg-orange-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {period.is_break ? (
                          <Coffee className="w-4 h-4 text-orange-600" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        )}
                        <div>
                          <div className="font-medium">
                            {period.period_name || `Period ${period.period_number}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatTime(period.start_time)} - {formatTime(period.end_time)}
                            <span className="ml-2 text-xs">
                              ({calculateDuration(period.start_time, period.end_time)})
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {period.is_break && (
                          <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                            Break
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditPeriod(period)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => period.id && deletePeriodMutation.mutate(period.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No timing settings found</h3>
            <p className="text-gray-600 mb-4">Configure your school's period timings to get started</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {WEEKDAYS.slice(0, 6).map((day) => (
                <Button
                  key={day.id}
                  variant="outline"
                  onClick={() => createStandardDay(day.id)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Setup {day.short}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Edit Period' : 'Add New Period'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="day">Day</Label>
                <select
                  id="day"
                  value={periodForm.day_of_week}
                  onChange={(e) => setPeriodForm({ ...periodForm, day_of_week: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {WEEKDAYS.map(day => (
                    <option key={day.id} value={day.id}>{day.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="period_number">Period Number</Label>
                <Input
                  id="period_number"
                  type="number"
                  min="1"
                  value={periodForm.period_number || ''}
                  onChange={(e) => setPeriodForm({ ...periodForm, period_number: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="period_name">Period Name (Optional)</Label>
              <Input
                id="period_name"
                value={periodForm.period_name}
                onChange={(e) => setPeriodForm({ ...periodForm, period_name: e.target.value })}
                placeholder="e.g., Lunch Break, Assembly"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={periodForm.start_time}
                  onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={periodForm.end_time}
                  onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_break"
                type="checkbox"
                checked={periodForm.is_break}
                onChange={(e) => setPeriodForm({ ...periodForm, is_break: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_break">This is a break period</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSavePeriod}
                disabled={savePeriodMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {savePeriodMutation.isPending ? 'Saving...' : 'Save Period'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 