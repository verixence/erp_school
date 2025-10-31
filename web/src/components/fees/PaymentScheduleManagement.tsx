'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, Plus, Eye, Edit, Trash2, Bell, Clock, RefreshCw, X,
  Copy, Send, DollarSign, Users, AlertCircle, CheckCircle, TrendingUp,
  FileText, Layers, Info, HelpCircle, Percent, Wallet, CalendarDays,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { format } from 'date-fns';

interface Installment {
  id?: string;
  installment_number: number;
  installment_name: string;
  due_date: string;
  percentage?: number;
  fixed_amount?: number;
  grace_period_days: number;
}

interface FeeItem {
  fee_category_id: string;
  amount_override?: number;
  is_mandatory: boolean;
}

interface Reminder {
  id?: string;
  reminder_type: string;
  days_before: number;
  notification_channels: string[];
  is_active: boolean;
  custom_message?: string;
}

interface PaymentSchedule {
  id: string;
  schedule_name: string;
  description?: string;
  academic_year: string;
  due_date: string;
  grace_period_days: number;
  late_fee_applicable: boolean;
  late_fee_enabled: boolean;
  late_fee_type?: 'fixed' | 'percentage' | 'daily';
  late_fee_amount?: number;
  late_fee_percentage?: number;
  late_fee_max_amount?: number;
  is_installment: boolean;
  installment_count?: number;
  installment_frequency?: 'monthly' | 'quarterly' | 'custom';
  status: string;
  total_students?: number;
  paid_students?: number;
  pending_students?: number;
  overdue_students?: number;
  created_at: string;
  fee_schedule_grades?: { grade: string }[];
  fee_schedule_items?: {
    id: string;
    fee_category_id: string;
    amount_override?: number;
    fee_categories: { id: string; name: string };
  }[];
  fee_schedule_reminders?: Reminder[];
  fee_schedule_installments?: Installment[];
}

interface FeeCategory {
  id: string;
  name: string;
  description?: string;
}

interface PaymentScheduleManagementProps {
  schoolId: string;
}

export default function EnhancedPaymentScheduleManagement({ schoolId }: PaymentScheduleManagementProps) {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | 'status'>('create');
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);

  // Enhanced form state
  const [formData, setFormData] = useState({
    schedule_name: '',
    description: '',
    academic_year: '',
    due_date: '',
    grace_period_days: 0,
    late_fee_enabled: false,
    late_fee_type: 'fixed' as 'fixed' | 'percentage' | 'daily',
    late_fee_amount: 0,
    late_fee_percentage: 0,
    late_fee_max_amount: 0,
    is_installment: false,
    installment_frequency: 'monthly' as 'monthly' | 'quarterly' | 'custom',
    selectedGrades: [] as string[],
    selectedFees: [] as FeeItem[],
    feeAmountOverrides: {} as Record<string, number>,
    installments: [] as Installment[],
    reminders: [] as Reminder[]
  });

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear - 1}-${currentYear}`
  ];

  // Preset reminders
  const presetReminders: Reminder[] = [
    {
      reminder_type: 'before_due',
      days_before: 7,
      notification_channels: ['in_app', 'push'],
      is_active: true,
      custom_message: 'Dear Parent, {schedule_name} for {student_name} is due on {due_date}. Amount: ₹{amount}'
    },
    {
      reminder_type: 'before_due',
      days_before: 1,
      notification_channels: ['in_app', 'push'],
      is_active: true,
      custom_message: 'Reminder: {schedule_name} for {student_name} is due tomorrow. Amount: ₹{amount}'
    },
    {
      reminder_type: 'on_due',
      days_before: 0,
      notification_channels: ['in_app', 'push'],
      is_active: true,
      custom_message: '{schedule_name} for {student_name} is due today. Please pay ₹{amount}'
    },
    {
      reminder_type: 'after_due',
      days_before: -3,
      notification_channels: ['in_app', 'push'],
      is_active: true,
      custom_message: 'Overdue: {schedule_name} for {student_name} was due on {due_date}. Amount: ₹{amount}'
    }
  ];

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load schedules with enhanced data
      const schedulesRes = await fetch(`/api/admin/fees/payment-schedules?school_id=${schoolId}`);
      const schedulesData = await schedulesRes.json();
      setSchedules(schedulesData.data || []);

      // Load fee categories
      const categoriesRes = await fetch(`/api/admin/fees/categories?school_id=${schoolId}`);
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData.data || []);

      // Load sections to get grades
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, grade, grade_text, section')
        .eq('school_id', schoolId)
        .order('grade', { ascending: true, nullsFirst: false })
        .order('grade_text', { ascending: true, nullsFirst: false });

      const uniqueGrades = [...new Set(
        (sectionsData || []).map(s => s.grade_text || s.grade?.toString()).filter(Boolean)
      )];

      // Sort grades
      uniqueGrades.sort((a, b) => {
        const numA = parseInt(a!.replace(/[^0-9]/g, ''));
        const numB = parseInt(b!.replace(/[^0-9]/g, ''));
        if (isNaN(numA) && isNaN(numB)) return a!.localeCompare(b!);
        if (isNaN(numA)) return -1;
        if (isNaN(numB)) return 1;
        return numA - numB;
      });

      setSections(uniqueGrades.map(g => ({ grade: g })));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedSchedule(null);
    setFormData({
      schedule_name: '',
      description: '',
      academic_year: academicYears[0],
      due_date: '',
      grace_period_days: 5,
      late_fee_enabled: false,
      late_fee_type: 'fixed',
      late_fee_amount: 0,
      late_fee_percentage: 0,
      late_fee_max_amount: 0,
      is_installment: false,
      installment_frequency: 'monthly',
      selectedGrades: [],
      selectedFees: [],
      feeAmountOverrides: {},
      installments: [],
      reminders: [...presetReminders]
    });
    setShowModal(true);
  };

  const handleEdit = (schedule: PaymentSchedule) => {
    setModalMode('edit');
    setSelectedSchedule(schedule);

    const feeOverrides: Record<string, number> = {};
    schedule.fee_schedule_items?.forEach(item => {
      if (item.amount_override) {
        feeOverrides[item.fee_category_id] = item.amount_override;
      }
    });

    setFormData({
      schedule_name: schedule.schedule_name,
      description: schedule.description || '',
      academic_year: schedule.academic_year,
      due_date: schedule.due_date,
      grace_period_days: schedule.grace_period_days,
      late_fee_enabled: schedule.late_fee_enabled,
      late_fee_type: schedule.late_fee_type || 'fixed',
      late_fee_amount: schedule.late_fee_amount || 0,
      late_fee_percentage: schedule.late_fee_percentage || 0,
      late_fee_max_amount: schedule.late_fee_max_amount || 0,
      is_installment: schedule.is_installment,
      installment_frequency: schedule.installment_frequency || 'monthly',
      selectedGrades: schedule.fee_schedule_grades?.map(g => g.grade) || [],
      selectedFees: schedule.fee_schedule_items?.map(i => ({
        fee_category_id: i.fee_category_id,
        amount_override: i.amount_override,
        is_mandatory: true
      })) || [],
      feeAmountOverrides: feeOverrides,
      installments: schedule.fee_schedule_installments || [],
      reminders: schedule.fee_schedule_reminders || [...presetReminders]
    });
    setShowModal(true);
  };

  const handleDuplicate = async (schedule: PaymentSchedule) => {
    setModalMode('create');
    setSelectedSchedule(null);

    const feeOverrides: Record<string, number> = {};
    schedule.fee_schedule_items?.forEach(item => {
      if (item.amount_override) {
        feeOverrides[item.fee_category_id] = item.amount_override;
      }
    });

    setFormData({
      schedule_name: `${schedule.schedule_name} (Copy)`,
      description: schedule.description || '',
      academic_year: academicYears[0],
      due_date: '',
      grace_period_days: schedule.grace_period_days,
      late_fee_enabled: schedule.late_fee_enabled,
      late_fee_type: schedule.late_fee_type || 'fixed',
      late_fee_amount: schedule.late_fee_amount || 0,
      late_fee_percentage: schedule.late_fee_percentage || 0,
      late_fee_max_amount: schedule.late_fee_max_amount || 0,
      is_installment: schedule.is_installment,
      installment_frequency: schedule.installment_frequency || 'monthly',
      selectedGrades: schedule.fee_schedule_grades?.map(g => g.grade) || [],
      selectedFees: schedule.fee_schedule_items?.map(i => ({
        fee_category_id: i.fee_category_id,
        amount_override: i.amount_override,
        is_mandatory: true
      })) || [],
      feeAmountOverrides: feeOverrides,
      installments: [],
      reminders: schedule.fee_schedule_reminders || [...presetReminders]
    });
    setShowModal(true);
    toast.success('Schedule duplicated. Modify and save to create a new schedule.');
  };

  const handleViewStatus = async (schedule: PaymentSchedule) => {
    setModalMode('status');
    setSelectedSchedule(schedule);

    try {
      const res = await fetch(`/api/admin/fees/payment-schedules/${schedule.id}/status?school_id=${schoolId}`);
      const data = await res.json();
      setPaymentStatusData(data.data || []);
      setShowModal(true);
    } catch (error) {
      console.error('Error loading payment status:', error);
      toast.error('Failed to load payment status');
    }
  };

  const handleSendReminder = async (scheduleId: string) => {
    if (!confirm('Send reminder notifications to all parents with pending payments for this schedule?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/fees/payment-schedules/${scheduleId}/send-reminder?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Reminders sent to ${result.count || 0} parents`);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to send reminders');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    }
  };

  const handleToggleStatus = async (scheduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      const res = await fetch(`/api/admin/fees/payment-schedules/${scheduleId}/status?school_id=${schoolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Schedule ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        loadData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this payment schedule? This will also delete all associated data.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/fees/payment-schedules/${scheduleId}?school_id=${schoolId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Payment schedule deleted successfully');
        loadData();
      } else {
        toast.error('Failed to delete payment schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete payment schedule');
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one schedule');
      return;
    }

    if (!confirm(`${action.toUpperCase()} ${selectedIds.length} schedule(s)?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/fees/payment-schedules/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          action,
          schedule_ids: selectedIds
        })
      });

      if (res.ok) {
        toast.success(`${selectedIds.length} schedule(s) ${action}d successfully`);
        setSelectedIds([]);
        loadData();
      } else {
        toast.error(`Failed to ${action} schedules`);
      }
    } catch (error) {
      console.error(`Error ${action}ing schedules:`, error);
      toast.error(`Failed to ${action} schedules`);
    }
  };

  const generateInstallments = () => {
    if (!formData.due_date || !formData.is_installment) return;

    const count = formData.installment_frequency === 'monthly' ? 3 :
                  formData.installment_frequency === 'quarterly' ? 4 : 2;

    const dueDate = new Date(formData.due_date);
    const installments: Installment[] = [];
    const percentagePerInstallment = 100 / count;

    for (let i = 0; i < count; i++) {
      const installmentDate = new Date(dueDate);
      if (formData.installment_frequency === 'monthly') {
        installmentDate.setMonth(dueDate.getMonth() + i);
      } else if (formData.installment_frequency === 'quarterly') {
        installmentDate.setMonth(dueDate.getMonth() + (i * 3));
      } else {
        installmentDate.setMonth(dueDate.getMonth() + (i * 6));
      }

      installments.push({
        installment_number: i + 1,
        installment_name: `Installment ${i + 1}`,
        due_date: installmentDate.toISOString().split('T')[0],
        percentage: percentagePerInstallment,
        grace_period_days: formData.grace_period_days
      });
    }

    setFormData({ ...formData, installments });
  };

  const handleSubmit = async () => {
    if (!formData.schedule_name || !formData.academic_year || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.selectedGrades.length === 0) {
      toast.error('Please select at least one grade');
      return;
    }

    if (formData.selectedFees.length === 0) {
      toast.error('Please select at least one fee type');
      return;
    }

    try {
      const payload = {
        school_id: schoolId,
        schedule_name: formData.schedule_name,
        description: formData.description,
        academic_year: formData.academic_year,
        due_date: formData.due_date,
        grace_period_days: formData.grace_period_days,
        late_fee_enabled: formData.late_fee_enabled,
        late_fee_type: formData.late_fee_enabled ? formData.late_fee_type : null,
        late_fee_amount: formData.late_fee_enabled ? formData.late_fee_amount : null,
        late_fee_percentage: formData.late_fee_enabled ? formData.late_fee_percentage : null,
        late_fee_max_amount: formData.late_fee_enabled ? formData.late_fee_max_amount : null,
        is_installment: formData.is_installment,
        installment_frequency: formData.is_installment ? formData.installment_frequency : null,
        grades: formData.selectedGrades,
        fee_items: formData.selectedFees,
        installments: formData.is_installment ? formData.installments : [],
        reminders: formData.reminders
      };

      const url = modalMode === 'edit' && selectedSchedule
        ? `/api/admin/fees/payment-schedules/${selectedSchedule.id}?school_id=${schoolId}`
        : `/api/admin/fees/payment-schedules?school_id=${schoolId}`;

      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Payment schedule ${modalMode === 'edit' ? 'updated' : 'created'} successfully`);
        setShowModal(false);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || `Failed to ${modalMode === 'edit' ? 'update' : 'create'} payment schedule`);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(`Failed to ${modalMode === 'edit' ? 'update' : 'create'} payment schedule`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Schedules</p>
                <p className="text-2xl font-bold">{schedules.length}</p>
              </div>
              <Layers className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Schedules</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => s.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">
                  {schedules.reduce((sum, s) => sum + (s.total_students || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">
                  {schedules.reduce((sum, s) => sum + (s.total_students || 0), 0) > 0
                    ? Math.round(
                        (schedules.reduce((sum, s) => sum + (s.paid_students || 0), 0) /
                          schedules.reduce((sum, s) => sum + (s.total_students || 0), 0)) *
                          100
                      )
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-blue-600">Payment Schedule Management</h3>
          <p className="text-muted-foreground">Manage fee collection schedules with installments and automated reminders</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" onClick={() => handleBulkAction('activate')}>
                Activate Selected ({selectedIds.length})
              </Button>
              <Button variant="outline" onClick={() => handleBulkAction('deactivate')}>
                Deactivate Selected ({selectedIds.length})
              </Button>
              <Button variant="outline" onClick={() => handleBulkAction('delete')} className="text-red-600">
                Delete Selected ({selectedIds.length})
              </Button>
            </>
          )}
          <Button variant="outline" onClick={loadData} className="bg-green-600 text-white hover:bg-green-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* Schedules Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === schedules.length && schedules.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(schedules.map(s => s.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Sl No</th>
                  <th className="px-4 py-3 text-left font-medium">Schedule Name</th>
                  <th className="px-4 py-3 text-left font-medium">Academic Year</th>
                  <th className="px-4 py-3 text-left font-medium">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-center font-medium">Students</th>
                  <th className="px-4 py-3 text-center font-medium">Payment Status</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schedules.map((schedule, index) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(schedule.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, schedule.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== schedule.id));
                          }
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{schedule.schedule_name}</div>
                      {schedule.description && (
                        <div className="text-xs text-gray-500">{schedule.description}</div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {schedule.fee_schedule_grades?.slice(0, 2).map(g => (
                          <Badge key={g.grade} variant="outline" className="text-xs">
                            {g.grade}
                          </Badge>
                        ))}
                        {schedule.fee_schedule_grades && schedule.fee_schedule_grades.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{schedule.fee_schedule_grades.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{schedule.academic_year}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {format(new Date(schedule.due_date), 'dd MMM yyyy')}
                      </div>
                      {schedule.grace_period_days > 0 && (
                        <div className="text-xs text-gray-500">
                          Grace: {schedule.grace_period_days} days
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {schedule.is_installment ? (
                        <Badge variant="secondary" className="text-xs">
                          <Layers className="h-3 w-3 mr-1" />
                          Installment ({schedule.installment_count || 0})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Full Payment
                        </Badge>
                      )}
                      {schedule.late_fee_enabled && (
                        <Badge variant="outline" className="text-xs mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Late Fee
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm font-medium">{schedule.total_students || 0}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-green-600">Paid:</span>
                          <span className="font-medium">{schedule.paid_students || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-600">Pending:</span>
                          <span className="font-medium">{schedule.pending_students || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-600">Overdue:</span>
                          <span className="font-medium">{schedule.overdue_students || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={
                          schedule.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {schedule.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50"
                          onClick={() => handleViewStatus(schedule)}
                          title="View Payment Status"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleSendReminder(schedule.id)}
                          title="Send Reminder"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50"
                          onClick={() => handleDuplicate(schedule)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                          onClick={() => handleEdit(schedule)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(schedule.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No payment schedules found. Click "New Schedule" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-600">
                  {modalMode === 'create' ? 'Create Payment Schedule' : 'Edit Payment Schedule'}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Indicator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Configure Payment Schedule</h4>
                    <p className="text-sm text-blue-700">
                      Fill in each section below to create a complete payment schedule. All tabs must be configured before saving.
                    </p>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1 rounded-lg">
                  <TabsTrigger value="basic" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Basic Info</span>
                    <span className="sm:hidden">1</span>
                  </TabsTrigger>
                  <TabsTrigger value="fees" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Receipt className="h-4 w-4" />
                    <span className="hidden sm:inline">Fee Types</span>
                    <span className="sm:hidden">2</span>
                  </TabsTrigger>
                  <TabsTrigger value="installments" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">Installments</span>
                    <span className="sm:hidden">3</span>
                  </TabsTrigger>
                  <TabsTrigger value="late-fees" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Percent className="h-4 w-4" />
                    <span className="hidden sm:inline">Late Fees</span>
                    <span className="sm:hidden">4</span>
                  </TabsTrigger>
                  <TabsTrigger value="reminders" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Bell className="h-4 w-4" />
                    <span className="hidden sm:inline">Reminders</span>
                    <span className="sm:hidden">5</span>
                  </TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  {/* Section Help Text */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-600 mt-0.5" />
                      <div className="text-sm text-slate-700">
                        <strong>What is this?</strong> Set the basic details for your payment schedule including name, academic year, and payment deadline.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="schedule_name" className="flex items-center gap-2">
                        Schedule Name*
                        <span className="text-xs text-gray-500 font-normal">(e.g., "First Term Fees", "Annual Fees")</span>
                      </Label>
                      <Input
                        id="schedule_name"
                        value={formData.schedule_name}
                        onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                        placeholder="e.g., First Term Fees"
                      />
                    </div>
                    <div>
                      <Label htmlFor="academic_year">Academic Year*</Label>
                      <Select
                        value={formData.academic_year}
                        onValueChange={(value) => setFormData({ ...formData, academic_year: value })}
                      >
                        <SelectTrigger id="academic_year">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="flex items-center gap-2">
                      Description
                      <span className="text-xs text-gray-500 font-normal">(Optional: Add notes about this payment)</span>
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., First term fees for the academic year 2025-2026"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="due_date" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due Date*
                        <span className="text-xs text-gray-500 font-normal">(Last date to pay)</span>
                      </Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="grace_period" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Grace Period (days)
                        <span className="text-xs text-gray-500 font-normal">(Extra days before late fee)</span>
                      </Label>
                      <Input
                        id="grace_period"
                        type="number"
                        min="0"
                        value={formData.grace_period_days}
                        onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) || 0 })}
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>

                  {/* Select Grades */}
                  <div>
                    <Label>Select Grades*</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {sections.map((section) => (
                        <label key={section.grade} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.selectedGrades.includes(section.grade)}
                            onChange={() => {
                              const isSelected = formData.selectedGrades.includes(section.grade);
                              setFormData({
                                ...formData,
                                selectedGrades: isSelected
                                  ? formData.selectedGrades.filter(g => g !== section.grade)
                                  : [...formData.selectedGrades, section.grade]
                              });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{section.grade}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Fee Types Tab */}
                <TabsContent value="fees" className="space-y-4 mt-4">
                  {/* Section Help Text */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-600 mt-0.5" />
                      <div className="text-sm text-slate-700">
                        <strong>What is this?</strong> Choose which fee types to include in this schedule. You can use default amounts from your fee structure or set custom amounts for this specific schedule.
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Select Fee Types and Custom Amounts*
                    </Label>
                    <div className="space-y-2 mt-2">
                      {categories.map((category) => {
                        const isSelected = formData.selectedFees.some(f => f.fee_category_id === category.id);
                        const override = formData.feeAmountOverrides[category.id];

                        return (
                          <div key={category.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    selectedFees: [
                                      ...formData.selectedFees,
                                      { fee_category_id: category.id, is_mandatory: true }
                                    ]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedFees: formData.selectedFees.filter(f => f.fee_category_id !== category.id)
                                  });
                                  const newOverrides = { ...formData.feeAmountOverrides };
                                  delete newOverrides[category.id];
                                  setFormData({ ...formData, feeAmountOverrides: newOverrides });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm flex-1">{category.name}</span>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Custom Amount:</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Leave empty for default"
                                  value={override || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (value) {
                                      setFormData({
                                        ...formData,
                                        feeAmountOverrides: { ...formData.feeAmountOverrides, [category.id]: value },
                                        selectedFees: formData.selectedFees.map(f =>
                                          f.fee_category_id === category.id
                                            ? { ...f, amount_override: value }
                                            : f
                                        )
                                      });
                                    } else {
                                      const newOverrides = { ...formData.feeAmountOverrides };
                                      delete newOverrides[category.id];
                                      setFormData({
                                        ...formData,
                                        feeAmountOverrides: newOverrides,
                                        selectedFees: formData.selectedFees.map(f =>
                                          f.fee_category_id === category.id
                                            ? { fee_category_id: f.fee_category_id, is_mandatory: true }
                                            : f
                                        )
                                      });
                                    }
                                  }}
                                  className="w-32"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                {/* Installments Tab */}
                <TabsContent value="installments" className="space-y-4 mt-4">
                  {/* Section Help Text */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-600 mt-0.5" />
                      <div className="text-sm text-slate-700">
                        <strong>What is this?</strong> Split the total fee amount into multiple payments with different due dates.
                        <div className="mt-2 text-xs bg-white p-2 rounded border border-slate-300">
                          <strong>Example:</strong> ₹10,000 total fee can be split into:
                          <ul className="list-disc ml-4 mt-1">
                            <li>Installment 1 (40%): ₹4,000 due on Jan 15</li>
                            <li>Installment 2 (30%): ₹3,000 due on Feb 15</li>
                            <li>Installment 3 (30%): ₹3,000 due on Mar 15</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_installment"
                      checked={formData.is_installment}
                      onChange={(e) => setFormData({ ...formData, is_installment: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="is_installment" className="cursor-pointer">
                      Enable Installment Plan
                    </Label>
                  </div>

                  {formData.is_installment && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Installment Frequency</Label>
                          <Select
                            value={formData.installment_frequency}
                            onValueChange={(value: 'monthly' | 'quarterly' | 'custom') =>
                              setFormData({ ...formData, installment_frequency: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly (3 installments)</SelectItem>
                              <SelectItem value="quarterly">Quarterly (4 installments)</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <Button onClick={generateInstallments} type="button" className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Auto-Generate
                          </Button>
                          <p className="text-xs text-gray-500">
                            Click to create installments automatically
                          </p>
                        </div>
                      </div>

                      {formData.installments.length > 0 && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Installment Details
                            <span className="text-xs text-gray-500 font-normal">
                              (Edit dates and percentages as needed)
                            </span>
                          </Label>

                          {/* Column Headers */}
                          <div className="grid grid-cols-5 gap-2 px-3 text-xs font-semibold text-gray-600">
                            <div>Name</div>
                            <div>Due Date</div>
                            <div>Percentage</div>
                            <div>Grace Days</div>
                            <div></div>
                          </div>

                          {formData.installments.map((inst, index) => (
                            <div key={index} className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded">
                              <Input
                                placeholder="Installment 1"
                                value={inst.installment_name}
                                onChange={(e) => {
                                  const newInst = [...formData.installments];
                                  newInst[index].installment_name = e.target.value;
                                  setFormData({ ...formData, installments: newInst });
                                }}
                              />
                              <Input
                                type="date"
                                value={inst.due_date}
                                onChange={(e) => {
                                  const newInst = [...formData.installments];
                                  newInst[index].due_date = e.target.value;
                                  setFormData({ ...formData, installments: newInst });
                                }}
                              />
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="Percentage %"
                                value={inst.percentage || ''}
                                onChange={(e) => {
                                  const newInst = [...formData.installments];
                                  newInst[index].percentage = parseFloat(e.target.value);
                                  delete newInst[index].fixed_amount;
                                  setFormData({ ...formData, installments: newInst });
                                }}
                              />
                              <Input
                                type="number"
                                min="0"
                                placeholder="Grace Days"
                                value={inst.grace_period_days}
                                onChange={(e) => {
                                  const newInst = [...formData.installments];
                                  newInst[index].grace_period_days = parseInt(e.target.value) || 0;
                                  setFormData({ ...formData, installments: newInst });
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    installments: formData.installments.filter((_, i) => i !== index)
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                installments: [
                                  ...formData.installments,
                                  {
                                    installment_number: formData.installments.length + 1,
                                    installment_name: `Installment ${formData.installments.length + 1}`,
                                    due_date: '',
                                    percentage: 0,
                                    grace_period_days: formData.grace_period_days
                                  }
                                ]
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Installment
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Late Fees Tab */}
                <TabsContent value="late-fees" className="space-y-4 mt-4">
                  {/* Section Help Text */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-600 mt-0.5" />
                      <div className="text-sm text-slate-700">
                        <strong>What is this?</strong> Automatically charge additional fees when payments are made after the due date + grace period.
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-white p-2 rounded border border-slate-300">
                            <strong>Fixed:</strong> Add a one-time amount (e.g., ₹500)
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-300">
                            <strong>Percentage:</strong> Charge % of balance (e.g., 5% of ₹10,000 = ₹500)
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-300">
                            <strong>Daily:</strong> Charge per day overdue (e.g., ₹50/day × 10 days = ₹500)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="late_fee_enabled"
                      checked={formData.late_fee_enabled}
                      onChange={(e) => setFormData({ ...formData, late_fee_enabled: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="late_fee_enabled" className="cursor-pointer">
                      Enable Late Fees
                    </Label>
                  </div>

                  {formData.late_fee_enabled && (
                    <>
                      <div>
                        <Label>Late Fee Type</Label>
                        <Select
                          value={formData.late_fee_type}
                          onValueChange={(value: 'fixed' | 'percentage' | 'daily') =>
                            setFormData({ ...formData, late_fee_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Amount (one-time)</SelectItem>
                            <SelectItem value="percentage">Percentage of Balance</SelectItem>
                            <SelectItem value="daily">Daily Charge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.late_fee_type === 'fixed' && (
                        <div>
                          <Label>Late Fee Amount (₹)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.late_fee_amount}
                            onChange={(e) => setFormData({ ...formData, late_fee_amount: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g., 500"
                          />
                          <p className="text-xs text-gray-500 mt-1">One-time charge after grace period</p>
                        </div>
                      )}

                      {formData.late_fee_type === 'percentage' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Percentage (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={formData.late_fee_percentage}
                              onChange={(e) => setFormData({ ...formData, late_fee_percentage: parseFloat(e.target.value) || 0 })}
                              placeholder="e.g., 5"
                            />
                            <p className="text-xs text-gray-500 mt-1">% of outstanding balance</p>
                          </div>
                          <div>
                            <Label>Maximum Amount (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.late_fee_max_amount}
                              onChange={(e) => setFormData({ ...formData, late_fee_max_amount: parseFloat(e.target.value) || 0 })}
                              placeholder="e.g., 2000"
                            />
                            <p className="text-xs text-gray-500 mt-1">Cap the maximum late fee</p>
                          </div>
                        </div>
                      )}

                      {formData.late_fee_type === 'daily' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Daily Charge (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.late_fee_amount}
                              onChange={(e) => setFormData({ ...formData, late_fee_amount: parseFloat(e.target.value) || 0 })}
                              placeholder="e.g., 50"
                            />
                            <p className="text-xs text-gray-500 mt-1">Charged per day overdue</p>
                          </div>
                          <div>
                            <Label>Maximum Amount (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.late_fee_max_amount}
                              onChange={(e) => setFormData({ ...formData, late_fee_max_amount: parseFloat(e.target.value) || 0 })}
                              placeholder="e.g., 1500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Cap the maximum late fee</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Reminders Tab */}
                <TabsContent value="reminders" className="space-y-4 mt-4">
                  {/* Section Help Text */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-600 mt-0.5" />
                      <div className="text-sm text-slate-700">
                        <strong>What is this?</strong> Configure automated reminder notifications to parents before the due date.
                        <div className="mt-2 text-xs bg-white p-2 rounded border border-slate-300">
                          <strong>Placeholders you can use:</strong>
                          <ul className="list-disc ml-4 mt-1">
                            <li><code>{'{student_name}'}</code> - Student's full name</li>
                            <li><code>{'{schedule_name}'}</code> - Payment schedule name</li>
                            <li><code>{'{due_date}'}</code> - Payment due date</li>
                            <li><code>{'{amount}'}</code> - Total amount due</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Reminder Settings
                    </Label>
                    <div className="space-y-3 mt-2">
                      {formData.reminders.map((reminder, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={reminder.is_active}
                                onChange={(e) => {
                                  const newReminders = [...formData.reminders];
                                  newReminders[index].is_active = e.target.checked;
                                  setFormData({ ...formData, reminders: newReminders });
                                }}
                                className="rounded"
                              />
                              <Bell className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">
                                {reminder.days_before > 0 && `${reminder.days_before} days before due date`}
                                {reminder.days_before === 0 && 'On due date'}
                                {reminder.days_before < 0 && `${Math.abs(reminder.days_before)} days after due date`}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {reminder.notification_channels.join(', ')}
                            </Badge>
                          </div>
                          {reminder.is_active && (
                            <div>
                              <Label className="text-xs">Custom Message Template</Label>
                              <textarea
                                value={reminder.custom_message || ''}
                                onChange={(e) => {
                                  const newReminders = [...formData.reminders];
                                  newReminders[index].custom_message = e.target.value;
                                  setFormData({ ...formData, reminders: newReminders });
                                }}
                                placeholder="Use placeholders: {student_name}, {schedule_name}, {due_date}, {amount}, {installment_name}"
                                className="w-full p-2 border rounded text-sm mt-1"
                                rows={2}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Available: {'{student_name}'}, {'{schedule_name}'}, {'{due_date}'}, {'{amount}'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                  {modalMode === 'create' ? 'Create Schedule' : 'Update Schedule'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Modal */}
      {showModal && modalMode === 'status' && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-blue-600">
                    Payment Status: {selectedSchedule.schedule_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Due: {format(new Date(selectedSchedule.due_date), 'dd MMM yyyy')} |
                    Total Students: {paymentStatusData.length}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Status Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Total Due</div>
                    <div className="text-2xl font-bold">
                      ₹{paymentStatusData.reduce((sum, s) => sum + parseFloat(s.total_amount_due || 0), 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Collected</div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{paymentStatusData.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      ₹{paymentStatusData.reduce((sum, s) => sum + parseFloat(s.balance_amount || 0), 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Late Fees</div>
                    <div className="text-2xl font-bold text-red-600">
                      ₹{paymentStatusData.reduce((sum, s) => sum + parseFloat(s.late_fees || 0), 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Status Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Grade</th>
                      {selectedSchedule.is_installment && (
                        <th className="px-4 py-3 text-left">Installment</th>
                      )}
                      <th className="px-4 py-3 text-right">Total Due</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Late Fees</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentStatusData.map((status: any) => (
                      <tr key={status.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{status.students?.full_name}</div>
                          <div className="text-xs text-gray-500">{status.students?.admission_no}</div>
                        </td>
                        <td className="px-4 py-3">
                          {status.students?.grade} - {status.students?.section}
                        </td>
                        {selectedSchedule.is_installment && (
                          <td className="px-4 py-3">
                            {status.fee_schedule_installments?.installment_name || 'N/A'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{parseFloat(status.total_amount_due).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-600">
                          ₹{parseFloat(status.amount_paid).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-red-600">
                          ₹{parseFloat(status.late_fees).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          ₹{parseFloat(status.balance_amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            className={
                              status.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : status.payment_status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : status.payment_status === 'overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {status.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
