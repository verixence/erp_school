'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import StudentFormDrawer from '@/components/student-form-drawer';
import CSVUploadModal from '@/components/csv-upload-modal';
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
import { Calendar, User, GraduationCap, Users, Upload, Plus, UserPlus, Key, MoreHorizontal } from 'lucide-react';
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

export default function StudentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async ({ user_id, temporary_password }: { user_id: string; temporary_password: string }) => {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, temporary_password, school_id: user?.school_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invite failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setIsInviteOpen(false);
      setSelectedStudent(null);
      setTemporaryPassword('');
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      toast.error(`Invite failed: ${error.message}`);
    },
  });

  // Fetch students with parent information - SIMPLE APPROACH
  const { data: studentsData = [] } = useQuery({
    queryKey: ['students', user?.school_id],
    queryFn: async () => {
      // Get all data in parallel
      const [studentsResult, relationshipsResult, parentsResult] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('school_id', user?.school_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('student_parents')
          .select('student_id, parent_id'),
        
        supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('role', 'parent')
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (relationshipsResult.error) throw relationshipsResult.error;
      if (parentsResult.error) {
        console.warn('Parents query failed, continuing without parent data:', parentsResult.error);
      }

      const students = studentsResult.data || [];
      const relationships = relationshipsResult.data || [];
      const parents = parentsResult.data || [];

      // Create parent lookup map
      const parentMap: Record<string, { first_name: string; last_name: string }> = {};
      parents.forEach(parent => {
        parentMap[parent.id] = {
          first_name: parent.first_name,
          last_name: parent.last_name
        };
      });

      // Add parent info to students
      const studentsWithParents = students.map(student => {
        const studentRelationships = relationships.filter(rel => rel.student_id === student.id);
        const parentNames = studentRelationships
          .map(rel => parentMap[rel.parent_id])
          .filter(parent => parent)
          .map(parent => `${parent.first_name} ${parent.last_name}`);

        return {
          ...student,
          parent_names: parentNames
        };
      });

      console.log('Simple approach results:', {
        students: students.length,
        relationships: relationships.length, 
        parents: parents.length,
        sample: studentsWithParents[0]
      });

      return studentsWithParents as Student[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch sections for stats
  const { data: sectionsData = [] } = useQuery({
    queryKey: ['sections', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', user?.school_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Handlers
  const handleAdd = () => {
    setEditingStudent(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsDrawerOpen(true);
  };

  const handleInvite = (student: Student) => {
    setSelectedStudent(student);
    setTemporaryPassword('');
    setIsInviteOpen(true);
  };

  const handleConfirmInvite = () => {
    if (!selectedStudent || !temporaryPassword.trim()) {
      toast.error('Please enter a temporary password');
      return;
    }

    if (temporaryPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    inviteUserMutation.mutate({
      user_id: selectedStudent.id,
      temporary_password: temporaryPassword.trim(),
    });
  };

  const needsInvite = (student: Student) => {
    // Check if student has login account (assuming we have this info)
    return !student.has_login && student.student_email;
  };

  const getCustomActions = (student: Student) => [
    ...(needsInvite(student)
      ? [
          {
            label: 'Create Login',
            icon: <UserPlus className="w-4 h-4" />,
            onClick: (item: Student) => handleInvite(item),
            variant: 'default' as const,
          },
        ]
      : []),
  ];

  const handleBulkUpload = async (csvData: any[]) => {
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

  // Calculate stats
  const totalStudents = studentsData.length;
  const maleStudents = studentsData.filter(s => s.gender === 'male').length;
  const femaleStudents = studentsData.filter(s => s.gender === 'female').length;
  const avgAge = studentsData.length > 0 
    ? Math.round(studentsData.reduce((sum, student) => {
        const age = new Date().getFullYear() - new Date(student.date_of_birth).getFullYear();
        return sum + age;
      }, 0) / studentsData.length)
    : 0;

  // Table columns
  const columns = [
    {
      key: 'admission_no',
      label: 'Admission No',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
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
            <div className="font-medium">{value}</div>
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
          <span>Grade {value}{item.section}</span>
        </div>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (value: string) => (
        <Badge variant="secondary" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{value ? new Date(value).toLocaleDateString() : '-'}</span>
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
            onClick={() => setIsBulkUploadOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

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

      <EnhancedCrudTable
        entity="students"
        columns={columns}
        title="Students"
        searchPlaceholder="Search students..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        addButtonText="Add Student"
        customData={studentsData}
        isCustomDataLoading={false}
        customActions={getCustomActions}
      />

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

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Student Login</DialogTitle>
            <DialogDescription>
              Create a login account for {selectedStudent?.full_name}
              <br />
              <span className="text-sm text-muted-foreground">
                Email: {selectedStudent?.student_email}
              </span>
              <br />
              <span className="text-sm text-muted-foreground">
                Admission No: {selectedStudent?.admission_no}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="temporaryPassword">Temporary Password</Label>
              <Input
                id="temporaryPassword"
                type="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Enter temporary password (min 8 characters)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Share this password with the student so they can login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmInvite}
              disabled={inviteUserMutation.isPending}
            >
              {inviteUserMutation.isPending ? 'Creating Account...' : 'Create Login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 