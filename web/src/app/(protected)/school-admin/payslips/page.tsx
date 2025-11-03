'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Wallet,
  Plus,
  Download,
  Send,
  Eye,
  Trash2,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase-client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayslipsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');

  // Form state
  const [teacherId, setTeacherId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [basicSalary, setBasicSalary] = useState('');
  const [hra, setHra] = useState('');
  const [da, setDa] = useState('');
  const [ta, setTa] = useState('');
  const [pf, setPf] = useState('');
  const [tax, setTax] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, employee_id')
        .eq('school_id', user?.school_id)
        .eq('role', 'teacher')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id
  });

  // Fetch payslips
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payslips', user?.school_id, selectedMonth, selectedYear],
    queryFn: async () => {
      let url = `/api/admin/payslips?`;
      if (selectedMonth) url += `month=${selectedMonth}&`;
      if (selectedYear) url += `year=${selectedYear}&`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch payslips');
      return response.json();
    },
    enabled: !!user?.school_id
  });

  const calculateSalary = () => {
    const basic = parseFloat(basicSalary) || 0;
    const hraAmt = parseFloat(hra) || 0;
    const daAmt = parseFloat(da) || 0;
    const taAmt = parseFloat(ta) || 0;
    const pfAmt = parseFloat(pf) || 0;
    const taxAmt = parseFloat(tax) || 0;
    const otherDed = parseFloat(otherDeductions) || 0;

    const gross = basic + hraAmt + daAmt + taAmt;
    const totalDeductions = pfAmt + taxAmt + otherDed;
    const net = gross - totalDeductions;

    return { gross, net };
  };

  const { gross, net } = calculateSalary();

  const handleCreatePayslip = async () => {
    if (!teacherId || !month || !year || !basicSalary) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          month,
          year,
          basic_salary: parseFloat(basicSalary),
          allowances: {
            hra: parseFloat(hra) || 0,
            da: parseFloat(da) || 0,
            ta: parseFloat(ta) || 0
          },
          deductions: {
            pf: parseFloat(pf) || 0,
            tax: parseFloat(tax) || 0,
            other: parseFloat(otherDeductions) || 0
          },
          gross_salary: gross,
          net_salary: net,
          notes,
          send_now: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payslip');
      }

      toast.success('Payslip created successfully');
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendPayslip = async (payslipId: string) => {
    try {
      const response = await fetch(`/api/admin/payslips/${payslipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' })
      });

      if (!response.ok) throw new Error('Failed to send payslip');

      toast.success('Payslip sent to teacher');
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeletePayslip = async (payslipId: string) => {
    if (!confirm('Are you sure you want to delete this payslip?')) return;

    try {
      const response = await fetch(`/api/admin/payslips/${payslipId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete payslip');

      toast.success('Payslip deleted');
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setTeacherId('');
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setBasicSalary('');
    setHra('');
    setDa('');
    setTa('');
    setPf('');
    setTax('');
    setOtherDeductions('');
    setNotes('');
  };

  const filteredPayslips = payslips.filter((p: any) =>
    searchTerm === '' ||
    p.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'viewed':
        return <Badge className="bg-green-100 text-green-800">Viewed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            Teacher Payslips
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and distribute salary payslips to teachers
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Payslip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Payslip</DialogTitle>
              <DialogDescription>
                Enter salary details to generate a payslip
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="teacher">Teacher *</Label>
                  <select
                    id="teacher"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name} ({t.employee_id || t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month *</Label>
                  <select
                    id="month"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Salary Components</h3>

                <div className="space-y-2">
                  <Label htmlFor="basic">Basic Salary *</Label>
                  <Input
                    id="basic"
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="hra">HRA</Label>
                    <Input
                      id="hra"
                      type="number"
                      value={hra}
                      onChange={(e) => setHra(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="da">DA</Label>
                    <Input
                      id="da"
                      type="number"
                      value={da}
                      onChange={(e) => setDa(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ta">TA</Label>
                    <Input
                      id="ta"
                      type="number"
                      value={ta}
                      onChange={(e) => setTa(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <h3 className="font-medium pt-2">Deductions</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="pf">PF</Label>
                    <Input
                      id="pf"
                      type="number"
                      value={pf}
                      onChange={(e) => setPf(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax">Tax</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="other">Other</Label>
                    <Input
                      id="other"
                      type="number"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gross Salary:</span>
                    <span className="font-medium">₹{gross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Deductions:</span>
                    <span className="font-medium text-red-600">
                      -₹{(gross - net).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Salary:</span>
                    <span className="text-green-600">₹{net.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes for this payslip"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreatePayslip} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Payslip'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Teacher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  className="pl-9"
                  placeholder="Name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterMonth">Filter by Month</Label>
              <select
                id="filterMonth"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterYear">Filter by Year</Label>
              <Input
                id="filterYear"
                type="number"
                placeholder="Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : '')}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedMonth('');
                  setSelectedYear('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>
            {filteredPayslips.length} payslip(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payslips found. Create your first payslip to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayslips.map((payslip: any) => (
                <div
                  key={payslip.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{payslip.teacher_name}</h3>
                        {getStatusBadge(payslip.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{MONTHS[payslip.month - 1]} {payslip.year}</span>
                        <span>•</span>
                        <span>Employee ID: {payslip.employee_id || 'N/A'}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          Net: ₹{parseFloat(payslip.net_salary).toFixed(2)}
                        </span>
                      </div>
                      {payslip.viewed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Viewed on {new Date(payslip.viewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {payslip.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleSendPayslip(payslip.id)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePayslip(payslip.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
