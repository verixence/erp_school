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
  AlertTriangle,
  Copy,
  Wand2,
  CheckCircle,
  Users,
  Target,
  Globe,
  ChevronRight
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

interface ConfigurationSummary {
  gradeGroup: string;
  totalDays: number;
  totalPeriods: number;
  breaks: number;
  startTime?: string;
  endTime?: string;
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
  { value: 'all', label: 'All Grades (Default)', description: 'Default timing for all grades', icon: Globe },
  { value: '1-5', label: 'Primary (1-5)', description: 'Grades 1 to 5', icon: Users },
  { value: '6-10', label: 'Middle/High (6-10)', description: 'Grades 6 to 10', icon: Users },
  { value: '11-12', label: 'Senior (11-12)', description: 'Grades 11 to 12', icon: Users },
  { value: '1', label: 'Grade 1', description: 'Grade 1 specific', icon: Target },
  { value: '2', label: 'Grade 2', description: 'Grade 2 specific', icon: Target },
  { value: '3', label: 'Grade 3', description: 'Grade 3 specific', icon: Target },
  { value: '4', label: 'Grade 4', description: 'Grade 4 specific', icon: Target },
  { value: '5', label: 'Grade 5', description: 'Grade 5 specific', icon: Target },
  { value: '6', label: 'Grade 6', description: 'Grade 6 specific', icon: Target },
  { value: '7', label: 'Grade 7', description: 'Grade 7 specific', icon: Target },
  { value: '8', label: 'Grade 8', description: 'Grade 8 specific', icon: Target },
  { value: '9', label: 'Grade 9', description: 'Grade 9 specific', icon: Target },
  { value: '10', label: 'Grade 10', description: 'Grade 10 specific', icon: Target },
  { value: '11', label: 'Grade 11', description: 'Grade 11 specific', icon: Target },
  { value: '12', label: 'Grade 12', description: 'Grade 12 specific', icon: Target }
];

const PRESET_TEMPLATES = [
  {
    id: 'standard-8',
    name: 'Standard 8-Period Day',
    description: '8 periods with lunch break',
    periods: 8,
    breaks: 1,
    startTime: '08:00',
    endTime: '15:30'
  },
  {
    id: 'compact-6',
    name: 'Compact 6-Period Day',
    description: '6 periods with short break',
    periods: 6,
    breaks: 1,
    startTime: '08:30',
    endTime: '14:00'
  },
  {
    id: 'extended-10',
    name: 'Extended 10-Period Day',
    description: '10 periods with multiple breaks',
    periods: 10,
    breaks: 2,
    startTime: '07:30',
    endTime: '16:30'
  }
];

export default function TimingSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGradeGroup, setSelectedGradeGroup] = useState('all');
  const [editingPeriod, setEditingPeriod] = useState<PeriodSetting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showConfigSelector, setShowConfigSelector] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    template: '',
    workingDays: [0, 1, 2, 3, 4], // Monday to Friday
    customPeriods: 8,
    customStartTime: '08:00',
    customBreaks: [{ period: 4, name: 'Lunch Break', duration: 30 }]
  });

  // Form state for period editing
  const [periodForm, setPeriodForm] = useState({
    day_of_week: 0,
    period_number: 1,
    period_name: '',
    start_time: '08:00',
    end_time: '08:45',
    is_break: false
  });

  // Fetch existing configurations summary
  const { data: configSummary = [] } = useQuery({
    queryKey: ['config-summary', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase
        .from('school_period_settings')
        .select('grade_group, day_of_week, period_number, start_time, end_time, is_break')
        .eq('school_id', user.school_id)
        .eq('is_active', true);

      if (error) throw error;

      // Group by grade_group and calculate summary
      const summary: ConfigurationSummary[] = [];
      const grouped = data.reduce((acc: any, item) => {
        const key = item.grade_group;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      for (const [gradeGroup, periods] of Object.entries(grouped) as [string, any[]][]) {
        const uniqueDays = new Set(periods.map(p => p.day_of_week)).size;
        const totalPeriods = periods.length;
        const breaks = periods.filter(p => p.is_break).length;
                 const times = periods.map(p => [p.start_time, p.end_time]).flat().filter(Boolean);
         const startTime = times.length > 0 ? times.sort()[0] : undefined;
         const endTime = times.length > 0 ? times.sort().reverse()[0] : undefined;

        summary.push({
          gradeGroup,
          totalDays: uniqueDays,
          totalPeriods,
          breaks,
          startTime,
          endTime
        });
      }

      return summary;
    },
    enabled: !!user?.school_id,
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

  // Check if any configuration exists
  const hasAnyConfiguration = configSummary.length > 0;

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
      queryClient.invalidateQueries({ queryKey: ['config-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['config-summary'] });
      toast.success('Period deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  // Copy configuration mutation
  const copyConfigMutation = useMutation({
    mutationFn: async ({ fromGrade, toGrade }: { fromGrade: string; toGrade: string }) => {
      // Get source configuration
      const { data: sourceConfig, error: fetchError } = await supabase
        .from('school_period_settings')
        .select('*')
        .eq('school_id', user?.school_id)
        .eq('grade_group', fromGrade)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      // Delete existing target configuration
      const { error: deleteError } = await supabase
        .from('school_period_settings')
        .delete()
        .eq('school_id', user?.school_id)
        .eq('grade_group', toGrade);

      if (deleteError) throw deleteError;

      // Insert copied configuration
      const newConfig = sourceConfig.map(period => ({
        school_id: user?.school_id,
        grade_group: toGrade,
        day_of_week: period.day_of_week,
        period_number: period.period_number,
        period_name: period.period_name,
        start_time: period.start_time,
        end_time: period.end_time,
        is_break: period.is_break,
        is_active: true
      }));

      const { error: insertError } = await supabase
        .from('school_period_settings')
        .insert(newConfig);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-period-settings'] });
      queryClient.invalidateQueries({ queryKey: ['config-summary'] });
      toast.success('Configuration copied successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to copy: ${error.message}`);
    }
  });

  // Wizard: Create from template
  const createFromTemplate = async (templateId: string, targetGradeGroup: string) => {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const periods = [];
    const workingDays = wizardData.workingDays;

    for (const dayOfWeek of workingDays) {
      let currentTime = template.startTime;
      const periodDuration = 45; // minutes
      const breakDuration = 30; // minutes

      for (let i = 1; i <= template.periods; i++) {
        const isBreak = (template.id === 'standard-8' && i === 4) || 
                       (template.id === 'extended-10' && (i === 4 || i === 7));
        
        const duration = isBreak ? breakDuration : periodDuration;
        const endTime = addMinutes(currentTime, duration);

        periods.push({
          school_id: user?.school_id,
          grade_group: targetGradeGroup,
          day_of_week: dayOfWeek,
          period_number: i,
          period_name: isBreak ? 'Break' : `Period ${i}`,
          start_time: currentTime,
          end_time: endTime,
          is_break: isBreak,
          is_active: true
        });

        currentTime = endTime;
      }
    }

    const { error } = await supabase
      .from('school_period_settings')
      .insert(periods);

    if (error) throw error;
  };

  const addMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMins = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMins / 60);
    const newMins = totalMins % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

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
    queryClient.invalidateQueries({ queryKey: ['config-summary'] });
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
    setEditingPeriod(null);
    const nextPeriodNumber = Math.max(...periodSettings.filter(p => p.day_of_week === dayOfWeek).map(p => p.period_number), 0) + 1;
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
      period_name: periodForm.period_name,
      start_time: periodForm.start_time,
      end_time: periodForm.end_time,
      is_break: periodForm.is_break,
      is_active: true
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
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

  // Show initial setup wizard if no configuration exists
  if (!hasAnyConfiguration && !isWizardOpen && !showConfigSelector) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="text-center py-12">
          <Clock className="w-20 h-20 text-indigo-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Timing Settings</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Let's set up your school's schedule. You can configure different timings for different grades or use the same schedule for everyone.
          </p>
        </div>

        {/* Configuration Type Selection */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Choose Your Configuration Approach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all"
              onClick={() => {
                setSelectedGradeGroup('all');
                setIsWizardOpen(true);
              }}
            >
              <div className="flex items-center gap-4">
                <Globe className="w-8 h-8 text-indigo-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Same Schedule for All Grades</h3>
                  <p className="text-gray-600">Use one timing configuration for all grades in your school</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Recommended for most schools</Badge>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div 
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all"
              onClick={() => setShowConfigSelector(true)}
            >
              <div className="flex items-center gap-4">
                <Users className="w-8 h-8 text-purple-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Different Schedules by Grade Groups</h3>
                  <p className="text-gray-600">Configure different timings for primary, middle, and senior grades</p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">Flexible option</Badge>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div 
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all"
              onClick={() => setShowConfigSelector(true)}
            >
              <div className="flex items-center gap-4">
                <Target className="w-8 h-8 text-orange-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Individual Grade Configurations</h3>
                  <p className="text-gray-600">Set up unique schedules for each grade level</p>
                  <Badge className="mt-2 bg-orange-100 text-orange-800">Maximum flexibility</Badge>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Grade group selector
  if (showConfigSelector && !isWizardOpen) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Grade Group to Configure</h2>
          <p className="text-gray-600">Choose which grade group you want to set up first</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GRADE_GROUPS.map((group) => {
            const Icon = group.icon;
            const isConfigured = configSummary.some(c => c.gradeGroup === group.value);
            
            return (
              <Card 
                key={group.value}
                className={`cursor-pointer transition-all hover:shadow-lg ${isConfigured ? 'border-green-200 bg-green-50' : 'hover:border-indigo-200'}`}
                onClick={() => {
                  setSelectedGradeGroup(group.value);
                  setIsWizardOpen(true);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 mt-1 ${isConfigured ? 'text-green-600' : 'text-gray-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{group.label}</h3>
                        {isConfigured && <CheckCircle className="w-4 h-4 text-green-600" />}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      {isConfigured && (
                        <Badge className="mt-2 bg-green-100 text-green-800">Configured</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => setShowConfigSelector(false)}
          >
            Back to Main Options
          </Button>
        </div>
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
        
        <div className="flex items-center gap-3">
          {hasAnyConfiguration && (
            <Button
              variant="outline"
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Setup Wizard
            </Button>
          )}
          
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
      </div>

      {/* Configuration Summary */}
      {configSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Current Configurations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configSummary.map((config) => (
                <div key={config.gradeGroup} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {GRADE_GROUPS.find(g => g.value === config.gradeGroup)?.label}
                    </h4>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedGradeGroup(config.gradeGroup);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {config.gradeGroup !== 'all' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyConfigMutation.mutate({ 
                            fromGrade: config.gradeGroup, 
                            toGrade: selectedGradeGroup 
                          })}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>{config.totalDays} working days</div>
                    <div>{config.totalPeriods} total periods</div>
                    <div>{config.breaks} break periods</div>
                    {config.startTime && config.endTime && (
                      <div>{formatTime(config.startTime)} - {formatTime(config.endTime)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <p className="text-gray-600 mb-6">Configure your school's period timings to get started</p>
            
            {/* Template Quick Setup */}
            <div className="max-w-2xl mx-auto mb-6">
              <h4 className="font-medium mb-4">Quick Setup Templates</h4>
              <div className="grid md:grid-cols-3 gap-3">
                {PRESET_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="p-4 h-auto flex-col"
                    onClick={() => {
                      setWizardData({ ...wizardData, template: template.id });
                      createFromTemplate(template.id, selectedGradeGroup);
                      queryClient.invalidateQueries({ queryKey: ['school-period-settings'] });
                      queryClient.invalidateQueries({ queryKey: ['config-summary'] });
                      toast.success(`${template.name} template applied!`);
                    }}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                    <div className="text-xs mt-2">{template.periods} periods, {template.breaks} break(s)</div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Manual Day Setup */}
            <div>
              <h4 className="font-medium mb-4">Or set up individual days</h4>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setup Wizard - {GRADE_GROUPS.find(g => g.value === selectedGradeGroup)?.label}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {wizardStep === 1 && (
              <div>
                <h3 className="font-medium mb-4">Choose a Template</h3>
                <div className="grid gap-3">
                  {PRESET_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        wizardData.template === template.id 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setWizardData({ ...wizardData, template: template.id })}
                    >
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{template.periods} periods</span>
                        <span>{template.breaks} break(s)</span>
                        <span>{template.startTime} - {template.endTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsWizardOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => setWizardStep(2)}
                    disabled={!wizardData.template}
                  >
                    Next: Working Days
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div>
                <h3 className="font-medium mb-4">Select Working Days</h3>
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.id}
                      className={`p-3 text-sm border rounded-lg transition-all ${
                        wizardData.workingDays.includes(day.id)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        const newDays = wizardData.workingDays.includes(day.id)
                          ? wizardData.workingDays.filter(d => d !== day.id)
                          : [...wizardData.workingDays, day.id];
                        setWizardData({ ...wizardData, workingDays: newDays });
                      }}
                    >
                      <div className="font-medium">{day.short}</div>
                      <div className="text-xs">{day.name}</div>
                    </button>
                  ))}
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setWizardStep(1)}>
                    Back
                  </Button>
                  <Button 
                    onClick={async () => {
                      await createFromTemplate(wizardData.template, selectedGradeGroup);
                      queryClient.invalidateQueries({ queryKey: ['school-period-settings'] });
                      queryClient.invalidateQueries({ queryKey: ['config-summary'] });
                      setIsWizardOpen(false);
                      setWizardStep(1);
                      toast.success('Schedule created successfully!');
                    }}
                    disabled={wizardData.workingDays.length === 0}
                  >
                    Create Schedule
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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