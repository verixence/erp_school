'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
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
import { Plus, Users, BookOpen, Edit, Trash2, Upload } from 'lucide-react';
import CSVUploadModal from '@/components/csv-upload-modal';

// Validation schema
const sectionSchema = z.object({
  grade: z.number().min(1, 'Grade must be between 1-12').max(12, 'Grade must be between 1-12'),
  section: z.string().min(1, 'Section is required').max(10, 'Section too long'),
  class_teacher: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity too high'),
});

type SectionFormData = z.infer<typeof sectionSchema>;

interface Section {
  id: string;
  grade: number;
  section: string;
  class_teacher?: string;
  teacher?: {
    first_name: string;
    last_name: string;
  };
  capacity: number;
  students_count: number;
  created_at: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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
      grade: 1,
      section: '',
      class_teacher: 'none',
      capacity: 30,
    },
  });

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('school_id', user?.school_id)
        .eq('role', 'teacher')
        .order('first_name');
      
      if (error) throw error;
      return data as Teacher[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch sections with joined teacher data and student counts
  const { data: sectionsData = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          teacher:users!sections_class_teacher_fkey(first_name, last_name)
        `)
        .eq('school_id', user?.school_id)
        .order('grade')
        .order('section');
      
      if (error) throw error;
      
      // Get student counts for each section using section_id
      const sectionsWithCounts = await Promise.all(
        (data || []).map(async (section) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', section.id);
          
          return {
            ...section,
            students_count: count || 0
          };
        })
      );
      
      return sectionsWithCounts as Section[];
    },
    enabled: !!user?.school_id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      // Convert "none" to null for class_teacher
      const processedData = {
        ...data,
        class_teacher: data.class_teacher === 'none' ? null : data.class_teacher,
        school_id: user?.school_id,
      };

      const { error } = await supabase
        .from('sections')
        .insert(processedData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setIsCreateOpen(false);
      form.reset();
      toast.success('Section created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create section: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      if (!editingSection) return;
      
      // Convert "none" to null for class_teacher
      const processedData = {
        ...data,
        class_teacher: data.class_teacher === 'none' ? null : data.class_teacher,
      };

      const { error } = await supabase
        .from('sections')
        .update(processedData)
        .eq('id', editingSection.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
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
      toast.success('Section deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });

  const handleCreate = () => {
    form.reset({
      grade: 1,
      section: '',
      class_teacher: 'none',
      capacity: 30,
    });
    setIsCreateOpen(true);
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
      const processedData = csvData.map(row => ({
        grade: parseInt(row.grade) || 1,
        section: row.section || 'A',
        class_teacher: row.teacher_id || null,
        capacity: parseInt(row.capacity) || 30,
        school_id: user?.school_id,
      }));

      const { error } = await supabase
        .from('sections')
        .insert(processedData);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setIsBulkUploadOpen(false);
      toast.success(`${processedData.length} sections uploaded successfully`);
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const columns = [
    {
      key: 'grade',
      label: 'Grade',
      sortable: true,
      render: (section: Section) => (
        <Badge variant="outline" className="font-medium">
          Grade {section.grade}
        </Badge>
      ),
    },
    {
      key: 'section',
      label: 'Section',
      sortable: true,
      render: (section: Section) => (
        <Badge className="bg-indigo-100 text-indigo-800">
          Section {section.section}
        </Badge>
      ),
    },
    {
      key: 'teacher',
      label: 'Class Teacher',
      render: (section: Section) => (
        <div>
          {section.teacher ? (
            <span className="font-medium">
              {section.teacher.first_name} {section.teacher.last_name}
            </span>
          ) : (
            <span className="text-gray-500 italic">Not assigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'students_count',
      label: 'Students',
      sortable: true,
      render: (section: Section) => (
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{section.students_count}</span>
          <span className="text-gray-500">/ {section.capacity}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      label: 'Capacity',
      sortable: true,
      render: (section: Section) => (
        <Badge 
          variant={section.students_count >= section.capacity ? "destructive" : "secondary"}
        >
          {section.capacity}
        </Badge>
      ),
    },
  ];

  const actions = [
    {
      label: 'Edit',
      icon: Edit,
      onClick: handleEdit,
      variant: 'outline' as const,
    },
    {
      label: 'Delete',
      icon: Trash2,
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
          <h1 className="text-3xl font-bold text-gray-900">Sections Management</h1>
          <p className="text-gray-600 mt-2">Manage class sections and student assignments</p>
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
                  {sectionsData.reduce((sum, section) => sum + section.students_count, 0)}
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
                    ? Math.round(sectionsData.reduce((sum, section) => sum + section.students_count, 0) / sectionsData.length)
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
                        (sectionsData.reduce((sum, section) => sum + section.students_count, 0) /
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
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade.toString()}>
                            Grade {grade}
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
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
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