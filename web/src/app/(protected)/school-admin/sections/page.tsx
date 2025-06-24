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
  class_name: z.string().min(1, 'Section name is required').max(50, 'Section name too long'),
  grade: z.string().min(1, 'Grade is required'),
  section: z.string().min(1, 'Section is required').max(10, 'Section too long'),
  teacher_id: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity too high'),
});

type SectionFormData = z.infer<typeof sectionSchema>;

interface Section {
  id: string;
  class_name: string;
  grade: string;
  section: string;
  teacher_id?: string;
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

const GRADES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

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
      class_name: '',
      grade: '',
      section: '',
      teacher_id: 'none',
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
        .from('classes')
        .select(`
          *,
          teacher:users!classes_teacher_id_fkey(first_name, last_name)
        `)
        .eq('school_id', user?.school_id)
        .order('grade')
        .order('section');
      
      if (error) throw error;
      
      // Get student counts for each section
      const sectionsWithCounts = await Promise.all(
        (data || []).map(async (section) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', user?.school_id)
            .eq('grade', section.grade)
            .eq('section', section.section);
          
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
      // Convert "none" to null for teacher_id
      const processedData = {
        ...data,
        teacher_id: data.teacher_id === 'none' ? null : data.teacher_id,
        school_id: user?.school_id,
      };

      const { error } = await supabase
        .from('classes')
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
      
      // Convert "none" to null for teacher_id
      const processedData = {
        ...data,
        teacher_id: data.teacher_id === 'none' ? null : data.teacher_id,
      };

      const { error } = await supabase
        .from('classes')
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

  // Handlers
  const handleCreate = () => {
    setIsCreateOpen(true);
    form.reset({
      class_name: '',
      grade: '',
      section: '',
      teacher_id: 'none',
      capacity: 30,
    });
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    form.reset({
      class_name: section.class_name,
      grade: section.grade,
      section: section.section,
      teacher_id: section.teacher_id || 'none',
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
      const response = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'sections',
          data: csvData,
          school_id: user?.school_id
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      if (result.errors && result.errors.length > 0) {
        console.warn('Import completed with errors:', result.errors);
        toast.success(`Imported ${result.imported.length} sections. ${result.errors.length} errors occurred.`);
      } else {
        toast.success(`Successfully imported ${result.imported.length} sections`);
      }

      // Refresh the sections data
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      
    } catch (error: any) {
      console.error('Bulk import error:', error);
      throw error;
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: 'section_display',
      label: 'Section (Grade | Section)',
      render: (value: any, item: Section) => (
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-medium">{item.grade} | {item.section}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'class_teacher',
      label: 'Class Teacher',
      render: (value: any, item: Section) => 
        item.teacher ? (
          <span>{item.teacher.first_name} {item.teacher.last_name}</span>
        ) : (
          <Badge variant="outline">No teacher assigned</Badge>
        ),
      sortable: false,
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (value: any, item: Section) => (
        <Badge variant="secondary">{item.capacity}</Badge>
      ),
      sortable: true,
    },
    {
      key: 'students_count',
      label: 'Students Count',
      render: (value: any, item: Section) => (
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{item.students_count || 0}</span>
        </div>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">
            Manage school sections and class assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {sectionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sectionsData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sections found. Create your first section to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-left text-sm font-medium"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionsData.map((section) => (
                    <tr key={section.id} className="border-b hover:bg-muted/30">
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3">
                          {column.render 
                            ? column.render((section as any)[column.key], section)
                            : (section as any)[column.key]
                          }
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(section)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this section?')) {
                                const { error } = await supabase
                                  .from('classes')
                                  .delete()
                                  .eq('id', section.id);
                                
                                if (error) {
                                  toast.error(`Failed to delete section: ${error.message}`);
                                } else {
                                  queryClient.invalidateQueries({ queryKey: ['sections'] });
                                  toast.success('Section deleted successfully');
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section for your school. Fill in the section details below.
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade}>
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
                    <FormControl>
                      <Input placeholder="A, B, C..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Grade 5 - A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacher_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Teacher</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
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
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Section'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update the section information below.
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade}>
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
                    <FormControl>
                      <Input placeholder="A, B, C..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Grade 5 - A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacher_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Teacher</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
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
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Section'}
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