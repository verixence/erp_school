'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { toast } from 'react-hot-toast';
import { X, Eye, EyeOff, Shuffle } from 'lucide-react';

// Validation schema
const teacherSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(40, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(40, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  employee_id: z.string().min(1, 'Employee ID is required'),
  subjects: z.array(z.string()).min(1, 'At least one subject is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  auto_generate_password: z.boolean().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface TeacherFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: any;
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Social Studies',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Computer Science',
  'Physical Education',
  'Art',
  'Music',
  'Languages',
];

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function TeacherFormModal({ 
  open, 
  onOpenChange, 
  teacher 
}: TeacherFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Form setup
  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employee_id: '',
      subjects: [],
      password: '',
      auto_generate_password: false,
    },
  });

  const autoGeneratePassword = form.watch('auto_generate_password');

  // Create teacher mutation
  const createMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      // Create user via API route
      const response = await fetch('/api/admin/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          school_id: user?.school_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create teacher');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      onOpenChange(false);
      form.reset();
      setSelectedSubjects([]);
      toast.success('Teacher created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create teacher: ${error.message}`);
    },
  });

  // Update teacher mutation
  const updateMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      if (!teacher) return;
      
      const response = await fetch(`/api/admin/update-teacher/${teacher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update teacher');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      onOpenChange(false);
      form.reset();
      setSelectedSubjects([]);
      toast.success('Teacher updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update teacher: ${error.message}`);
    },
  });

  // Handlers
  const handleSubjectToggle = (subject: string) => {
    const newSubjects = selectedSubjects.includes(subject)
      ? selectedSubjects.filter(s => s !== subject)
      : [...selectedSubjects, subject];
    
    setSelectedSubjects(newSubjects);
    form.setValue('subjects', newSubjects);
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    form.setValue('password', newPassword);
  };

  const onSubmit = (data: TeacherFormData) => {
    if (teacher) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setSelectedSubjects([]);
  };

  // Auto-generate password when toggle is enabled
  React.useEffect(() => {
    if (autoGeneratePassword) {
      handleGeneratePassword();
    } else if (!teacher) {
      form.setValue('password', '');
    }
  }, [autoGeneratePassword, form, teacher]);

  // Reset form when teacher prop changes
  React.useEffect(() => {
    if (teacher) {
      const subjects = teacher.subjects || [];
      setSelectedSubjects(subjects);
      form.reset({
        first_name: teacher.first_name || '',
        last_name: teacher.last_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        employee_id: teacher.employee_id || '',
        subjects: subjects,
        password: '', // Don't pre-fill password for editing
        auto_generate_password: false,
      });
    }
  }, [teacher, form]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {teacher ? 'Edit Teacher' : 'Add New Teacher'}
          </DialogTitle>
          <DialogDescription>
            {teacher 
              ? 'Update the teacher information below.'
              : 'Enter the details for the new teacher. An account will be created automatically.'
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
                    <Input type="email" placeholder="john.doe@school.edu" {...field} />
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
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subjects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subjects Taught *</FormLabel>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {SUBJECTS.map((subject) => (
                      <div
                        key={subject}
                        className={`p-2 border rounded cursor-pointer text-sm text-center transition-colors ${
                          selectedSubjects.includes(subject)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-muted hover:border-primary'
                        }`}
                        onClick={() => handleSubjectToggle(subject)}
                      >
                        {subject}
                      </div>
                    ))}
                  </div>
                  {selectedSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSubjects.map((subject) => (
                        <Badge key={subject} variant="secondary" className="text-xs">
                          {subject}
                          <button
                            type="button"
                            onClick={() => handleSubjectToggle(subject)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!teacher && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="auto_generate_password"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="rounded"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Auto-generate secure password
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter password"
                            {...field}
                            disabled={autoGeneratePassword}
                          />
                        </FormControl>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                          {!autoGeneratePassword && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleGeneratePassword}
                              className="btn-visible"
                            >
                              <Shuffle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                            className="btn-visible"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                  : teacher
                  ? 'Update Teacher'
                  : 'Create Teacher'
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 