'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import TeacherFormModal from '@/components/teacher-form-modal';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, User, BookOpen, IdCard } from 'lucide-react';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_id: string;
  subjects: string[];
  created_at: string;
}

export default function TeachersPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Fetch teachers
  const { data: teachersData = [] } = useQuery({
    queryKey: ['teachers', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', user?.school_id)
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Teacher[];
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
          <h1 className="text-3xl font-bold">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teaching staff and their subjects
          </p>
        </div>
      </div>

      <EnhancedCrudTable
        entity="users"
        columns={columns}
        title="Teachers"
        searchPlaceholder="Search teachers..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        addButtonText="Add Teacher"
        filters={{ role: 'teacher' }}
      />

      <TeacherFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        teacher={editingTeacher}
      />
    </div>
  );
} 