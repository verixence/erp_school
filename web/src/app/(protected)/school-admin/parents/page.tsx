'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import EnhancedCrudTable from '@/components/enhanced-crud-table';
import ParentFormModal from '@/components/parent-form-modal';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, User, Users, Heart } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);

  // Fetch parents with children count
  const { data: parentsData = [] } = useQuery({
    queryKey: ['parents', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          children:students!parent_id(count)
        `)
        .eq('school_id', user?.school_id)
        .eq('role', 'parent')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to include children count
      return data.map(parent => ({
        ...parent,
        children_count: parent.children?.[0]?.count || 0
      })) as Parent[];
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
          <h1 className="text-3xl font-bold">Parents</h1>
          <p className="text-muted-foreground">
            Manage parents and guardians
          </p>
        </div>
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
      />

      <ParentFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        parent={editingParent}
      />
    </div>
  );
} 