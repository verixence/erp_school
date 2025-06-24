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
import { Plus, Users } from 'lucide-react';

// Validation schema
const classSchema = z.object({
  class_name: z.string().min(1, 'Class name is required').max(50, 'Class name too long'),
  grade: z.string().min(1, 'Grade is required'),
  section: z.string().min(1, 'Section is required').max(10, 'Section too long'),
  teacher_id: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity too high'),
});

type ClassFormData = z.infer<typeof classSchema>;

interface Class {
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

export default function ClassesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  // Form setup
  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
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
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsCreateOpen(false);
      form.reset();
      toast.success('Class created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create class: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      if (!editingClass) return;
      
      // Convert "none" to null for teacher_id
      const processedData = {
        ...data,
        teacher_id: data.teacher_id === 'none' ? null : data.teacher_id,
      };

      const { error } = await supabase
        .from('classes')
        .update(processedData)
        .eq('id', editingClass.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsEditOpen(false);
      setEditingClass(null);
      form.reset();
      toast.success('Class updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update class: ${error.message}`);
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

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    form.reset({
      class_name: classItem.class_name,
      grade: classItem.grade,
      section: classItem.section,
      teacher_id: classItem.teacher_id || 'none',
      capacity: classItem.capacity,
    });
    setIsEditOpen(true);
  };

  const onSubmit = (data: ClassFormData) => {
    if (editingClass) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'class_name',
      label: 'Class Name',
      sortable: true,
    },
    {
      key: 'grade',
      label: 'Grade',
      sortable: true,
      render: (value: string) => (
        <Badge variant="secondary">Grade {value}</Badge>
      ),
    },
    {
      key: 'section',
      label: 'Section',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'teacher',
      label: 'Class Teacher',
      render: (value: any, item: Class) => {
        if (item.teacher) {
          return `${item.teacher.first_name} ${item.teacher.last_name}`;
        }
        return <span className="text-muted-foreground">Not assigned</span>;
      },
    },
    {
      key: 'students_count',
      label: 'Students',
      render: (value: number, item: Class) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{value}/{item.capacity}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      label: 'Capacity',
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">
            Manage classes, grades, and sections
          </p>
        </div>
      </div>

      <EnhancedCrudTable
        entity="classes"
        columns={columns}
        title="Classes"
        searchPlaceholder="Search classes..."
        onAdd={handleCreate}
        onEdit={handleEdit}
        addButtonText="Add Class"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingClass(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? 'Edit Class' : 'Create New Class'}
            </DialogTitle>
            <DialogDescription>
              {editingClass 
                ? 'Update the class information below.'
                : 'Enter the details for the new class.'
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mathematics A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                        <Input placeholder="e.g., A, B, C" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="teacher_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Teacher (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a teacher" />
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
                    setEditingClass(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingClass
                    ? 'Update Class'
                    : 'Create Class'
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 