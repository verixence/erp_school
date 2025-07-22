'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
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
import { X, Users } from 'lucide-react';

// Validation schema
const parentSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(40, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(40, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  relation: z.enum(['father', 'mother', 'guardian'], { required_error: 'Relation is required' }),
  children: z.array(z.string()).optional(),
});

type ParentFormData = z.infer<typeof parentSchema>;

interface Student {
  id: string;
  full_name: string;
  grade: string;
  section: string;
  admission_no: string;
  parent_id?: string;
}

interface ParentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent?: any;
}

export default function ParentFormModal({ 
  open, 
  onOpenChange, 
  parent 
}: ParentFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);

  // Form setup
  const form = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      relation: undefined,
      children: [],
    },
  });

  // Fetch students for children selection
  const { data: students = [] } = useQuery({
    queryKey: ['students', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade, section, admission_no, parent_id')
        .eq('school_id', user?.school_id)
        .order('full_name');
      
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user?.school_id && open,
  });

  // Get unassigned students or students assigned to current parent
  const availableStudents = students.filter(student => 
    !student.parent_id || (parent && student.parent_id === parent.id)
  );

  // Create parent mutation
  const createMutation = useMutation({
    mutationFn: async (data: ParentFormData) => {
      const response = await fetch('/api/admin/create-parent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          relation: data.relation,
          school_id: user?.school_id,
          children: selectedChildren,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create parent');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      
      // Force refetch to ensure data consistency
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['parents', user?.school_id] });
        queryClient.refetchQueries({ queryKey: ['students', user?.school_id] });
      }, 100);
      
      onOpenChange(false);
      form.reset();
      setSelectedChildren([]);
      
      // Show success message with temporary password info
      toast.success(
        `Parent created successfully! Temporary password: ${result.tempPassword}`,
        { duration: 8000 }
      );
    },
    onError: (error: any) => {
      toast.error(`Failed to create parent: ${error.message}`);
    },
  });

  // Update parent mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ParentFormData) => {
      if (!parent) return;
      
      // Update parent user
      const { error: parentError } = await supabase
        .from('users')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          relation: data.relation,
        })
        .eq('id', parent.id);

      if (parentError) throw parentError;

      // Get current children of this parent
      const { data: currentChildren } = await supabase
        .from('students')
        .select('id')
        .eq('parent_id', parent.id);

      const currentChildIds = currentChildren?.map(c => c.id) || [];

      // Remove parent from children that are no longer selected
      const toRemove = currentChildIds.filter(id => !selectedChildren.includes(id));
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('students')
          .update({ parent_id: null })
          .in('id', toRemove);

        if (removeError) throw removeError;
      }

      // Add parent to newly selected children
      const toAdd = selectedChildren.filter(id => !currentChildIds.includes(id));
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('students')
          .update({ parent_id: parent.id })
          .in('id', toAdd);

        if (addError) throw addError;
      }

      return parent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onOpenChange(false);
      form.reset();
      setSelectedChildren([]);
      toast.success('Parent updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update parent: ${error.message}`);
    },
  });

  // Handlers
  const handleChildToggle = (studentId: string) => {
    const newChildren = selectedChildren.includes(studentId)
      ? selectedChildren.filter(id => id !== studentId)
      : [...selectedChildren, studentId];
    
    setSelectedChildren(newChildren);
    form.setValue('children', newChildren);
  };

  const onSubmit = (data: ParentFormData) => {
    if (parent) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedChildren([]);
    onOpenChange(false);
  };

  // Get parent's children - stable reference
  const getParentChildren = useCallback(() => {
    if (!parent || !students.length) return [];
    return students
      .filter(student => student.parent_id === parent.id)
      .map(student => student.id);
  }, [parent?.id, students.length]);

  // Reset form when parent prop changes - without students dependency
  React.useEffect(() => {
    if (!open) return; // Only run when modal is open
    
    if (parent) {
      // Editing mode
      const parentChildren = getParentChildren();
      setSelectedChildren(parentChildren);
      form.reset({
        first_name: parent.first_name || '',
        last_name: parent.last_name || '',
        email: parent.email || '',
        phone: parent.phone || '',
        relation: parent.relation || undefined,
        children: parentChildren,
      });
    } else {
      // Create mode - reset to defaults
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        relation: undefined,
        children: [],
      });
      setSelectedChildren([]);
    }
  }, [open, parent?.id, form, getParentChildren]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parent ? 'Edit Parent' : 'Add New Parent'}
          </DialogTitle>
          <DialogDescription>
            {parent 
              ? 'Update the parent information below.'
              : 'Enter the details for the new parent/guardian.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relation *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="children"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Children (Optional)
                  </FormLabel>
                  <div className="space-y-2">
                    {availableStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No students available for assignment.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                        {availableStudents.map((student) => (
                          <div
                            key={student.id}
                            className={`p-2 border rounded cursor-pointer text-sm transition-colors ${
                              selectedChildren.includes(student.id)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-muted hover:border-primary'
                            }`}
                            onClick={() => handleChildToggle(student.id)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{student.full_name}</span>
                              <span className="text-xs opacity-75">
                                Grade {student.grade}{student.section} • {student.admission_no}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedChildren.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedChildren.map((childId) => {
                          const student = students.find(s => s.id === childId);
                          return student ? (
                            <Badge key={childId} variant="secondary" className="text-xs">
                              {student.full_name}
                              <button
                                type="button"
                                onClick={() => handleChildToggle(childId)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} className="btn-outline-visible">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary-visible"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : parent
                  ? 'Update Parent'
                  : 'Create Parent'
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 