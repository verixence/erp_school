'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import StudentFormDrawer from '@/components/student-form-drawer';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, GraduationCap } from 'lucide-react';

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
  parent_id?: string;
  parent?: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch students with parent information
  const { data: studentsData = [] } = useQuery({
    queryKey: ['students', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          parent:users!parent_id(first_name, last_name)
        `)
        .eq('school_id', user?.school_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Student[];
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
      label: 'Parent',
      render: (value: any, item: Student) => {
        if (item.parent) {
          return `${item.parent.first_name} ${item.parent.last_name}`;
        }
        return <span className="text-muted-foreground">Not assigned</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">
            Manage student records and information
          </p>
        </div>
      </div>

      <EnhancedCrudTable
        entity="students"
        columns={columns}
        title="Students"
        searchPlaceholder="Search students..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        addButtonText="Add Student"
      />

      <StudentFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        student={editingStudent}
      />
    </div>
  );
} 