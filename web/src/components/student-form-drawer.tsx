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
  GraduationCap,
  Building2
} from 'lucide-react';
import ParentFormModal from './parent-form-modal';

// Validation schema
const studentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(80, 'Name too long'),
  date_of_birth: z.string().min(1, 'Date of birth is required').regex(
    /^\d{2}\/\d{2}\/\d{4}$/, 
    'Date must be in DD/MM/YYYY format'
  ),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  admission_no: z.string().min(1, 'Admission number is required'),
  grade: z.string().min(1, 'Grade is required'),
  section: z.string().min(1, 'Section is required').max(10, 'Section too long'),
  section_id: z.string().optional(),
  parent_id: z.string().optional(),
  student_email: z.string().email('Invalid email').optional().or(z.literal('')),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface Section {
  id: string;
  grade: number;
  section: string;
  capacity: number;
  students_count: number;
}

interface StudentFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: any;
}

const GRADES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

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
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  // Helper function to format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper function to format date from DD/MM/YYYY to YYYY-MM-DD for database
  const formatDateToYYYYMMDD = (dateStr: string) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  // Helper function to validate and format date input
  const handleDateInput = (value: string) => {
    // Remove non-numeric characters except /
    let cleaned = value.replace(/[^\d\/]/g, '');
    
    // Auto-format as user types
    if (cleaned.length >= 2 && !cleaned.includes('/')) {
      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length >= 5 && cleaned.split('/').length === 2) {
      const parts = cleaned.split('/');
      cleaned = parts[0] + '/' + parts[1] + '/' + parts.slice(1).join('').slice(2);
    }
    
    // Limit to DD/MM/YYYY format
    const parts = cleaned.split('/');
    if (parts.length > 0 && parts[0].length > 2) parts[0] = parts[0].slice(0, 2);
    if (parts.length > 1 && parts[1].length > 2) parts[1] = parts[1].slice(0, 2);
    if (parts.length > 2 && parts[2].length > 4) parts[2] = parts[2].slice(0, 4);
    
    return parts.join('/');
  };



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
      section_id: '',
      parent_id: 'none',
      student_email: '',
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

  // Fetch sections for dropdown
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          id,
          grade,
          section,
          capacity,
          students_count
        `)
        .eq('school_id', user?.school_id)
        .order('grade')
        .order('section');
      
      if (error) throw error;
      return (data || []) as Section[];
    },
    enabled: !!user?.school_id && open,
  });

  // Fetch current parent for student (when editing)
  const { data: currentParent } = useQuery({
    queryKey: ['student-parent', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;
      
      const { data, error } = await supabase
        .from('student_parents')
        .select('parent_id')
        .eq('student_id', student.id);
      
      if (error) throw error;
      
      // Return the first parent_id if exists, otherwise null
      return data && data.length > 0 ? data[0].parent_id : null;
    },
    enabled: !!student?.id && open,
  });

  // Filter sections by selected grade
  const availableSections = sections.filter(s => 
    selectedGrade ? s.grade.toString() === selectedGrade : true
  );

  // Watch grade changes to reset section
  const watchedGrade = form.watch('grade');
  React.useEffect(() => {
    if (watchedGrade !== selectedGrade) {
      setSelectedGrade(watchedGrade);
      form.setValue('section', '');
      form.setValue('section_id', '');
    }
  }, [watchedGrade, selectedGrade, form]);

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

      // Convert date format and process data (excluding parent_id)
      const processedData = {
        full_name: data.full_name,
        date_of_birth: formatDateToYYYYMMDD(data.date_of_birth),
        gender: data.gender,
        admission_no: data.admission_no,
        grade: data.grade,
        section: data.section,
        section_id: data.section_id || null,
        school_id: user?.school_id,
        student_email: data.student_email || null,
      };

      // Create student
      const { data: studentResult, error: studentError } = await supabase
        .from('students')
        .insert(processedData)
        .select('id')
        .single();
      
      if (studentError) throw studentError;

      // Handle parent assignment if selected
      if (data.parent_id && data.parent_id !== 'none') {
        const { error: parentLinkError } = await supabase
          .from('student_parents')
          .insert({
            student_id: studentResult.id,
            parent_id: data.parent_id
          });
        
        if (parentLinkError) throw parentLinkError;
      }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['student-parent'] });
      
      // Force refetch to ensure data consistency
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['students', user?.school_id] });
        queryClient.refetchQueries({ queryKey: ['sections', user?.school_id] });
      }, 100);
      
      onOpenChange(false);
      form.reset({
        full_name: '',
        date_of_birth: '',
        gender: undefined,
        admission_no: '',
        grade: '',
        section: '',
        section_id: '',
        parent_id: 'none',
        student_email: '',
      });
      setCurrentStep(1);
      setSelectedGrade('');
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

      // Convert date format and process data (excluding parent_id)
      const processedData = {
        full_name: data.full_name,
        date_of_birth: formatDateToYYYYMMDD(data.date_of_birth),
        gender: data.gender,
        admission_no: data.admission_no,
        grade: data.grade,
        section: data.section,
        section_id: data.section_id || null,
        student_email: data.student_email || null,
      };

      // Update student
      const { error: studentError } = await supabase
        .from('students')
        .update(processedData)
        .eq('id', student.id);
      
      if (studentError) throw studentError;

      // Handle parent assignment updates
      // First, remove existing parent relationships
      const { error: deleteError } = await supabase
        .from('student_parents')
        .delete()
        .eq('student_id', student.id);
      
      if (deleteError) throw deleteError;

      // Then add new parent relationship if selected
      if (data.parent_id && data.parent_id !== 'none') {
        const { error: parentLinkError } = await supabase
          .from('student_parents')
          .insert({
            student_id: student.id,
            parent_id: data.parent_id
          });
        
        if (parentLinkError) throw parentLinkError;
      }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['student-parent'] });
      
      // Force refetch to ensure data consistency
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['students', user?.school_id] });
        queryClient.refetchQueries({ queryKey: ['sections', user?.school_id] });
      }, 100);
      
      onOpenChange(false);
      form.reset({
        full_name: '',
        date_of_birth: '',
        gender: undefined,
        admission_no: '',
        grade: '',
        section: '',
        section_id: '',
        parent_id: 'none',
        student_email: '',
      });
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
    form.reset({
      full_name: '',
      date_of_birth: '',
      gender: undefined,
      admission_no: '',
      grade: '',
      section: '',
      section_id: '',
      parent_id: 'none',
      student_email: '',
    });
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
        date_of_birth: student.date_of_birth ? formatDateToDDMMYYYY(student.date_of_birth) : '',
        gender: student.gender || undefined,
        admission_no: student.admission_no || '',
        grade: student.grade || '',
        section: student.section || '',
        section_id: student.section_id || '',
        parent_id: currentParent || 'none',
        student_email: student.student_email || '',
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
        section_id: '',
        parent_id: 'none',
        student_email: '',
      });
    }
  }, [student, open, currentParent]);

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
                    <FormLabel>Date of Birth * (DD/MM/YYYY)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="DD/MM/YYYY" 
                        {...field}
                        onChange={(e) => {
                          const formatted = handleDateInput(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
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
                    <Select onValueChange={(value) => {
                      // Find the selected section by ID
                      const selectedSection = availableSections.find(s => s.id === value);
                      if (selectedSection) {
                        field.onChange(selectedSection.section); // Store section name in form
                        form.setValue('section_id', selectedSection.id); // Store section ID
                      }
                    }} value={availableSections.find(s => s.section === field.value)?.id || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            Grade {section.grade} - Section {section.section} ({section.students_count}/{section.capacity})
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
                      className="w-full text-sm text-muted-foreground hover:text-primary btn-visible"
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review & Confirm</h3>
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div>
                <h4 className="font-medium text-sm">Student Information</h4>
                <p>{formData.full_name}</p>
                <p>DOB: {formData.date_of_birth}</p>
                <p>Gender: {formData.gender}</p>
                <p>Admission No: {formData.admission_no}</p>
                <p>Grade: {formData.grade}</p>
                <p>Section: {formData.section}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm">Contact Information</h4>
                <p>{formData.student_email || 'Not provided'}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm">Parent/Guardian</h4>
                <p>
                  {formData.parent_id === 'none' ? 'No parent assigned' : 
                    parents.find(p => p.id === formData.parent_id)?.first_name + ' ' + 
                    parents.find(p => p.id === formData.parent_id)?.last_name || 'Unknown'
                  }
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Check if sections exist
  const hasSections = sections.length > 0;
  const isNewSchool = !sectionsLoading && !hasSections;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            {student ? 'Edit Student' : 'Add New Student'}
          </DrawerTitle>
          <DrawerDescription>
            {isNewSchool 
              ? 'Please create sections/classes first before adding students.'
              : student 
              ? 'Update the student information below.'
              : 'Fill out the student information in the steps below.'
            }
          </DrawerDescription>

          {/* Show setup required message for new schools */}
          {isNewSchool && !student && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-amber-800 mb-1">Setup Required</h3>
                  <p className="text-sm text-amber-700 mb-3">
                    Before adding students, you need to create classes/sections in your school. 
                    Students must be assigned to specific grade sections.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        handleClose();
                        // Navigate to sections page
                        window.location.href = '/school-admin/sections?action=create';
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Sections
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleClose}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Indicator - only show if sections exist or editing */}
          {(hasSections || student) && (
            <>
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
            </>
          )}
        </DrawerHeader>

        {/* Only show form content if sections exist or editing */}
        {(hasSections || student) && (
          <>
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
                  className="btn-outline-visible"
                >
                  {currentStep === 1 ? 'Cancel' : (
                    <>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </>
                  )}
                </Button>

                {currentStep < 3 ? (
                  <Button type="button" onClick={nextStep} className="btn-primary-visible">
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-primary-visible"
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
          </>
        )}

        {/* Show close button when sections don't exist */}
        {isNewSchool && !student && (
          <DrawerFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              className="btn-outline-visible w-full"
            >
              Close
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>

      {/* Parent Creation Modal */}
      <ParentFormModal
        open={isCreatingParent}
        onOpenChange={handleParentModalClose}
      />
    </Drawer>
  );
} 