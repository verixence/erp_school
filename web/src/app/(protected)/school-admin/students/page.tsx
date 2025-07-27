'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import StudentFormDrawer from '@/components/student-form-drawer';
import CSVUploadModal from '@/components/csv-upload-modal';
import ErrorBoundary from '@/components/error-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, User, GraduationCap, Users, Upload, Plus, Key, MoreHorizontal, Building2, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
  gender: string;
  date_of_birth: string;
  student_email?: string;
  student_phone?: string;
  parent_names?: string[];
  created_at: string;
  status?: string;
  has_login?: boolean;
}

function StudentsPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Fetch students with improved error handling
  const { 
    data: studentsData = [], 
    isLoading: studentsLoading,
    error: studentsError 
  } = useQuery({
    queryKey: ['students', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) {
        throw new Error('School ID not available');
      }

      try {
        // Get all data in parallel with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        );

        const dataPromise = Promise.all([
          supabase
            .from('students')
            .select('*')
            .eq('school_id', user.school_id)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('student_parents')
            .select('student_id, parent_id'),
          
          supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('role', 'parent')
            .eq('school_id', user.school_id)
        ]);

        const [studentsResult, relationshipsResult, parentsResult] = await Promise.race([
          dataPromise,
          timeoutPromise
        ]) as any;

        if (studentsResult.error) throw studentsResult.error;
        if (relationshipsResult.error) throw relationshipsResult.error;
        
        // Parents query can fail gracefully
        if (parentsResult.error) {
          console.warn('Parents query failed, continuing without parent data:', parentsResult.error);
        }

        const students = studentsResult.data || [];
        const allRelationships = relationshipsResult.data || [];
        const parents = parentsResult.data || [];

                 // Safely process data
         const studentIds = students.map((s: any) => s?.id).filter(Boolean);
         const relationships = allRelationships.filter((rel: any) => 
           rel && studentIds.includes(rel.student_id)
         );

         // Create parent lookup map
         const parentMap: Record<string, { first_name: string; last_name: string }> = {};
         parents.forEach((parent: any) => {
           if (parent?.id && parent?.first_name && parent?.last_name) {
             parentMap[parent.id] = {
               first_name: parent.first_name,
               last_name: parent.last_name
             };
           }
         });

         // Add parent info to students
         const studentsWithParents = students.map((student: any) => {
           if (!student) return null;
           
           const studentRelationships = relationships.filter((rel: any) => 
             rel && rel.student_id === student.id
           );
           const parentNames = studentRelationships
             .map((rel: any) => parentMap[rel.parent_id])
             .filter((parent: any) => parent)
             .map((parent: any) => `${parent.first_name} ${parent.last_name}`);

           return {
             ...student,
             parent_names: parentNames
           };
         }).filter(Boolean);

        return studentsWithParents as Student[];
      } catch (error) {
        console.error('Students query error:', error);
        throw error;
      }
    },
    enabled: !!user?.school_id,
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch sections for stats
  const { 
    data: sectionsData = [], 
    isLoading: sectionsLoading,
    error: sectionsError 
  } = useQuery({
    queryKey: ['sections', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) {
        throw new Error('School ID not available');
      }

      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', user.school_id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id,
    retry: 2,
  });

  // Check if sections exist
  const hasSections = sectionsData.length > 0;

  // Error states
  if (studentsError || sectionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">Failed to Load Data</h3>
            <p className="text-gray-600">
              {studentsError?.message || sectionsError?.message || 'Unable to fetch student data'}
            </p>
            <Button 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['students'] });
                queryClient.invalidateQueries({ queryKey: ['sections'] });
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handlers
  const handleAdd = () => {
    if (!hasSections) {
      toast.error('Please create sections/classes first before adding students.');
      return;
    }
    setEditingStudent(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsDrawerOpen(true);
  };

  const getCustomActions = (student: Student) => [];

  const handleBulkUpload = async (csvData: any[]) => {
    if (!hasSections) {
      toast.error('Please create sections/classes first before importing students.');
      throw new Error('No sections available');
    }

    try {
      // Use the database function for bulk creating students with smart parent handling
      const { data, error } = await supabase.rpc('bulk_create_students_with_parents', {
        p_school_id: user?.school_id,
        p_students: csvData
      });

      if (error) throw error;

      const result = data as {
        success_count: number;
        error_count: number;
        results: Array<{ admission_no: string; status: string; error?: string }>;
      };

      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      
      if (result.error_count > 0) {
        const errors = result.results
          .filter(r => r.status === 'error')
          .map(r => `${r.admission_no}: ${r.error}`)
          .join('\n');
        
        toast.error(`${result.success_count} students created successfully, ${result.error_count} failed:\n${errors}`);
      } else {
        toast.success(`Successfully imported ${result.success_count} students with parent accounts and linkings.`);
      }
    } catch (error: any) {
      toast.error(`Bulk upload failed: ${error.message}`);
      throw error;
    }
  };

  // Calculate stats safely
  const totalStudents = studentsData?.length || 0;
  const maleStudents = studentsData?.filter(s => s?.gender === 'male').length || 0;
  const femaleStudents = studentsData?.filter(s => s?.gender === 'female').length || 0;
  const avgAge = totalStudents > 0 
    ? Math.round(studentsData.reduce((sum, student) => {
        if (!student?.date_of_birth) return sum;
        const age = new Date().getFullYear() - new Date(student.date_of_birth).getFullYear();
        return sum + (isNaN(age) ? 0 : age);
      }, 0) / totalStudents)
    : 0;

  // Table columns
  const columns = [
    {
      key: 'admission_no',
      label: 'Admission No',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline">{value || 'N/A'}</Badge>
      ),
    },
    {
      key: 'full_name',
      label: 'Full Name',
      sortable: true,
      render: (value: string, item: Student) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value || 'N/A'}</div>
            {item.student_email && (
              <div className="text-xs text-muted-foreground">{item.student_email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'grade',
      label: 'Class',
      sortable: true,
      render: (value: string, item: Student) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span>Grade {value || 'N/A'}{item.section || ''}</span>
        </div>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (value: string) => (
        <Badge variant="secondary" className="capitalize">
          {value || 'N/A'}
        </Badge>
      ),
    },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{value ? new Date(value).toLocaleDateString() : 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'parent',
      label: 'Parents',
      render: (value: any, item: Student) => {
        if (item.parent_names && item.parent_names.length > 0) {
          return (
            <div className="space-y-1">
              {item.parent_names.map((name, index) => (
                <div key={index} className="text-sm">
                  {name}
                </div>
              ))}
            </div>
          );
        }
        return <span className="text-muted-foreground">Not assigned</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-muted-foreground">
            Manage student records and information
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (!hasSections) {
                toast.error('Please create sections/classes first before importing students.');
                return;
              }
              setIsBulkUploadOpen(true);
            }}
            variant="outline"
            disabled={!hasSections || studentsLoading}
            className="flex items-center gap-2"
            title={!hasSections ? "Create sections first" : ""}
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!hasSections || studentsLoading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
            title={!hasSections ? "Create sections first" : ""}
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Setup guidance for new schools */}
      {!hasSections && !sectionsLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Setup Required: Create Sections First</h3>
              <p className="text-blue-700 mb-4">
                Before you can add students, you need to create classes/sections in your school. 
                Students must be assigned to specific grade sections.
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => window.location.href = '/school-admin/sections'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Create Sections
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Male Students</p>
                <p className="text-2xl font-bold text-gray-900">{maleStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-pink-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Female Students</p>
                <p className="text-2xl font-bold text-gray-900">{femaleStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Age</p>
                <p className="text-2xl font-bold text-gray-900">{avgAge} years</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasSections ? (
        <EnhancedCrudTable
          entity="students"
          columns={columns}
          title="Students"
          searchPlaceholder="Search students..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          addButtonText="Add Student"
          customData={studentsData}
          isCustomDataLoading={studentsLoading}
          customActions={getCustomActions}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Students Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create sections/classes first, then you can start adding students to your school.
            </p>
            <Button 
              onClick={() => window.location.href = '/school-admin/sections'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Create Sections First
            </Button>
          </CardContent>
        </Card>
      )}

      <StudentFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        student={editingStudent}
      />

      {/* Bulk Upload Modal */}
      <CSVUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        entity="students"
        onUpload={handleBulkUpload}
      />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <ErrorBoundary>
      <StudentsPageContent />
    </ErrorBoundary>
  );
} 