'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import CSVUploadModal from '@/components/csv-upload-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Users, 
  BookOpen, 
  Edit, 
  Trash2, 
  Upload,
  UserCheck 
} from 'lucide-react';

// Validation schema
const sectionSchema = z.object({
  grade: z.union([z.number().min(1).max(12), z.string().min(1)]),
  section: z.string().min(1, 'Section is required').max(10, 'Section name too long'),
  class_teacher: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity too high'),
});

type SectionFormData = z.infer<typeof sectionSchema>;

interface Section {
  id: string;
  grade: number | string;
  section: string;
  class_teacher?: string;
  teacher?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  capacity: number;
  students_count: number;
  created_at: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id?: string;
}

const GRADES = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'lkg', label: 'LKG' },
  { value: 'ukg', label: 'UKG' },
  { value: 'ppe1', label: 'PPE-1' },
  { value: 'ppe2', label: 'PPE-2' },
  { value: 1, label: 'Grade 1' },
  { value: 2, label: 'Grade 2' },
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
  { value: 7, label: 'Grade 7' },
  { value: 8, label: 'Grade 8' },
  { value: 9, label: 'Grade 9' },
  { value: 10, label: 'Grade 10' },
  { value: 11, label: 'Grade 11' },
  { value: 12, label: 'Grade 12' },
];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function SectionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Form setup
  const form = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      grade: 'nursery',
      section: '',
      class_teacher: 'none',
      capacity: 30,
    },
  });

  // Fetch sections with teacher information and student count
  const { data: sectionsData = [] } = useQuery({
    queryKey: ['sections-with-teachers', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          users!class_teacher(first_name, last_name, email),
          students(count)
        `)
        .eq('school_id', user?.school_id)
        .order('grade')
        .order('section');
      
      if (error) {
        console.error('Sections query error:', error);
        throw error;
      }
      
      // Transform the data to include actual student count and teacher
      const transformedData = (data || []).map(section => {
        // Handle both possible response structures from Supabase
        let studentCount = 0;
        if (section.students) {
          if (Array.isArray(section.students) && section.students.length > 0) {
            studentCount = section.students[0].count || 0;
          } else if (typeof section.students === 'object' && section.students.count !== undefined) {
            studentCount = section.students.count || 0;
          }
        }
        
        // Handle both grade (integer) and grade_text (string) fields
        const displayGrade = section.grade_text || section.grade?.toString();
        
        return {
          ...section,
          grade: displayGrade, // Use unified grade field for display
          students_count: studentCount,
          teacher: section.users || null // Map users to teacher for consistency
        };
      });
      return transformedData as Section[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch teachers for dropdown (excluding those already assigned as class teachers)
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', user?.school_id, sectionsData],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, employee_id')
        .eq('school_id', user?.school_id)
        .eq('role', 'teacher')
        .order('first_name');

      if (error) throw error;
      return data as Teacher[];
    },
    enabled: !!user?.school_id,
  });

  // Get available teachers (not assigned as class teachers to other sections)
  const getAvailableTeachers = (currentSectionId?: string) => {
    const assignedTeacherIds = sectionsData
      .filter(section => section.id !== currentSectionId && section.class_teacher)
      .map(section => section.class_teacher);
    
    return teachers.filter(teacher => !assignedTeacherIds.includes(teacher.id));
  };

  // Create mutation with teacher assignment validation
  const createMutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      // Check if teacher is already assigned to another section
      if (data.class_teacher && data.class_teacher !== 'none') {
        const existingAssignment = sectionsData.find(
          section => section.class_teacher === data.class_teacher
        );
        
        if (existingAssignment) {
          throw new Error(`This teacher is already assigned as class teacher for Grade ${existingAssignment.grade} Section ${existingAssignment.section}`);
        }
      }

      // Prepare data for database insertion
      const isTextGrade = typeof data.grade === 'string' && isNaN(Number(data.grade));
      
      const processedData: any = {
        section: data.section,
        class_teacher: data.class_teacher === 'none' ? null : data.class_teacher,
        capacity: data.capacity,
        school_id: user?.school_id,
      };

      // Add either grade or grade_text based on the input
      if (isTextGrade) {
        processedData.grade_text = data.grade;
      } else {
        processedData.grade = Number(data.grade);
      }

      const { error } = await supabase
        .from('sections')
        .insert(processedData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections-with-teachers'] });
      setIsCreateOpen(false);
      form.reset();
      toast.success('Section created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create section: ${error.message}`);
    },
  });

  // Update mutation with teacher assignment validation
  const updateMutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      if (!editingSection) return;
      
      // Check if teacher is already assigned to another section (excluding current section)
      if (data.class_teacher && data.class_teacher !== 'none') {
        const existingAssignment = sectionsData.find(
          section => section.class_teacher === data.class_teacher && section.id !== editingSection.id
        );
        
        if (existingAssignment) {
          throw new Error(`This teacher is already assigned as class teacher for Grade ${existingAssignment.grade} Section ${existingAssignment.section}`);
        }
      }

      // Prepare data for database update
      const isTextGrade = typeof data.grade === 'string' && isNaN(Number(data.grade));
      
      const processedData: any = {
        section: data.section,
        class_teacher: data.class_teacher === 'none' ? null : data.class_teacher,
        capacity: data.capacity,
      };

      // Add either grade or grade_text based on the input
      if (isTextGrade) {
        processedData.grade_text = data.grade;
        processedData.grade = null; // Clear the integer grade
      } else {
        processedData.grade = Number(data.grade);
        processedData.grade_text = null; // Clear the text grade
      }

      const { error } = await supabase
        .from('sections')
        .update(processedData)
        .eq('id', editingSection.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections-with-teachers'] });
      setIsEditOpen(false);
      setEditingSection(null);
      form.reset();
      toast.success('Section updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections-with-teachers'] });
      toast.success('Section deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });

  // Handlers
  const handleCreate = () => {
    setIsCreateOpen(true);
    form.reset({
      grade: 'nursery',
      section: '',
      class_teacher: 'none',
      capacity: 30,
    });
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    form.reset({
      grade: section.grade,
      section: section.section,
      class_teacher: section.class_teacher || 'none',
      capacity: section.capacity,
    });
    setIsEditOpen(true);
  };

  const onSubmit = (data: SectionFormData) => {
    if (editingSection) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleBulkUpload = async (csvData: any[]) => {
    try {
      const sectionsToCreate = csvData.map(row => {
        let teacherId = null;

        // Try to find teacher by employee_id first, then fall back to email
        if (row.teacher_employee_id) {
          teacherId = teachers.find(t => t.employee_id === row.teacher_employee_id)?.id || null;
        } else if (row.teacher_email) {
          teacherId = teachers.find(t => t.email === row.teacher_email)?.id || null;
        }

        return {
          grade: parseInt(row.grade),
          section: row.section.toUpperCase(),
          capacity: parseInt(row.capacity) || 30,
          class_teacher: teacherId,
          school_id: user?.school_id,
          students_count: 0,
        };
      });

      const { error } = await supabase
        .from('sections')
        .insert(sectionsToCreate);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections-with-teachers'] });
      toast.success(`Successfully imported ${csvData.length} sections`);
    } catch (error: any) {
      toast.error(`Bulk upload failed: ${error.message}`);
      throw error;
    }
  };

  // Table columns
  const columns = [
    {
      key: 'grade',
      label: 'Grade',
      sortable: true,
              render: (value: number | string, section: Section) => (
          <Badge variant="outline">
            {typeof value === 'string' ? value.toUpperCase() : `Grade ${value}`}
          </Badge>
        ),
    },
    {
      key: 'section',
      label: 'Section',
      sortable: true,
      render: (value: string, section: Section) => (
        <Badge variant="secondary">
          {value}
        </Badge>
      ),
    },
    {
      key: 'teacher',
      label: 'Class Teacher',
      render: (value: any, section: Section) => (
        <div className="flex items-center gap-2">
          {section.teacher ? (
            <>
              <UserCheck className="w-4 h-4 text-green-600" />
              <div>
                <span className="font-medium">
                  {section.teacher.first_name} {section.teacher.last_name}
                </span>
                <div className="text-xs text-gray-500">{section.teacher.email}</div>
              </div>
            </>
          ) : (
            <span className="text-gray-500 italic flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Not assigned
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'students_count',
      label: 'Students',
      sortable: true,
      render: (value: number, section: Section) => (
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{value || 0}</span>
          <span className="text-gray-500">/ {section.capacity}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      label: 'Capacity',
      sortable: true,
      render: (value: number, section: Section) => (
        <Badge 
          variant={(section.students_count || 0) >= value ? "destructive" : "secondary"}
        >
          {value}
        </Badge>
      ),
    },
  ];

  const actions = [
    {
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEdit,
      variant: 'outline' as const,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (section: Section) => {
        if (confirm(`Are you sure you want to delete Grade ${section.grade} Section ${section.section}?`)) {
          deleteMutation.mutate(section.id);
        }
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes & Sections</h1>
          <p className="text-gray-600 mt-2">Manage class sections, teacher assignments, and student capacity</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsBulkUploadOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Workflow Info Card */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Setup Workflow</h4>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Step 1:</strong> Create your Classes/Sections first using the form or bulk upload.
              </p>
              <p className="text-sm text-blue-800">
                <strong>Step 2:</strong> Then go to Students page to upload students - they will be automatically assigned to sections based on grade and section name.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sections</p>
                <p className="text-2xl font-bold text-gray-900">{sectionsData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sectionsData.reduce((sum, section) => sum + (section.students_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Class Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sectionsData.length > 0 
                    ? Math.round(sectionsData.reduce((sum, section) => sum + (section.students_count || 0), 0) / sectionsData.length)
                    : 0
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Capacity Utilization</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sectionsData.length > 0 
                    ? Math.round(
                        (sectionsData.reduce((sum, section) => sum + (section.students_count || 0), 0) /
                         sectionsData.reduce((sum, section) => sum + section.capacity, 0)) * 100
                      )
                    : 0
                  }%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EnhancedCrudTable
        entity="sections"
        columns={columns}
        title="Sections"
        searchPlaceholder="Search sections..."
        customActions={actions}
        customData={sectionsData}
        isCustomDataLoading={false}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingSection(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edit Section' : 'Create New Section'}
            </DialogTitle>
            <DialogDescription>
              {editingSection 
                ? 'Update the section details below.'
                : 'Add a new section to your school.'
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                                          <Select 
                        onValueChange={(value) => field.onChange(isNaN(Number(value)) ? value : parseInt(value))} 
                        value={field.value?.toString() || ''}
                      >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADES.map((grade) => (
                          <SelectItem key={grade.value} value={grade.value.toString()}>
                            {grade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECTIONS.map((section) => (
                          <SelectItem key={section} value={section}>
                            Section {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_teacher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Teacher (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class teacher" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No teacher assigned</SelectItem>
                        {getAvailableTeachers(editingSection?.id).map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name} {teacher.employee_id ? `- ${teacher.employee_id}` : ''}
                          </SelectItem>
                        ))}
                        {getAvailableTeachers(editingSection?.id).length === 0 && (
                          <SelectItem value="no-teachers" disabled>
                            All teachers are already assigned
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setEditingSection(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingSection ? 'Update' : 'Create'} Section
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <CSVUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        entity="sections"
        onUpload={handleBulkUpload}
      />
    </div>
  );
} 