'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Search, 
  Filter,
  DollarSign,
  Users,
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Edit2,
  Trash2,
  Download,
  Send
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface FeeCategory {
  id: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface FeeStructure {
  id: string;
  academic_year: string;
  grade: string;
  amount: number;
  payment_frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_time';
  late_fee_amount: number;
  late_fee_days: number;
  late_fee_type: 'fixed' | 'percentage';
  is_active: boolean;
  fee_categories: {
    id: string;
    name: string;
    description: string;
    is_mandatory: boolean;
  };
}

interface FeeInvoice {
  id: string;
  invoice_number: string;
  academic_year: string;
  billing_period: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  students: {
    id: string;
    full_name: string;
    grade: string;
    section: string;
    admission_no: string;
  };
}

interface FeeSummary {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  pending_count: number;
  paid_count: number;
  overdue_count: number;
  partial_count: number;
}

interface StudentFeeAssignment {
  id: string;
  student_id: string;
  discount_percentage: number;
  discount_amount: number;
  discount_reason: string | null;
  custom_amount: number | null;
  is_active: boolean;
  assigned_at: string;
  students: {
    id: string;
    full_name: string;
    grade: string;
    section: string;
    admission_no: string;
  };
  fee_structures: {
    id: string;
    academic_year: string;
    grade: string;
    amount: number;
    payment_frequency: string;
    fee_categories: {
      id: string;
      name: string;
      description: string;
    };
  };
}

export default function FeesManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fee Categories State
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_mandatory: true,
    display_order: 0
  });

  // Fee Structures State
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [showStructureDialog, setShowStructureDialog] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [structureForm, setStructureForm] = useState({
    academic_year: '2024-25',
    grade: '',
    fee_category_id: '',
    amount: 0,
    payment_frequency: 'monthly' as 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_time',
    late_fee_amount: 0,
    late_fee_days: 0,
    late_fee_type: 'fixed' as 'fixed' | 'percentage'
  });

  // Student Fee Assignments State
  const [studentAssignments, setStudentAssignments] = useState<StudentFeeAssignment[]>([]);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [assignmentGradeFilter, setAssignmentGradeFilter] = useState('all_grades');
  const [assignmentSectionFilter, setAssignmentSectionFilter] = useState('all_sections');
  const [assignmentForm, setAssignmentForm] = useState({
    academic_year: '2024-25',
    mode: 'bulk' as 'individual' | 'bulk',
    grade_filter: 'all_grades',
    section_filter: 'all_sections',
    fee_structure_ids: [] as string[],
    discount_percentage: 0,
    discount_amount: 0,
    discount_reason: ''
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Fee Invoices State
  const [feeInvoices, setFeeInvoices] = useState<FeeInvoice[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    total_invoices: 0,
    total_amount: 0,
    paid_amount: 0,
    due_amount: 0,
    pending_count: 0,
    paid_count: 0,
    overdue_count: 0,
    partial_count: 0
  });

  // Filters and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('2024-25');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Mock school ID - replace with actual school ID from auth
  const schoolId = user?.school_id || '00000000-0000-0000-0000-000000000000';

  useEffect(() => {
    loadFeeData();
  }, [activeTab, statusFilter, gradeFilter, academicYearFilter]);

  const loadFeeData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'categories') {
        await loadFeeCategories();
      } else if (activeTab === 'structures') {
        await loadFeeStructures();
        await loadGradesAndSections();
      } else if (activeTab === 'assignments') {
        await loadStudentAssignments();
        await loadAvailableStudents();
        await loadGradesAndSections();
      } else if (activeTab === 'invoices' || activeTab === 'overview') {
        await loadFeeInvoices();
      }
    } catch (error) {
      console.error('Error loading fee data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadFeeCategories = async () => {
    try {
      const response = await fetch(`/api/admin/fees/categories?school_id=${schoolId}`);
      const result = await response.json();
      
      if (response.ok) {
        setFeeCategories(result.data || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading fee categories:', error);
      toast.error('Failed to load fee categories');
    }
  };

  const loadFeeStructures = async () => {
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        ...(academicYearFilter && { academic_year: academicYearFilter }),
        ...(gradeFilter && gradeFilter !== 'all_grades' && { grade: gradeFilter })
      });

      const response = await fetch(`/api/admin/fees/structures?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        setFeeStructures(result.data || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading fee structures:', error);
      toast.error('Failed to load fee structures');
    }
  };

  const loadFeeInvoices = async () => {
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        ...(statusFilter && statusFilter !== 'all_status' && { status: statusFilter }),
        ...(gradeFilter && gradeFilter !== 'all_grades' && { grade: gradeFilter }),
        ...(academicYearFilter && { academic_year: academicYearFilter })
      });

      const response = await fetch(`/api/admin/fees/invoices?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        setFeeInvoices(result.data || []);
        setFeeSummary(result.summary || feeSummary);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading fee invoices:', error);
      toast.error('Failed to load fee invoices');
    }
  };

  const handleCreateCategory = async () => {
    console.log('🚀 handleCreateCategory called!');
    console.log('Form data:', categoryForm);
    console.log('School ID:', schoolId);
    
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/fees/categories?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Fee category created successfully');
        resetCategoryDialog();
        loadFeeCategories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating fee category:', error);
      toast.error('Failed to create fee category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateStructure = async () => {
    console.log('🚀 handleCreateStructure called!');
    console.log('Form data:', structureForm);
    console.log('School ID:', schoolId);
    
    if (!structureForm.grade.trim() || !structureForm.fee_category_id || structureForm.amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/fees/structures?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(structureForm)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Fee structure created successfully');
        resetStructureDialog();
        loadFeeStructures();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating fee structure:', error);
      toast.error('Failed to create fee structure');
    } finally {
      setActionLoading(false);
    }
  };

  const resetAssignmentDialog = () => {
    setShowAssignmentDialog(false);
    setAssignmentForm({
      academic_year: '2024-25',
      mode: 'bulk',
      grade_filter: 'all_grades',
      section_filter: 'all_sections',
      fee_structure_ids: [],
      discount_percentage: 0,
      discount_amount: 0,
      discount_reason: ''
    });
  };

  const handleCreateAssignment = async () => {
    if (!schoolId || assignmentForm.fee_structure_ids.length === 0) {
      toast.error('Please select at least one fee structure');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        assignments: [{
          fee_structure_ids: assignmentForm.fee_structure_ids,
          discount_percentage: assignmentForm.discount_percentage,
          discount_amount: assignmentForm.discount_amount,
          discount_reason: assignmentForm.discount_reason || undefined
        }],
        apply_to_all: assignmentForm.mode === 'bulk',
        grade_filter: assignmentForm.mode === 'bulk' && assignmentForm.grade_filter !== 'all_grades' ? assignmentForm.grade_filter : undefined,
        section_filter: assignmentForm.mode === 'bulk' && assignmentForm.section_filter !== 'all_sections' ? assignmentForm.section_filter : undefined,
        overwrite_existing: true
      };

      const response = await fetch(`/api/admin/fees/assign-students?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Successfully assigned fees to ${result.data.successful_assignments} students`);
        resetAssignmentDialog();
        loadStudentAssignments();
      } else {
        toast.error(result.error || 'Failed to assign fees');
      }
    } catch (error) {
      console.error('Error assigning fees:', error);
      toast.error('Failed to assign fees');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAssignment = (assignment: StudentFeeAssignment) => {
    console.log('Edit assignment:', assignment);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    console.log('Delete assignment:', assignmentId);
  };

  const loadStudentAssignments = async () => {
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        ...(academicYearFilter && { academic_year: academicYearFilter }),
        ...(gradeFilter && gradeFilter !== 'all_grades' && { grade: gradeFilter })
      });

      const response = await fetch(`/api/admin/fees/assign-students?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        setStudentAssignments(result.data || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading student assignments:', error);
      toast.error('Failed to load student assignments');
    }
  };

  const loadGradesAndSections = async () => {
    if (!schoolId) return;
    
    try {
      const response = await fetch(`/api/admin/grades-sections?school_id=${schoolId}`);
      if (response.ok) {
        const result = await response.json();
        setAvailableGrades(result.data.grades || []);
        setAvailableSections(result.data.sections || []);
      }
    } catch (error) {
      console.error('Error loading grades and sections:', error);
    }
  };

  const loadAvailableStudents = async () => {
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        ...(gradeFilter && gradeFilter !== 'all_grades' && { grade: gradeFilter })
      });

      const response = await fetch(`/api/admin/students?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        setAvailableStudents(result.data || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  };

  // Category Dialog Functions
  const resetCategoryDialog = () => {
    setShowCategoryDialog(false);
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      is_mandatory: true,
      display_order: 0
    });
  };

  // Category Edit/Delete Functions
  const handleEditCategory = (category: FeeCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      is_mandatory: category.is_mandatory,
      display_order: category.display_order
    });
    setShowCategoryDialog(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/fees/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Fee category updated successfully');
        resetCategoryDialog();
        loadFeeCategories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating fee category:', error);
      toast.error('Failed to update fee category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this fee category?')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/fees/categories/${categoryId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Fee category deleted successfully');
        loadFeeCategories();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting fee category:', error);
      toast.error('Failed to delete fee category');
    } finally {
      setActionLoading(false);
    }
  };

  // Structure Edit/Delete Functions
  const handleEditStructure = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setStructureForm({
      academic_year: structure.academic_year,
      grade: structure.grade,
      fee_category_id: structure.fee_categories.id,
      amount: structure.amount,
      payment_frequency: structure.payment_frequency,
      late_fee_amount: structure.late_fee_amount,
      late_fee_days: structure.late_fee_days,
      late_fee_type: structure.late_fee_type
    });
    setShowStructureDialog(true);
  };

  const handleUpdateStructure = async () => {
    if (!editingStructure) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/fees/structures/${editingStructure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(structureForm)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Fee structure updated successfully');
        resetStructureDialog();
        loadFeeStructures();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating fee structure:', error);
      toast.error('Failed to update fee structure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStructure = async (structureId: string) => {
    if (!window.confirm('Are you sure you want to delete this fee structure?')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/fees/structures/${structureId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Fee structure deleted successfully');
        loadFeeStructures();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting fee structure:', error);
      toast.error('Failed to delete fee structure');
    } finally {
      setActionLoading(false);
    }
  };

  const resetStructureDialog = () => {
    setShowStructureDialog(false);
    setEditingStructure(null);
    setStructureForm({
      academic_year: '2024-25',
      grade: '',
      fee_category_id: '',
      amount: 0,
      payment_frequency: 'monthly',
      late_fee_amount: 0,
      late_fee_days: 0,
      late_fee_type: 'fixed'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'default';
      case 'overdue': return 'destructive';
      case 'partial': return 'warning';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground">
            Manage fee categories, structures, invoices, and payments
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="structures">Structures</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(feeSummary.total_amount)}</div>
                <p className="text-xs text-muted-foreground">
                  From {feeSummary.total_invoices} invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collected</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(feeSummary.paid_amount)}</div>
                <p className="text-xs text-muted-foreground">
                  {feeSummary.paid_count} paid invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(feeSummary.due_amount)}</div>
                <p className="text-xs text-muted-foreground">
                  {feeSummary.pending_count + feeSummary.partial_count} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{feeSummary.overdue_count}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feeInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{invoice.students.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.invoice_number} • {invoice.students.grade}-{invoice.students.section}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[250px]"
              />
            </div>
            <Button onClick={() => setShowCategoryDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Dialog open={showCategoryDialog} onOpenChange={(open) => !open && resetCategoryDialog()}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Fee Category' : 'Create Fee Category'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  console.log('🔥 Form submitted!');
                  if (editingCategory) {
                    handleUpdateCategory();
                  } else {
                    handleCreateCategory();
                  }
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Category Name</Label>
                      <Input
                      id="name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="e.g., Tuition, Transport, Meals"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={categoryForm.display_order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_mandatory"
                      checked={categoryForm.is_mandatory}
                      onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_mandatory: checked })}
                    />
                    <Label htmlFor="is_mandatory">Mandatory Fee</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={resetCategoryDialog}>
                      Cancel
                    </Button>
                    <Button 
                      disabled={actionLoading}
                      type="submit"
                    >
                      {actionLoading ? (editingCategory ? 'Updating...' : 'Creating...') : (editingCategory ? 'Update Category' : 'Create Category')}
                    </Button>
                  </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-4 p-6">
                {loading ? (
                  <div className="text-center py-8">Loading categories...</div>
                ) : feeCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No fee categories found. Create your first category to get started.
                  </div>
                ) : (
                  feeCategories
                    .filter(category => 
                      category.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{category.name}</h3>
                            {category.is_mandatory && (
                              <Badge variant="secondary">Mandatory</Badge>
                            )}
                            {!category.is_active && (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditCategory(category)}
                            disabled={actionLoading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={actionLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Structures Tab */}
        <TabsContent value="structures" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_grades">All Grades</SelectItem>
                  <SelectItem value="Nursery">Nursery</SelectItem>
                  <SelectItem value="LKG">LKG</SelectItem>
                  <SelectItem value="UKG">UKG</SelectItem>
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowStructureDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Structure
            </Button>
            <Dialog open={showStructureDialog} onOpenChange={(open) => !open && resetStructureDialog()}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  console.log('🔥 Structure Form submitted!');
                  if (editingStructure) {
                    handleUpdateStructure();
                  } else {
                    handleCreateStructure();
                  }
                }}>
                  <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Academic Year</Label>
                      <Select 
                        value={structureForm.academic_year} 
                        onValueChange={(value) => setStructureForm({ ...structureForm, academic_year: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-25">2024-25</SelectItem>
                          <SelectItem value="2025-26">2025-26</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Grade</Label>
                      <Select 
                        value={structureForm.grade} 
                        onValueChange={(value) => setStructureForm({ ...structureForm, grade: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nursery">Nursery</SelectItem>
                          <SelectItem value="LKG">LKG</SelectItem>
                          <SelectItem value="UKG">UKG</SelectItem>
                          {availableGrades.length > 0 ? availableGrades.map((grade) => (
                            <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                          )) : Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={`${i + 1}`}>
                              Grade {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fee Category</Label>
                      <Select 
                        value={structureForm.fee_category_id} 
                        onValueChange={(value) => setStructureForm({ ...structureForm, fee_category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {feeCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={structureForm.amount}
                        onChange={(e) => setStructureForm({ ...structureForm, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Payment Frequency</Label>
                    <Select 
                      value={structureForm.payment_frequency} 
                      onValueChange={(value: any) => setStructureForm({ ...structureForm, payment_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="half_yearly">Half Yearly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="one_time">One Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Late Fee Amount</Label>
                      <Input
                        type="number"
                        value={structureForm.late_fee_amount}
                        onChange={(e) => setStructureForm({ ...structureForm, late_fee_amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Late Fee Days</Label>
                      <Input
                        type="number"
                        value={structureForm.late_fee_days}
                        onChange={(e) => setStructureForm({ ...structureForm, late_fee_days: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Late Fee Type</Label>
                      <Select 
                        value={structureForm.late_fee_type} 
                        onValueChange={(value: any) => setStructureForm({ ...structureForm, late_fee_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={resetStructureDialog}>
                      Cancel
                    </Button>
                    <Button 
                      disabled={actionLoading}
                      type="submit"
                    >
                      {actionLoading ? (editingStructure ? 'Updating...' : 'Creating...') : (editingStructure ? 'Update Structure' : 'Create Structure')}
                    </Button>
                  </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-4 p-6">
                {loading ? (
                  <div className="text-center py-8">Loading fee structures...</div>
                ) : feeStructures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No fee structures found for the selected filters.
                  </div>
                ) : (
                  feeStructures.map((structure) => (
                    <div key={structure.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">
                            {structure.fee_categories.name} - {structure.grade}
                          </h3>
                          <Badge variant="outline">{structure.academic_year}</Badge>
                          <Badge variant="secondary">{structure.payment_frequency}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Amount: {formatCurrency(structure.amount)}
                          {structure.late_fee_amount > 0 && (
                            <span> • Late fee: {formatCurrency(structure.late_fee_amount)} after {structure.late_fee_days} days</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditStructure(structure)}
                          disabled={actionLoading}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600"
                          onClick={() => handleDeleteStructure(structure.id)}
                          disabled={actionLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={assignmentGradeFilter} onValueChange={setAssignmentGradeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_grades">All Grades</SelectItem>
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignmentSectionFilter} onValueChange={setAssignmentSectionFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_sections">All Sections</SelectItem>
                  {availableSections.map((section) => (
                    <SelectItem key={section} value={section}>Section {section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowAssignmentDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Fees
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-4 p-6">
                {loading ? (
                  <div className="text-center py-8">Loading assignments...</div>
                ) : studentAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No student fee assignments found. Start by assigning fees to students.
                  </div>
                ) : (
                  studentAssignments
                    .filter(assignment => {
                      if (assignmentGradeFilter !== 'all_grades' && assignment.students.grade !== assignmentGradeFilter) return false;
                      if (assignmentSectionFilter !== 'all_sections' && assignment.students.section !== assignmentSectionFilter) return false;
                      return true;
                    })
                    .map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{assignment.students.full_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Grade {assignment.students.grade} • Section {assignment.students.section} • {assignment.fee_structures.fee_categories.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Amount: {formatCurrency(assignment.fee_structures.amount)} 
                            {assignment.discount_amount > 0 && ` • Discount: ${formatCurrency(assignment.discount_amount)}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                            {assignment.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handleEditAssignment(assignment)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteAssignment(assignment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={showAssignmentDialog} onOpenChange={(open) => !open && resetAssignmentDialog()}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Assign Fee Structures to Students</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateAssignment();
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Academic Year</Label>
                      <Select value={assignmentForm.academic_year} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, academic_year: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-25">2024-25</SelectItem>
                          <SelectItem value="2025-26">2025-26</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assignment Mode</Label>
                      <Select value={assignmentForm.mode} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, mode: value as 'individual' | 'bulk' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual Students</SelectItem>
                          <SelectItem value="bulk">Bulk Assignment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {assignmentForm.mode === 'bulk' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Grade Filter</Label>
                        <Select value={assignmentForm.grade_filter} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, grade_filter: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_grades">All Grades</SelectItem>
                            {availableGrades.map((grade) => (
                              <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Section Filter</Label>
                        <Select value={assignmentForm.section_filter} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, section_filter: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_sections">All Sections</SelectItem>
                            {availableSections.map((section) => (
                              <SelectItem key={section} value={section}>Section {section}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Fee Structures</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {feeStructures
                        .filter(structure => structure.academic_year === assignmentForm.academic_year)
                        .map((structure) => (
                          <label key={structure.id} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-accent">
                            <input
                              type="checkbox"
                              checked={assignmentForm.fee_structure_ids.includes(structure.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignmentForm({
                                    ...assignmentForm,
                                    fee_structure_ids: [...assignmentForm.fee_structure_ids, structure.id]
                                  });
                                } else {
                                  setAssignmentForm({
                                    ...assignmentForm,
                                    fee_structure_ids: assignmentForm.fee_structure_ids.filter(id => id !== structure.id)
                                  });
                                }
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium">{structure.fee_categories.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Grade {structure.grade} • {formatCurrency(structure.amount)} • {structure.payment_frequency}
                              </p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={assignmentForm.discount_percentage}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Discount Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        value={assignmentForm.discount_amount}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, discount_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Discount Reason</Label>
                    <Textarea
                      value={assignmentForm.discount_reason}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, discount_reason: e.target.value })}
                      placeholder="Optional reason for discount"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={resetAssignmentDialog}>
                      Cancel
                    </Button>
                    <Button 
                      disabled={actionLoading || assignmentForm.fee_structure_ids.length === 0}
                      type="submit"
                    >
                      {actionLoading ? 'Assigning...' : 'Assign Fees'}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>
                Record and track fee payments from students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Payment management interface coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search by student name or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[250px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_status">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_grades">All Grades</SelectItem>
                  <SelectItem value="Nursery">Nursery</SelectItem>
                  <SelectItem value="LKG">LKG</SelectItem>
                  <SelectItem value="UKG">UKG</SelectItem>
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Reminders
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-4 p-6">
                {loading ? (
                  <div className="text-center py-8">Loading invoices...</div>
                ) : feeInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices found for the selected filters.
                  </div>
                ) : (
                  feeInvoices
                    .filter(invoice => 
                      invoice.students.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{invoice.students.full_name}</h3>
                            <Badge variant="outline">{invoice.students.grade}-{invoice.students.section}</Badge>
                            <Badge variant={getStatusBadgeVariant(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {invoice.invoice_number} • {invoice.billing_period} • Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                          <p className="text-sm text-muted-foreground">
                            Paid: {formatCurrency(invoice.paid_amount)} • Due: {formatCurrency(invoice.due_amount)}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}