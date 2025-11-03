'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import ParentFormModal from '@/components/parent-form-modal';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  Phone, 
  User, 
  Users, 
  Heart, 
  Upload, 
  Plus, 
  UserPlus,
  Key,
  UserX
} from 'lucide-react';
import { toast } from 'sonner';

interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  relation: string;
  status: string;
  created_at: string;
  children_count?: number;
}

export default function ParentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  // Password reset mutation - using simple endpoint
  const passwordResetMutation = useMutation({
    mutationFn: async ({ parent, new_password }: { parent: Parent; new_password: string }) => {
      const response = await fetch('/api/admin/simple-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: parent.id, 
          new_password, 
          school_id: user?.school_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Password reset failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setIsPasswordResetOpen(false);
      setSelectedParent(null);
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
      queryClient.invalidateQueries({ queryKey: ['parents'] });
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
      setSelectedParent(null);
      setTemporaryPassword('');
      queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (error: any) => {
      toast.error(`Invite failed: ${error.message}`);
    },
  });

  // Fetch parents with children count via junction table
  const { data: parentsData = [], isLoading } = useQuery({
    queryKey: ['parents', user?.school_id],
    queryFn: async () => {
      // First get parents
      const { data: parents, error: parentsError } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', user?.school_id)
        .eq('role', 'parent')
        .order('created_at', { ascending: false });
      
      if (parentsError) throw parentsError;

      // Then get parent-student relationships 
      const { data: relationships, error: relError } = await supabase
        .from('student_parents')
        .select('parent_id, student_id');
      
      if (relError) throw relError;

      // Combine the data
      const parentsWithChildrenCount = parents.map(parent => ({
        ...parent,
        children_count: relationships.filter(rel => rel.parent_id === parent.id).length
      }));

      // Debug logging
      console.log('Parents:', parents.length);
      console.log('Parent-Student relationships:', relationships.length);
      console.log('Sample parent with children count:', parentsWithChildrenCount[0]);

      return parentsWithChildrenCount as Parent[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch students for stats
  const { data: studentsData = [] } = useQuery({
    queryKey: ['students-stats', user?.school_id],
    queryFn: async () => {
      // Get all students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user?.school_id);
      
      if (studentsError) throw studentsError;

      // Get student-parent relationships
      const { data: relationships, error: relError } = await supabase
        .from('student_parents')
        .select('student_id');
      
      if (relError) throw relError;

      // Combine data
      const studentsWithParentInfo = students.map(student => ({
        ...student,
        student_parents: relationships.filter(rel => rel.student_id === student.id)
      }));

      return studentsWithParentInfo;
    },
    enabled: !!user?.school_id,
  });

  // Handlers
  const handleAdd = () => {
    setEditingParent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent(parent);
    setIsModalOpen(true);
  };

  const handleResetPassword = (parent: Parent) => {
    setSelectedParent(parent);
    setNewPassword('');
    setIsPasswordResetOpen(true);
  };

  const handleConfirmPasswordReset = () => {
    if (!selectedParent || !newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    passwordResetMutation.mutate({
      parent: selectedParent,
      new_password: newPassword.trim(),
    });
  };

  const handleToggleStatus = (parent: Parent) => {
    const newStatus = parent.status === 'active' ? 'inactive' : 'active';
    statusToggleMutation.mutate({
      user_id: parent.id,
      status: newStatus,
    });
  };

  const handleInvite = (parent: Parent) => {
    setSelectedParent(parent);
    setTemporaryPassword('');
    setIsInviteOpen(true);
  };

  const handleConfirmInvite = () => {
    if (!selectedParent || !temporaryPassword.trim()) {
      toast.error('Please enter a temporary password');
      return;
    }

    if (temporaryPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    inviteUserMutation.mutate({
      user_id: selectedParent.id,
      temporary_password: temporaryPassword.trim(),
    });
  };

  // Calculate stats
  const totalParents = parentsData.length;
  const studentsWithParents = studentsData.filter(s => s.student_parents && s.student_parents.length > 0).length;
  const studentsWithoutParents = studentsData.length - studentsWithParents;
  const relationStats = parentsData.reduce((acc, parent) => {
    acc[parent.relation] = (acc[parent.relation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Function to check if parent needs invite (has no auth account)
  const needsInvite = (parent: Parent) => {
    // This is a simple check - in a real app, you might want to track this in the database
    // For now, we'll assume parents created through manual entry need invites
    // while bulk uploaded parents already have auth accounts
    return !parent.created_at || new Date(parent.created_at) < new Date('2025-01-01');
  };

  // Custom actions for the table
  const getCustomActions = (parent: Parent) => {
    const actions = [];
    
    if (needsInvite(parent)) {
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
      key: 'first_name',
      label: 'Name',
      sortable: true,
      render: (value: string, item: Parent) => (
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
      key: 'relation',
      label: 'Relation',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary" className="capitalize">
            {value}
          </Badge>
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
      key: 'children_count',
      label: 'Children',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{value || 0}</span>
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
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parents</h1>
          <p className="text-muted-foreground">
            Manage parents and guardians
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Parent
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserPlus className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Parents</p>
                <p className="text-2xl font-bold text-gray-900">{totalParents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserPlus className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Students with Parents</p>
                <p className="text-2xl font-bold text-gray-900">{studentsWithParents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Students without Parents</p>
                <p className="text-2xl font-bold text-gray-900">{studentsWithoutParents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Heart className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Relations</p>
                <div className="text-sm text-gray-500">
                  {Object.entries(relationStats).map(([relation, count]) => (
                    <div key={relation} className="capitalize">
                      {relation}: {count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EnhancedCrudTable
        entity="parents"
        columns={columns}
        title="Parents"
        searchPlaceholder="Search parents..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        addButtonText="Add Parent"
        customData={parentsData}
        isCustomDataLoading={isLoading}
        customActions={getCustomActions}
      />

      <ParentFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        parent={editingParent}
      />

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedParent?.first_name} {selectedParent?.last_name}
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
              Create a login account for {selectedParent?.first_name} {selectedParent?.last_name}
              <br />
              <span className="text-sm text-muted-foreground">
                Email: {selectedParent?.email}
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
                Share this password with the parent so they can login.
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