'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import TeacherFormModal from '@/components/teacher-form-modal';
import CSVUploadModal from '@/components/csv-upload-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, User, BookOpen, IdCard, Upload, Plus, Users, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Teacher {
  id: string;
  user_id: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Fetch teachers from the teachers table (not users)
  const { data: teachersData = [] } = useQuery({
    queryKey: ['teachers', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', user?.school_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Teacher[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch sections to see how many teachers are assigned as class teachers
  const { data: sectionsData = [] } = useQuery({
    queryKey: ['sections', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('class_teacher')
        .eq('school_id', user?.school_id)
        .not('class_teacher', 'is', null);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
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

  const handleBulkUpload = async (csvData: any[]) => {
    try {
      // Use the database function for bulk creating teachers
      const { data, error } = await supabase.rpc('bulk_create_teachers', {
        p_school_id: user?.school_id,
        p_teachers: csvData
      });

      if (error) throw error;

      const result = data as {
        success_count: number;
        error_count: number;
        results: Array<{ email: string; status: string; error?: string }>;
      };

      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      
      if (result.error_count > 0) {
        const errors = result.results
          .filter(r => r.status === 'error')
          .map(r => `${r.email}: ${r.error}`)
          .join('\n');
        
        toast.error(`${result.success_count} teachers created successfully, ${result.error_count} failed:\n${errors}`);
      } else {
        toast.success(`Successfully imported ${result.success_count} teachers with user accounts.`);
      }
    } catch (error: any) {
      toast.error(`Bulk upload failed: ${error.message}`);
      throw error;
    }
  };

  // Calculate stats
  const totalTeachers = teachersData.length;
  const assignedTeachers = sectionsData.length;
  const unassignedTeachers = totalTeachers - assignedTeachers;
  const avgSubjects = teachersData.length > 0 
    ? Math.round(teachersData.reduce((sum, teacher) => sum + (teacher.subjects?.length || 0), 0) / teachersData.length)
    : 0;

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
        isCustomDataLoading={false}
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
    </div>
  );
} 