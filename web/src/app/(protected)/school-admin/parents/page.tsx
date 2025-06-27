'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import ParentFormModal from '@/components/parent-form-modal';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, User, Users, Heart, Upload, Plus, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  relation: string;
  created_at: string;
  children_count?: number;
}

export default function ParentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);


  // Fetch parents with children count via junction table
  const { data: parentsData = [] } = useQuery({
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



  // Calculate stats
  const totalParents = parentsData.length;
  const studentsWithParents = studentsData.filter(s => s.student_parents && s.student_parents.length > 0).length;
  const studentsWithoutParents = studentsData.length - studentsWithParents;
  const relationStats = parentsData.reduce((acc, parent) => {
    acc[parent.relation] = (acc[parent.relation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
              <Users className="w-8 h-8 text-green-600" />
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
              <Heart className="w-8 h-8 text-pink-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Most Common</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {Object.keys(relationStats).length > 0 
                    ? Object.entries(relationStats).sort((a, b) => b[1] - a[1])[0][0]
                    : '-'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EnhancedCrudTable
        entity="users"
        columns={columns}
        title="Parents"
        searchPlaceholder="Search parents..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        addButtonText="Add Parent"
        filters={{ role: 'parent' }}
        customData={parentsData}
        isCustomDataLoading={false}
      />

      <ParentFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        parent={editingParent}
      />


    </div>
  );
}