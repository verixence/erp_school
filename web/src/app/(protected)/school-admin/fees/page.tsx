'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, AlertCircle, Users, CreditCard, FileText, ArrowLeft, Plus, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface SetupStatus {
  categories_complete: boolean;
  categories_count: number;
  structures_complete: boolean;
  structures_coverage: number;
  assignments_complete: boolean;
  assignments_count: number;
  total_students: number;
  grades: string[];
  sections: string[];
}

interface DashboardStats {
  total_outstanding: number;
  monthly_collections: number;
  overdue_count: number;
  recent_payments: number;
}

interface FeeCategory {
  id: string;
  name: string;
  description: string;
  is_mandatory: boolean;
}

interface FeeStructure {
  id: string;
  grade: string;
  amount: number;
  payment_frequency: string;
  fee_category_id: string;
  category_name?: string;
}

export default function FeeManagementNew() {
  const { user } = useAuth();
  const schoolId = user?.school_id;
  
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation state
  const [currentView, setCurrentView] = useState<'main' | 'setup-categories' | 'setup-structures' | 'setup-assignments'>('main');
  
  // Setup data
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', is_mandatory: true });
  const [newStructure, setNewStructure] = useState({ grade: '', amount: '', payment_frequency: 'monthly', fee_category_id: '' });
  const [saving, setSaving] = useState(false);

  // Calculate setup completion
  const setupProgress = setupStatus ? 
    ((setupStatus.categories_complete ? 33 : 0) + 
     (setupStatus.structures_complete ? 33 : 0) + 
     (setupStatus.assignments_complete ? 34 : 0)) : 0;

  const isSetupComplete = setupProgress === 100;

  // Load setup status from APIs
  const loadSetupStatus = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      // Load all data in parallel
      const [categoriesRes, structuresRes, assignmentsRes, gradesRes, studentsRes] = await Promise.all([
        fetch(`/api/admin/fees/categories?school_id=${schoolId}`),
        fetch(`/api/admin/fees/structures?school_id=${schoolId}`),
        fetch(`/api/admin/fees/assign-students?school_id=${schoolId}`),
        fetch(`/api/admin/grades-sections?school_id=${schoolId}`),
        fetch(`/api/admin/students?school_id=${schoolId}`)
      ]);

      const [categoriesData, structuresData, assignments, gradesSections, students] = await Promise.all([
        categoriesRes.json(),
        structuresRes.json(), 
        assignmentsRes.json(),
        gradesRes.json(),
        studentsRes.json()
      ]);

      const grades = gradesSections.data?.grades || [];
      const sections = gradesSections.data?.sections || [];
      
      // Set categories and structures for setup views
      setCategories(categoriesData.data || []);
      setStructures(structuresData.data || []);
      
      // Calculate structure coverage (should cover all grades)
      const structuresPerGrade = structuresData.data?.reduce((acc: any, struct: any) => {
        acc[struct.grade] = (acc[struct.grade] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const structuresCoverage = grades.length > 0 ? 
        (Object.keys(structuresPerGrade).length / grades.length) * 100 : 0;

      setSetupStatus({
        categories_complete: (categoriesData.data?.length || 0) >= 2,
        categories_count: categoriesData.data?.length || 0,
        structures_complete: structuresCoverage >= 80,
        structures_coverage: structuresCoverage,
        assignments_complete: (assignments.data?.length || 0) > 0,
        assignments_count: assignments.data?.length || 0,
        total_students: students.data?.length || 0,
        grades,
        sections
      });

    } catch (error) {
      console.error('Error loading setup status:', error);
      toast.error('Failed to load setup status');
    } finally {
      setLoading(false);
    }
  };

  // Save new category
  const saveCategory = async () => {
    if (!schoolId || !newCategory.name.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/fees/categories?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      if (response.ok) {
        toast.success('Category created successfully');
        setNewCategory({ name: '', description: '', is_mandatory: true });
        await loadSetupStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  // Save new structure
  const saveStructure = async () => {
    if (!schoolId || !newStructure.grade || !newStructure.amount || !newStructure.fee_category_id) return;
    
    setSaving(true);
    try {
      const structureData = {
        ...newStructure,
        amount: parseFloat(newStructure.amount),
        academic_year: new Date().getFullYear().toString()
      };

      const response = await fetch(`/api/admin/fees/structures?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(structureData)
      });

      if (response.ok) {
        toast.success('Fee structure created successfully');
        setNewStructure({ grade: '', amount: '', payment_frequency: 'monthly', fee_category_id: '' });
        await loadSetupStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create structure');
      }
    } catch (error) {
      console.error('Error creating structure:', error);
      toast.error('Failed to create structure');
    } finally {
      setSaving(false);
    }
  };

  // Load dashboard stats for operations
  const loadDashboardStats = async () => {
    if (!schoolId) return;
    
    try {
      const response = await fetch(`/api/admin/fees/dashboard-stats?school_id=${schoolId}`);
      if (response.ok) {
        const result = await response.json();
        setDashboardStats(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  useEffect(() => {
    if (schoolId) {
      loadSetupStatus();
      if (isSetupComplete) {
        loadDashboardStats();
      }
    }
  }, [schoolId]);

  // Load data when entering setup views
  useEffect(() => {
    if (schoolId && (currentView === 'setup-categories' || currentView === 'setup-structures' || currentView === 'setup-assignments')) {
      loadSetupStatus();
    }
  }, [currentView, schoolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading fee management...</p>
        </div>
      </div>
    );
  }

  // Categories Setup View
  if (currentView === 'setup-categories') {
    if (loading || !setupStatus) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading categories...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setCurrentView('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Setup
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Fee Categories</h1>
            <p className="text-muted-foreground">Create categories like Tuition, Transport, etc.</p>
          </div>
        </div>

        {/* Add New Category */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Category</CardTitle>
            <CardDescription>Categories help organize different types of fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Tuition, Transport, Lab Fee"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                placeholder="Brief description of this fee category"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mandatory"
                checked={newCategory.is_mandatory}
                onCheckedChange={(checked) => setNewCategory({ ...newCategory, is_mandatory: !!checked })}
              />
              <Label htmlFor="mandatory">Mandatory for all students</Label>
            </div>
            <Button onClick={saveCategory} disabled={saving || !newCategory.name.trim()}>
              {saving ? 'Saving...' : 'Add Category'}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Categories ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-muted-foreground">No categories created yet</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <Badge variant={category.is_mandatory ? 'default' : 'secondary'}>
                      {category.is_mandatory ? 'Mandatory' : 'Optional'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {categories.length >= 2 && (
          <div className="flex justify-end">
            <Button onClick={() => setCurrentView('main')}>
              Continue to Next Step
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Structures Setup View
  if (currentView === 'setup-structures') {
    if (loading || !setupStatus) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading grades and categories...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setCurrentView('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Setup
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Fee Structures</h1>
            <p className="text-muted-foreground">Set amounts for each grade and category (Available grades: {setupStatus.grades.length})</p>
          </div>
        </div>

        {/* Add New Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Add Fee Structure</CardTitle>
            <CardDescription>Define fee amounts for specific grades and categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="structure-grade">Grade</Label>
                <Select value={newStructure.grade} onValueChange={(value) => setNewStructure({ ...newStructure, grade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {setupStatus?.grades.map((grade) => (
                      <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="structure-category">Category</Label>
                <Select value={newStructure.fee_category_id} onValueChange={(value) => setNewStructure({ ...newStructure, fee_category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="structure-amount">Amount (₹)</Label>
                <Input
                  id="structure-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={newStructure.amount}
                  onChange={(e) => setNewStructure({ ...newStructure, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="structure-frequency">Payment Frequency</Label>
                <Select value={newStructure.payment_frequency} onValueChange={(value) => setNewStructure({ ...newStructure, payment_frequency: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveStructure} disabled={saving || !newStructure.grade || !newStructure.amount || !newStructure.fee_category_id}>
              {saving ? 'Saving...' : 'Add Structure'}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Structures */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Structures ({structures.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {structures.length === 0 ? (
              <p className="text-muted-foreground">No fee structures created yet</p>
            ) : (
              <div className="space-y-2">
                {setupStatus?.grades.map((grade) => {
                  const gradeStructures = structures.filter(s => s.grade === grade);
                  return (
                    <div key={grade} className="border rounded-md p-3">
                      <h4 className="font-medium mb-2">Grade {grade}</h4>
                      {gradeStructures.length === 0 ? (
                        <p className="text-sm text-orange-600">No structures for this grade</p>
                      ) : (
                        <div className="space-y-1">
                          {gradeStructures.map((structure) => {
                            const category = categories.find(c => c.id === structure.fee_category_id);
                            return (
                              <div key={structure.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <span className="text-sm">{category?.name}</span>
                                <Badge>₹{structure.amount.toLocaleString()}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {setupStatus?.structures_complete && (
          <div className="flex justify-end">
            <Button onClick={() => setCurrentView('main')}>
              Continue to Next Step
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Assignments Setup View
  if (currentView === 'setup-assignments') {
    if (loading || !setupStatus) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading student assignments...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setCurrentView('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Setup
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Student Fee Assignments</h1>
            <p className="text-muted-foreground">Assign fee structures to your {setupStatus?.total_students} students</p>
          </div>
        </div>

        {/* Quick Assignment Options */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Assign by Grade</CardTitle>
              <CardDescription>Automatically assign all students in a grade to their respective fee structures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {setupStatus?.grades.map((grade) => {
                const gradeStructures = structures.filter(s => s.grade === grade);
                const gradeStudentCount = setupStatus.total_students; // Would need API to get per-grade count
                
                return (
                  <div key={grade} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <h4 className="font-medium">Grade {grade}</h4>
                      <p className="text-sm text-muted-foreground">
                        {gradeStructures.length} structures available
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      disabled={gradeStructures.length === 0}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const response = await fetch(`/api/admin/fees/assign-students?school_id=${schoolId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              apply_to_all: true,
                              grade_filter: grade,
                              assignments: [{
                                fee_structure_ids: gradeStructures.map(s => s.id),
                                discount_percentage: 0
                              }]
                            })
                          });

                          if (response.ok) {
                            toast.success(`Assigned fees to Grade ${grade} students`);
                            await loadSetupStatus();
                          } else {
                            const error = await response.json();
                            toast.error(error.error || 'Failed to assign fees');
                          }
                        } catch (error) {
                          console.error('Error assigning fees:', error);
                          toast.error('Failed to assign fees');
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? 'Assigning...' : 'Auto-Assign'}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Assignment</CardTitle>
              <CardDescription>Assign fees to specific students with custom discounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Individual student assignment interface</p>
                <p className="text-sm">Would list students with assignment controls</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {setupStatus?.assignments_complete && (
          <div className="flex justify-end">
            <Button onClick={() => setCurrentView('main')}>
              Complete Setup
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Setup Wizard View
  if (!isSetupComplete) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Fee Management Setup</h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your fee management system for {setupStatus?.total_students} students
          </p>
          <div className="mt-4">
            <Progress value={setupProgress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">{setupProgress}% Complete</p>
          </div>
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          {/* Step 1: Categories */}
          <Card className={setupStatus?.categories_complete ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {setupStatus?.categories_complete ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  )}
                  <div>
                    <CardTitle>Step 1: Fee Categories</CardTitle>
                    <CardDescription>
                      Create categories like Tuition, Transport, etc.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={setupStatus?.categories_complete ? 'default' : 'secondary'}>
                  {setupStatus?.categories_count} categories
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {setupStatus?.categories_complete ? (
                <p className="text-green-700">✅ Categories are set up and ready</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-orange-700">Create at least 2 fee categories to continue</p>
                  <Button onClick={() => setCurrentView('setup-categories')}>
                    Set Up Categories
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Structures */}
          <Card className={setupStatus?.structures_complete ? 'border-green-200 bg-green-50' : 
            setupStatus?.categories_complete ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {setupStatus?.structures_complete ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : setupStatus?.categories_complete ? (
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <CardTitle>Step 2: Fee Structures</CardTitle>
                    <CardDescription>
                      Set amounts for each grade and category
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={setupStatus?.structures_complete ? 'default' : 'secondary'}>
                  {Math.round(setupStatus?.structures_coverage || 0)}% coverage
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!setupStatus?.categories_complete ? (
                <p className="text-gray-500">Complete categories first</p>
              ) : setupStatus?.structures_complete ? (
                <p className="text-green-700">✅ Fee structures cover all {setupStatus.grades.length} grades</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-orange-700">
                    Set fee amounts for grades: {setupStatus?.grades.join(', ')}
                  </p>
                  <Button onClick={() => setCurrentView('setup-structures')}>
                    Set Up Structures
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Assignments */}
          <Card className={setupStatus?.assignments_complete ? 'border-green-200 bg-green-50' : 
            setupStatus?.structures_complete ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {setupStatus?.assignments_complete ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : setupStatus?.structures_complete ? (
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <CardTitle>Step 3: Student Assignments</CardTitle>
                    <CardDescription>
                      Assign fee structures to your {setupStatus?.total_students} students
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={setupStatus?.assignments_complete ? 'default' : 'secondary'}>
                  {setupStatus?.assignments_count} assigned
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!setupStatus?.structures_complete ? (
                <p className="text-gray-500">Complete structures first</p>
              ) : setupStatus?.assignments_complete ? (
                <p className="text-green-700">✅ Students have been assigned fee structures</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-orange-700">
                    Assign fees to {setupStatus?.total_students} students across {setupStatus?.grades.length} grades
                  </p>
                  <Button onClick={() => setCurrentView('setup-assignments')}>
                    Assign Student Fees
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Setup Complete - Go to Operations */}
          {isSetupComplete && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="text-center pt-6">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Setup Complete! 🎉</h3>
                <p className="text-muted-foreground mb-4">
                  Your fee management system is ready. You can now generate invoices and record payments.
                </p>
                <Button size="lg" onClick={() => window.location.reload()}>
                  Go to Operations Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Operations Dashboard View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground">
            Operations dashboard for {setupStatus?.total_students} students
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentView('main')}>
          ⚙️ Setup Mode
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Generate Invoices</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Create monthly bills for students
            </p>
            <Button className="w-full">Generate This Month</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Record Payment</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Enter payment received from parent
            </p>
            <Button className="w-full" variant="outline">Quick Entry</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Follow Up</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Contact parents with pending payments
            </p>
            <Button className="w-full" variant="outline">View Overdue</Button>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">₹{(dashboardStats?.total_outstanding || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Pending collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">This Month</p>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">₹{(dashboardStats?.monthly_collections || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Collected so far</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{dashboardStats?.overdue_count || 0}</p>
            <p className="text-sm text-muted-foreground">Need follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Recent</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{dashboardStats?.recent_payments || 0}</p>
            <p className="text-sm text-muted-foreground">Today's payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Recent invoices and payments will appear here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}