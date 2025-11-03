'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { DataGrid, DataGridColumn } from '@/components/data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Globe, ExternalLink, Users, MapPin, Phone, Mail, Trash2, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { EnhancedSchoolForm } from '@/components/enhanced-school-form';
import { DeleteSchoolModal } from '@/components/ui/delete-school-modal';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  website_url: string | null;
  email_address: string | null;
  phone_number: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  } | null;
  principal_name: string | null;
  principal_email: string | null;
  school_type: string | null;
  board_affiliation: string | null;
  establishment_year: number | null;
  total_capacity: number | null;
  description: string | null;
  enabled_features: Record<string, boolean>;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function SchoolsManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [showEnhancedForm, setShowEnhancedForm] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);

  // Delete school mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: async ({ schoolId, confirmationText }: { schoolId: string; confirmationText: string }) => {
      const response = await fetch('/api/admin/delete-school', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId,
          confirmationText,
          userId: user?.id,
          confirmationToken: `${Date.now()}-${schoolId}`
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete school');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`School "${data.deletedSchool.name}" has been permanently deleted`);
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setDeleteModalOpen(false);
      setSchoolToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete school');
    },
  });

  const handleDeleteSchool = (school: School) => {
    setSchoolToDelete(school);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (schoolId: string, confirmationText: string) => {
    await deleteSchoolMutation.mutateAsync({ schoolId, confirmationText });
  };

  const columns: DataGridColumn<School>[] = [
    {
      key: 'name',
      label: 'School Information',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 relative">
            {row.logo_url ? (
              <img 
                src={row.logo_url} 
                alt={`${value} logo`}
                className="w-full h-full object-cover rounded-lg border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center ${row.logo_url ? 'hidden' : ''}`}>
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="font-semibold text-foreground truncate">{value}</p>
              {row.website_url && (
                <a 
                  href={row.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>{row.domain || 'No domain'}</span>
              </span>
              {row.school_type && (
                <Badge variant="outline" className="text-xs">
                  {row.school_type}
                </Badge>
              )}
            </div>
            {(row.email_address || row.phone_number) && (
              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                {row.email_address && (
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3 h-3" />
                    <span>{row.email_address}</span>
                  </span>
                )}
                {row.phone_number && (
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{row.phone_number}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Location',
      render: (value, row) => {
        const address = value as School['address'];
        if (!address || (!address.city && !address.country)) {
          return <span className="text-muted-foreground">No address</span>;
        }
        
        const addressParts = [
          address.city,
          address.state,
          address.country
        ].filter(Boolean);
        
        return (
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{addressParts.join(', ')}</span>
          </div>
        );
      },
    },
    {
      key: 'principal_name',
      label: 'Principal',
      render: (value, row) => {
        if (!value) {
          return <span className="text-muted-foreground">Not set</span>;
        }
        return (
          <div>
            <p className="font-medium">{value}</p>
            {row.principal_email && (
              <p className="text-sm text-muted-foreground">{row.principal_email}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'total_capacity',
      label: 'Capacity',
      render: (value, row) => {
        if (!value) {
          return <span className="text-muted-foreground">Not set</span>;
        }
        return (
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{value.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'enabled_features',
      label: 'Features',
      render: (value) => {
        const enabled = Object.values(value).filter(Boolean).length;
        const total = Object.keys(value).length;
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{enabled}/{total}</span>
            <div className="w-16 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(enabled / total) * 100}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/super-admin/${row.id}`);
            }}
            className="h-8 w-8 p-0 btn-visible hover:text-foreground hover:bg-accent transition-all duration-200 rounded-md"
            title="Edit school"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSchool(row);
            }}
            className="h-8 w-8 p-0 btn-visible hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-md"
            title="Delete school"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleRowClick = (school: School) => {
    router.push(`/super-admin/${school.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/super-admin"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DataGrid
          entity="schools"
          title="Schools Management"
          description="Manage all schools in your ERP system with comprehensive details"
          columns={columns}
          searchPlaceholder="Search schools by name, domain, or location..."
          onRowClick={handleRowClick}
          onAdd={() => setShowEnhancedForm(true)}
          enableSelection={true}
          enableExport={true}
          enableColumnToggle={true}
        />
      </div>

      {/* Enhanced School Creation Form */}
      <EnhancedSchoolForm
        open={showEnhancedForm}
        onOpenChange={setShowEnhancedForm}
      />

      {/* Delete School Modal */}
      <DeleteSchoolModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        school={schoolToDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteSchoolMutation.isPending}
      />
    </div>
  );
} 