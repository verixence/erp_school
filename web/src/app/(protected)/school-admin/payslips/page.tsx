'use client';

import { useState, useRef } from 'react';
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
  Sparkles,
  Download,
  Upload
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('PayslipsPage - User:', user?.id, 'School:', user?.school_id, 'Role:', user?.role);

  // Download CSV template
  const downloadTemplate = async () => {
    const { data: teachers, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, employee_id')
      .eq('school_id', user?.school_id)
      .eq('role', 'teacher')
      .eq('status', 'active')
      .order('first_name');

    if (error || !teachers || teachers.length === 0) {
      toast.error('No teachers found');
      return;
    }

    // Create CSV content
    const headers = 'employee_id,teacher_name,basic_salary,hra,da,ta,other_allowances,pf,tax,other_deductions\n';
    const rows = teachers.map(t =>
      `${t.employee_id || ''},${t.first_name} ${t.last_name},0,0,0,0,0,0,0,0`
    ).join('\n');

    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary_templates.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Handle CSV upload
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');

      // Parse CSV rows
      const templates = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const employeeId = values[0]?.trim();

        if (!employeeId) continue;

        // Find teacher by employee_id
        const { data: teacher } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', user?.school_id)
          .eq('employee_id', employeeId)
          .eq('role', 'teacher')
          .single();

        if (!teacher) {
          console.warn(`Teacher not found: ${employeeId}`);
          continue;
        }

        templates.push({
          school_id: user?.school_id,
          teacher_id: teacher.id,
          basic_salary: parseFloat(values[2] || '0'),
          hra: parseFloat(values[3] || '0'),
          da: parseFloat(values[4] || '0'),
          ta: parseFloat(values[5] || '0'),
          other_allowances: parseFloat(values[6] || '0'),
          pf: parseFloat(values[7] || '0'),
          tax: parseFloat(values[8] || '0'),
          other_deductions: parseFloat(values[9] || '0'),
          is_active: true
        });
      }

      if (templates.length === 0) {
        toast.error('No valid templates found in CSV');
        return;
      }

      // Insert templates
      const { error } = await supabase
        .from('teacher_salary_templates')
        .upsert(templates, {
          onConflict: 'school_id,teacher_id'
        });

      if (error) throw error;

      toast.success(`Uploaded ${templates.length} salary templates`);
      queryClient.invalidateQueries({ queryKey: ['salary-templates'] });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload CSV');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch salary templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['salary-templates', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_salary_template_summary')
        .select('*')
        .eq('school_id', user?.school_id)
        .order('teacher_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id
  });

  // Fetch payslips
  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ['payslips', user?.school_id, selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error} = await supabase
        .from('teacher_payslip_summary')
        .select('*')
        .eq('school_id', user?.school_id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('teacher_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id && !!selectedMonth && !!selectedYear
  });

  // Bulk generate mutation
  const generateMutation = useMutation({
    mutationFn: async ({ send }: { send: boolean }) => {
      // Get active salary templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('teacher_salary_templates')
        .select('*')
        .eq('school_id', user?.school_id)
        .eq('is_active', true);

      if (templatesError) throw templatesError;
      if (!templatesData || templatesData.length === 0) {
        throw new Error('No active salary templates found');
      }

      // Generate payslips from templates
      const payslips = templatesData.map(template => {
        const gross = template.basic_salary +
          (template.hra || 0) +
          (template.da || 0) +
          (template.ta || 0) +
          (template.other_allowances || 0);

        const totalDeductions =
          (template.pf || 0) +
          (template.tax || 0) +
          (template.other_deductions || 0);

        const net = gross - totalDeductions;

        return {
          school_id: user?.school_id,
          teacher_id: template.teacher_id,
          month: selectedMonth,
          year: selectedYear,
          basic_salary: template.basic_salary,
          allowances: {
            hra: template.hra || 0,
            da: template.da || 0,
            ta: template.ta || 0,
            other: template.other_allowances || 0
          },
          deductions: {
            pf: template.pf || 0,
            tax: template.tax || 0,
            other: template.other_deductions || 0
          },
          gross_salary: gross,
          net_salary: net,
          status: send ? 'sent' : 'draft',
          sent_at: send ? new Date().toISOString() : null,
          created_by: user?.id
        };
      });

      // Insert payslips
      const { data, error } = await supabase
        .from('teacher_payslips')
        .upsert(payslips, {
          onConflict: 'school_id,teacher_id,month,year'
        })
        .select();

      if (error) throw error;
      return { count: data.length };
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
      const { data, error } = await supabase
        .from('teacher_salary_templates')
        .upsert({
          school_id: user?.school_id,
          teacher_id: template.teacher_id,
          basic_salary: template.basic_salary || 0,
          hra: template.hra || 0,
          da: template.da || 0,
          ta: template.ta || 0,
          other_allowances: template.other_allowances || 0,
          pf: template.pf || 0,
          tax: template.tax || 0,
          other_deductions: template.other_deductions || 0,
          is_active: template.is_active !== undefined ? template.is_active : true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'school_id,teacher_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('teacher_payslips')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
      const { error } = await supabase
        .from('teacher_payslips')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teacher Salary Templates</CardTitle>
                  <CardDescription>
                    Set up monthly salary structure for each teacher. Once templates are saved, you can bulk generate payslips.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload CSV
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Salary Templates Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create salary templates for your teachers to enable bulk payslip generation.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={async () => {
                        // Fetch all active teachers
                        const { data: teachers, error } = await supabase
                          .from('users')
                          .select('id, first_name, last_name, employee_id')
                          .eq('school_id', user?.school_id)
                          .eq('role', 'teacher')
                          .eq('status', 'active');

                        if (error) {
                          toast.error('Failed to fetch teachers');
                          return;
                        }

                        if (!teachers || teachers.length === 0) {
                          toast.error('No active teachers found. Please add teachers first.');
                          return;
                        }

                        // Create blank templates for all teachers
                        const blankTemplates = teachers.map(t => ({
                          school_id: user?.school_id,
                          teacher_id: t.id,
                          basic_salary: 0,
                          hra: 0,
                          da: 0,
                          ta: 0,
                          other_allowances: 0,
                          pf: 0,
                          tax: 0,
                          other_deductions: 0,
                          is_active: true
                        }));

                        const { error: insertError } = await supabase
                          .from('teacher_salary_templates')
                          .insert(blankTemplates);

                        if (insertError) {
                          toast.error('Failed to create templates');
                          return;
                        }

                        toast.success(`Created templates for ${teachers.length} teachers`);
                        queryClient.invalidateQueries({ queryKey: ['salary-templates'] });
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Create Blank Templates
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={downloadTemplate}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV Template
                      </Button>
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload CSV
                        </Button>
                      </div>
                    </div>
                  </div>
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
