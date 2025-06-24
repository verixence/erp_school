'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
  ChevronLeft, 
  ChevronRight, 
  Check, 
  User, 
  Phone, 
  FileCheck,
  Plus,
  Calendar,
  GraduationCap
} from 'lucide-react';
import ParentFormModal from './parent-form-modal';

// Validation schema
const studentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(80, 'Name too long'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  admission_no: z.string().min(1, 'Admission number is required'),
  grade: z.string().min(1, 'Grade is required'),
  section: z.string().min(1, 'Section is required').max(10, 'Section too long'),
  parent_ids: z.array(z.string()).default([]),
  student_email: z.string().email('Invalid email').optional().or(z.literal('')),
  student_phone: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface StudentFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: any;
}

const GRADES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

const steps = [
  {
    id: 1,
    title: 'Core Information',
    description: 'Basic student details',
    icon: User,
  },
  {
    id: 2,
    title: 'Contacts',
    description: 'Parent and contact information',
    icon: Phone,
  },
  {
    id: 3,
    title: 'Review',
    description: 'Confirm and create',
    icon: FileCheck,
  },
];

export default function StudentFormDrawer({ 
  open, 
  onOpenChange, 
  student 
}: StudentFormDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingParent, setIsCreatingParent] = useState(false);

  // Form setup
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: '',
      date_of_birth: '',
      gender: undefined,
      admission_no: '',
      grade: '',
      section: '',
      parent_id: 'none',
      student_email: '',
      student_phone: '',
    },
  });

  // Fetch parents for dropdown
  const { data: parents = [] } = useQuery({
    queryKey: ['parents', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .eq('school_id', user?.school_id)
        .eq('role', 'parent')
        .order('first_name');
      
      if (error) throw error;
      return data as Parent[];
    },
    enabled: !!user?.school_id && open,
  });

  // Check admission number uniqueness
  const checkAdmissionNo = async (admissionNo: string) => {
    if (!admissionNo || !user?.school_id) return true;
    
    const { data } = await supabase
      .rpc('check_admission_no_unique', {
        p_school_id: user.school_id,
        p_admission_no: admissionNo,
        p_student_id: student?.id || null,
      });
    
    return data;
  };

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      // Check admission number uniqueness
      const isUnique = await checkAdmissionNo(data.admission_no);
      if (!isUnique) {
        throw new Error('Admission number already exists');
      }

      // Convert "none" to null for parent_id
      const processedData = {
        ...data,
        parent_id: data.parent_id === 'none' ? null : data.parent_id,
        school_id: user?.school_id,
      };

      const { error } = await supabase
        .from('students')
        .insert(processedData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
      toast.success('Student created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create student: ${error.message}`);
    },
  });

  // Update student mutation
  const updateMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (!student) return;
      
      // Check admission number uniqueness if changed
      if (data.admission_no !== student.admission_no) {
        const isUnique = await checkAdmissionNo(data.admission_no);
        if (!isUnique) {
          throw new Error('Admission number already exists');
        }
      }

      // Convert "none" to null for parent_id
      const processedData = {
        ...data,
        parent_id: data.parent_id === 'none' ? null : data.parent_id,
      };

      const { error } = await supabase
        .from('students')
        .update(processedData)
        .eq('id', student.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
      toast.success('Student updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update student: ${error.message}`);
    },
  });

  // Handlers
  const nextStep = async () => {
    let fieldsToValidate: (keyof StudentFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['full_name', 'date_of_birth', 'gender', 'admission_no', 'grade', 'section'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['student_email']; // Only validate email format, parent is optional
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const onSubmit = (data: StudentFormData) => {
    if (student) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setCurrentStep(1);
    setIsCreatingParent(false);
  };

  // Handle parent modal close
  const handleParentModalClose = (open: boolean) => {
    if (!open) {
      setIsCreatingParent(false);
      // Refresh parents list when modal closes - use a slight delay to ensure DB changes are committed
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['parents', user?.school_id] });
        queryClient.refetchQueries({ queryKey: ['parents', user?.school_id] });
      }, 200);
    }
  };

  // Reset form when student prop changes or drawer opens
  React.useEffect(() => {
    if (!open) return; // Only reset when drawer is open
    
    if (student) {
      // Editing existing student
      form.reset({
        full_name: student.full_name || '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || undefined,
        admission_no: student.admission_no || '',
        grade: student.grade || '',
        section: student.section || '',
        parent_id: student.parent_id || 'none',
        student_email: student.student_email || '',
        student_phone: student.student_phone || '',
      });
    } else {
      // Creating new student - ensure form is reset to defaults
      form.reset({
        full_name: '',
        date_of_birth: '',
        gender: undefined,
        admission_no: '',
        grade: '',
        section: '',
        parent_id: 'none',
        student_email: '',
        student_phone: '',
      });
    }
  }, [student, form, open]);

  const renderStepContent = () => {
    const formData = form.getValues();

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="admission_no"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter unique admission number" {...field} />
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
                    <FormLabel>Grade *</FormLabel>
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
                    <FormLabel>Section *</FormLabel>
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
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent/Guardian</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select existing parent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No parent assigned</SelectItem>
                          {parents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.first_name} {parent.last_name} ({parent.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCreatingParent(true)}
                        title="Create new parent"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreatingParent(true)}
                      className="w-full text-sm text-muted-foreground hover:text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Parent
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="student_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="student@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="student_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Review Student Information</h3>
              <p className="text-sm text-muted-foreground">
                Please review the information before creating the student record.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Full Name:</span>
                    <p>{formData.full_name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Date of Birth:</span>
                    <p>{formData.date_of_birth}</p>
                  </div>
                  <div>
                    <span className="font-medium">Gender:</span>
                    <p className="capitalize">{formData.gender}</p>
                  </div>
                  <div>
                    <span className="font-medium">Admission No:</span>
                    <p>{formData.admission_no}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Grade:</span>
                    <p>Grade {formData.grade}</p>
                  </div>
                  <div>
                    <span className="font-medium">Section:</span>
                    <p>Section {formData.section}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Parent:</span>
                    <p>
                      {formData.parent_id && formData.parent_id !== 'none'
                        ? (() => {
                            const parent = parents.find(p => p.id === formData.parent_id);
                            return parent ? `${parent.first_name} ${parent.last_name}` : 'Not found';
                          })()
                        : 'Not assigned'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Student Email:</span>
                    <p>{formData.student_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Student Phone:</span>
                    <p>{formData.student_phone || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            {student ? 'Edit Student' : 'Add New Student'}
          </DrawerTitle>
          <DrawerDescription>
            {student 
              ? 'Update the student information below.'
              : 'Fill out the student information in the steps below.'
            }
          </DrawerDescription>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-2">
            <h3 className="font-medium">{steps[currentStep - 1]?.title}</h3>
            <p className="text-sm text-muted-foreground">
              {steps[currentStep - 1]?.description}
            </p>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {renderStepContent()}
            </form>
          </Form>
        </div>

        <DrawerFooter>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? handleClose : prevStep}
            >
              {currentStep === 1 ? 'Cancel' : (
                <>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </>
              )}
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : student
                  ? 'Update Student'
                  : 'Create Student'
                }
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>

      {/* Parent Creation Modal */}
      <ParentFormModal
        open={isCreatingParent}
        onOpenChange={handleParentModalClose}
      />
    </Drawer>
  );
} 