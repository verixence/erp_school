'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet,
  Users,
  Send,
  Eye,
  Trash2,
  Loader2,
  Edit,
  Save,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase-client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayslipsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [viewingPayslip, setViewingPayslip] = useState<any>(null);

  // Fetch salary templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['salary-templates', user?.school_id],
    queryFn: async () => {
      const response = await fetch('/api/admin/salary-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    enabled: !!user?.school_id
  });

  // Fetch payslips
  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ['payslips', user?.school_id, selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/admin/payslips?month=${selectedMonth}&year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch payslips');
      return response.json();
    },
    enabled: !!user?.school_id && !!selectedMonth && !!selectedYear
  });

  // Bulk generate mutation
  const generateMutation = useMutation({
    mutationFn: async ({ send }: { send: boolean }) => {
      const response = await fetch('/api/admin/payslips/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          send_now: send
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate payslips');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data.count} payslips successfully`);
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const response = await fetch('/api/admin/salary-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      if (!response.ok) throw new Error('Failed to save template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Salary template saved');
      queryClient.invalidateQueries({ queryKey: ['salary-templates'] });
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete payslip mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/payslips/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete payslip');
    },
    onSuccess: () => {
      toast.success('Payslip deleted');
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Send payslip mutation
  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/payslips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() })
      });
      if (!response.ok) throw new Error('Failed to send payslip');
    },
    onSuccess: () => {
      toast.success('Payslip sent to teacher');
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSaveTemplate = (template: any) => {
    const { gross_salary, total_deductions, net_salary, ...cleanTemplate } = template;
    saveTemplateMutation.mutate(cleanTemplate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Teacher Payslips</h1>
        <p className="text-muted-foreground">
          Manage salary templates and generate payslips for all teachers
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">
            <Users className="h-4 w-4 mr-2" />
            Salary Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="payslips">
            <Wallet className="h-4 w-4 mr-2" />
            Payslips
          </TabsTrigger>
        </TabsList>

        {/* Salary Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Salary Templates</CardTitle>
              <CardDescription>
                Set up monthly salary structure for each teacher. Once templates are saved, you can bulk generate payslips.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No salary templates yet. Create templates for teachers to enable bulk payslip generation.
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template: any) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{template.teacher_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Employee ID: {template.employee_id || 'N/A'}
                          </div>
                          <div className="mt-2 flex gap-4 text-sm">
                            <span>Basic: ₹{template.basic_salary?.toLocaleString()}</span>
                            <span>HRA: ₹{template.hra?.toLocaleString()}</span>
                            <span>DA: ₹{template.da?.toLocaleString()}</span>
                            <span>TA: ₹{template.ta?.toLocaleString()}</span>
                          </div>
                          <div className="mt-1 flex gap-4 text-sm">
                            <span>PF: ₹{template.pf?.toLocaleString()}</span>
                            <span>Tax: ₹{template.tax?.toLocaleString()}</span>
                          </div>
                          <div className="mt-2 font-semibold text-primary">
                            Net Salary: ₹{template.net_salary?.toLocaleString()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payslips Tab */}
        <TabsContent value="payslips" className="space-y-4">
          {/* Bulk Generate Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Bulk Generate Payslips
              </CardTitle>
              <CardDescription>
                Generate payslips for all teachers using their salary templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Month</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    min="2020"
                    max="2100"
                  />
                </div>
                <Button
                  onClick={() => generateMutation.mutate({ send: false })}
                  disabled={generateMutation.isPending || templates.length === 0}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Generate as Draft
                </Button>
                <Button
                  onClick={() => generateMutation.mutate({ send: true })}
                  disabled={generateMutation.isPending || templates.length === 0}
                  variant="default"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Generate & Send
                </Button>
              </div>
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  Please create salary templates first in the Templates tab
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payslips List */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Payslips</CardTitle>
              <CardDescription>
                Viewing payslips for {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payslipsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : payslips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payslips generated for this month yet
                </div>
              ) : (
                <div className="space-y-3">
                  {payslips.map((payslip: any) => (
                    <Card key={payslip.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">{payslip.teacher_name}</div>
                            <Badge variant={
                              payslip.status === 'sent' ? 'default' :
                              payslip.status === 'viewed' ? 'secondary' : 'outline'
                            }>
                              {payslip.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Employee ID: {payslip.employee_id || 'N/A'}
                          </div>
                          <div className="mt-2 font-semibold text-primary">
                            Net Pay: ₹{payslip.net_salary?.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingPayslip(payslip)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {payslip.status === 'draft' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => sendMutation.mutate(payslip.id)}
                              disabled={sendMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(payslip.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Salary Template</DialogTitle>
            <DialogDescription>
              Update salary structure for {editingTemplate?.teacher_name}
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Basic Salary</Label>
                  <Input
                    type="number"
                    value={editingTemplate.basic_salary}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, basic_salary: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>HRA</Label>
                  <Input
                    type="number"
                    value={editingTemplate.hra}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, hra: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>DA (Dearness Allowance)</Label>
                  <Input
                    type="number"
                    value={editingTemplate.da}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, da: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>TA (Travel Allowance)</Label>
                  <Input
                    type="number"
                    value={editingTemplate.ta}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, ta: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Other Allowances</Label>
                  <Input
                    type="number"
                    value={editingTemplate.other_allowances}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, other_allowances: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>PF</Label>
                  <Input
                    type="number"
                    value={editingTemplate.pf}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, pf: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Tax</Label>
                  <Input
                    type="number"
                    value={editingTemplate.tax}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, tax: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Other Deductions</Label>
                  <Input
                    type="number"
                    value={editingTemplate.other_deductions}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, other_deductions: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Net Salary:</span>
                  <span className="text-primary">
                    ₹{(
                      editingTemplate.basic_salary +
                      (editingTemplate.hra || 0) +
                      (editingTemplate.da || 0) +
                      (editingTemplate.ta || 0) +
                      (editingTemplate.other_allowances || 0) -
                      (editingTemplate.pf || 0) -
                      (editingTemplate.tax || 0) -
                      (editingTemplate.other_deductions || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveTemplate(editingTemplate)}
                  disabled={saveTemplateMutation.isPending}
                >
                  {saveTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Payslip Dialog */}
      <Dialog open={!!viewingPayslip} onOpenChange={(open) => !open && setViewingPayslip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>
              {viewingPayslip?.teacher_name} - {MONTHS[selectedMonth - 1]} {selectedYear}
            </DialogDescription>
          </DialogHeader>
          {viewingPayslip && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Earnings</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Basic Salary:</span>
                    <span>₹{viewingPayslip.basic_salary?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HRA:</span>
                    <span>₹{viewingPayslip.allowances?.hra?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DA:</span>
                    <span>₹{viewingPayslip.allowances?.da?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TA:</span>
                    <span>₹{viewingPayslip.allowances?.ta?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Gross Salary:</span>
                    <span>₹{viewingPayslip.gross_salary?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Deductions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>PF:</span>
                    <span>₹{viewingPayslip.deductions?.pf?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>₹{viewingPayslip.deductions?.tax?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other:</span>
                    <span>₹{viewingPayslip.deductions?.other?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Pay:</span>
                  <span className="text-primary">₹{viewingPayslip.net_salary?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
