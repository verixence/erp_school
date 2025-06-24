'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { DataGrid, DataGridColumn } from '@/components/data-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Building2, Globe, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface School {
  id: string;
  name: string;
  domain: string | null;
  enabled_features: Record<string, boolean>;
  status: string;
  created_at: string;
}

interface AddSchoolData {
  name: string;
  domain: string;
  adminEmail: string;
  adminPassword: string;
  sendWelcomeEmail: boolean;
}

export default function SchoolsManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AddSchoolData>({
    name: '',
    domain: '',
    adminEmail: '',
    adminPassword: '',
    sendWelcomeEmail: true,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Mutation for adding new school
  const addSchoolMutation = useMutation({
    mutationFn: async (data: AddSchoolData) => {
      const response = await fetch('/api/admin/create-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          domain: data.domain,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create school (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create school');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowAddDialog(false);
        setShowSuccess(false);
        setCurrentStep(1);
        setFormData({
          name: '',
          domain: '',
          adminEmail: '',
          adminPassword: '',
          sendWelcomeEmail: true,
        });
      }, 2000);
    },
  });

  const columns: DataGridColumn<School>[] = [
    {
      key: 'name',
      label: 'School Name',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-medium">{value}</p>
            <p className="text-sm text-muted-foreground">{row.domain || 'No domain'}</p>
          </div>
        </div>
      ),
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
                className="bg-primary h-2 rounded-full"
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
  ];

  const handleRowClick = (school: School) => {
    router.push(`/super-admin/${school.id}`);
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      addSchoolMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    if (currentStep === 1) {
      return formData.name.trim() && formData.domain.trim();
    }
    return formData.adminEmail.trim() && formData.adminPassword.trim();
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
          description="Manage all schools in your ERP system"
          columns={columns}
          searchPlaceholder="Search schools by name..."
          onRowClick={handleRowClick}
          onAdd={() => setShowAddDialog(true)}
          enableSelection={true}
          enableExport={true}
          enableColumnToggle={true}
        />
      </div>

      {/* Add School Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Add New School</span>
            </DialogTitle>
            <DialogDescription>
              Step {currentStep} of 2: {currentStep === 1 ? 'School Details' : 'Admin Account'}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {!showSuccess ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: currentStep === 1 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: currentStep === 1 ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {currentStep === 1 ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">School Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Green Valley High School"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Domain *</label>
                      <Input
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="e.g., greenvalley.edu"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Used for email domains and school identification
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium">Admin Email *</label>
                      <Input
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        placeholder="admin@school.edu"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Admin Password *</label>
                      <Input
                        type="password"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        placeholder="Enter secure password"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum 8 characters recommended
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sendWelcome"
                        checked={formData.sendWelcomeEmail}
                        onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="sendWelcome" className="text-sm">
                        Send welcome email to admin
                      </label>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">School Created Successfully!</h3>
                <p className="text-muted-foreground">
                  {formData.name} has been added to your ERP system.
                </p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4"
                >
                  <Sparkles className="w-8 h-8 text-yellow-500 mx-auto animate-pulse" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showSuccess && (
            <DialogFooter>
              <div className="flex justify-between w-full">
                <Button
                  variant="outline"
                  onClick={currentStep === 1 ? () => setShowAddDialog(false) : handleBack}
                  disabled={addSchoolMutation.isPending}
                >
                  {currentStep === 1 ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid() || addSchoolMutation.isPending}
                >
                  {addSchoolMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                      />
                      Creating...
                    </>
                  ) : currentStep === 1 ? (
                    'Next'
                  ) : (
                    'Create School'
                  )}
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 