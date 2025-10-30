'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Plus, 
  Upload, 
  Users, 
  UserCheck, 
  User, 
  BookOpen, 
  IdCard, 
  Mail, 
  Phone,
  Key,
  UserX,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import TeacherFormModal from '@/components/teacher-form-modal';
import CSVUploadModal from '@/components/csv-upload-modal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_id: string;
  subjects: string[];
  department?: string;
  status: string;
  created_at: string;
}

export default function TeachersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  // Fetch teachers data
  const { data: teachersData = [], isLoading } = useQuery({
    queryKey: ['teachers-users-table', user?.school_id], // Static key to avoid infinite refetch
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      console.log('🔍 Fetching teachers from users table for school:', user.school_id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('role', 'teacher')
        .order('first_name');
      
      if (error) {
        console.error('❌ Error fetching teachers:', error);
        throw error;
      }
      
      console.log('✅ Teachers data from users table:', data?.slice(0, 3));
      console.log('📊 Sample teacher ID:', data?.[0]?.id);
      
      // Transform data to match Teacher interface (add missing fields)
      const transformedData = (data || []).map(teacher => ({
        ...teacher,
        status: 'active', // Default status since users table doesn't have this
        department: teacher.department || null,
      }));
      
      return transformedData;
    },
    enabled: !!user?.school_id,
  });

  // Password reset mutation - using simple endpoint
  const passwordResetMutation = useMutation({
    mutationFn: async ({ teacher, new_password }: { teacher: Teacher; new_password: string }) => {
      console.log('🔑 Password reset mutation called for teacher:', teacher);
      console.log('🆔 Sending user_id:', teacher.id);
      console.log('🏫 School ID:', user?.school_id);
      
      const response = await fetch('/api/admin/simple-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: teacher.id, 
          new_password, 
          school_id: user?.school_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Password reset failed:', errorData);
        throw new Error(errorData.error || 'Password reset failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setIsPasswordResetOpen(false);
      setSelectedTeacher(null);
      setNewPassword('');
    },
    onError: (error: any) => {
      toast.error(`Password reset failed: ${error.message}`);
    },
  });

  // Status toggle mutation
  const statusToggleMutation = useMutation({
    mutationFn: async ({ user_id, status }: { user_id: string; status: string }) => {
      const response = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, status, school_id: user?.school_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Status update failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error: any) => {
      toast.error(`Status update failed: ${error.message}`);
    },
  });

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
      setSelectedTeacher(null);
      setTemporaryPassword('');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error: any) => {
      toast.error(`Invite failed: ${error.message}`);
    },
  });

  // Handlers
  const handleAdd = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleResetPassword = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setNewPassword('');
    setIsPasswordResetOpen(true);
  };

  const handleConfirmPasswordReset = () => {
    if (!selectedTeacher || !newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    passwordResetMutation.mutate({
      teacher: selectedTeacher,
      new_password: newPassword.trim(),
    });
  };

  const handleToggleStatus = (teacher: Teacher) => {
    const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
    statusToggleMutation.mutate({
      user_id: teacher.id,
      status: newStatus,
    });
  };

  const handleInvite = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setTemporaryPassword('');
    setIsInviteOpen(true);
  };

  const handleConfirmInvite = () => {
    if (!selectedTeacher || !temporaryPassword.trim()) {
      toast.error('Please enter a temporary password');
      return;
    }

    if (temporaryPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    inviteUserMutation.mutate({
      user_id: selectedTeacher.id,
      temporary_password: temporaryPassword.trim(),
    });
  };

  const handleBulkUpload = async (csvData: any[]) => {
    try {
      // Call the API endpoint that creates both auth users and database records
      const response = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'teachers',
          data: csvData,
          school_id: user?.school_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk upload failed');
      }

      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ['teachers'] });

      if (result.errors && result.errors.length > 0) {
        toast.error(`${result.errors.length} teachers failed to upload. Check console for details.`);
        console.error('Upload errors:', result.errors);
      }

      if (result.imported && result.imported.length > 0) {
        toast.success(`${result.imported.length} teachers uploaded successfully!`);
      }

      setIsBulkUploadOpen(false);

      // Return the results for the modal to display
      return result;
    } catch (error: any) {
      toast.error(`Bulk upload failed: ${error.message}`);
    }
  };

  // Calculate stats
  const totalTeachers = teachersData.length;
  const assignedTeachers = teachersData.filter(
    (teacher: Teacher) => teacher.subjects && teacher.subjects.length > 0
  ).length;
  const unassignedTeachers = totalTeachers - assignedTeachers;
  const avgSubjects = totalTeachers > 0 
    ? (teachersData.reduce((sum: number, teacher: Teacher) => 
        sum + (teacher.subjects ? teacher.subjects.length : 0), 0) / totalTeachers).toFixed(1)
    : 0;

  // Function to check if teacher needs invite (has no auth account)
  const needsInvite = (teacher: Teacher) => {
    // This is a simple check - in a real app, you might want to track this in the database
    // For now, we'll assume teachers created through manual entry need invites
    // while bulk uploaded teachers already have auth accounts
    return !teacher.created_at || new Date(teacher.created_at) < new Date('2025-01-01');
  };

  // Custom actions for the table
  const getCustomActions = (teacher: Teacher) => {
    const actions = [];
    
    if (needsInvite(teacher)) {
      actions.push({
        label: 'Send Invite',
        icon: <Mail className="h-4 w-4" />,
        onClick: handleInvite,
        variant: 'default' as const,
      });
    } else {
      actions.push({
        label: 'Reset Password',
        icon: <Key className="h-4 w-4" />,
        onClick: handleResetPassword,
        variant: 'outline' as const,
      });
    }
    
    actions.push({
      label: 'Toggle Status',
      icon: <UserX className="h-4 w-4" />,
      onClick: handleToggleStatus,
      variant: 'destructive' as const,
    });
    
    return actions;
  };

  // Table columns
  const columns = [
    {
      key: 'employee_id',
      label: 'Employee ID',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <IdCard className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">{value}</Badge>
        </div>
      ),
    },
    {
      key: 'first_name',
      label: 'Name',
      sortable: true,
      render: (value: string, item: Teacher) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.first_name} {item.last_name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {item.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value: string) => (
        value ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{value}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (value: string) => (
        value ? (
          <Badge variant="outline">{value}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'subjects',
      label: 'Subjects',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value && value.length > 0 ? (
            <>
              <BookOpen className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="flex flex-wrap gap-1">
                {value.slice(0, 2).map((subject, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {subject}
                  </Badge>
                ))}
                {value.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{value.length - 2} more
                  </Badge>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">No subjects assigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'} className="capitalize">
          {value}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teaching staff and their subjects
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
            Add Teacher
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
                <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                <p className="text-2xl font-bold text-gray-900">{totalTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assigned as Class Teacher</p>
                <p className="text-2xl font-bold text-gray-900">{assignedTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unassigned</p>
                <p className="text-2xl font-bold text-gray-900">{unassignedTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{avgSubjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EnhancedCrudTable
        entity="teachers"
        columns={columns}
        title="Teachers"
        searchPlaceholder="Search teachers..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        addButtonText="Add Teacher"
        customData={teachersData}
        isCustomDataLoading={isLoading}
        customActions={getCustomActions}
      />

      <TeacherFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        teacher={editingTeacher}
      />

      {/* Bulk Upload Modal */}
      <CSVUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        entity="teachers"
        onUpload={handleBulkUpload}
      />

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedTeacher?.first_name} {selectedTeacher?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPasswordResetOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPasswordReset}
              disabled={passwordResetMutation.isPending}
            >
              {passwordResetMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invite</DialogTitle>
            <DialogDescription>
              Create a login account for {selectedTeacher?.first_name} {selectedTeacher?.last_name}
              <br />
              <span className="text-sm text-muted-foreground">
                Email: {selectedTeacher?.email}
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
                Share this password with the teacher so they can login.
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
              {inviteUserMutation.isPending ? 'Creating Account...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 