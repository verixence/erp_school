'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  ArrowLeft, 
  School2, 
  Save, 
  Shield, 
  AlertCircle,
  Users,
  GraduationCap,
  UserCheck,
  Activity,
  Settings,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Building2,
  Edit3,
  Plus,
  Trash2,
  Crown,
  BarChart3,
  TrendingUp,
  Key
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { EnhancedSchoolForm } from '@/components/enhanced-school-form';
import { DeleteSchoolModal } from '@/components/ui/delete-school-modal';
import { toast } from 'react-hot-toast';

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
  principal_phone: string | null;
  theme_colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
  } | null;
  school_type: string | null;
  board_affiliation: string | null;
  establishment_year: number | null;
  total_capacity: number | null;
  description: string | null;
  settings: any;
  enabled_features: Record<string, boolean>;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SchoolAnalytics {
  school_id: string;
  school_name: string;
  status: string;
  created_at: string;
  total_students: number;
  total_teachers: number;
  total_parents: number;
  total_admins: number;
  total_users: number;
  active_users_30d: number;
  recent_users_7d: number;
  total_capacity: number | null;
  capacity_utilization_percent: number;
}

interface SchoolAdmin {
  id: string;
  user_id: string;
  role: string;
  is_primary: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
  user: {
    email: string;
    created_at: string;
  };
}

const featureLabels: Record<string, string> = {
  core: "Core Management",
  attend: "Attendance",
  exam: "Examinations",
  fee: "Fee Management",
  hw: "Homework",
  announce: "Announcements",
  chat: "Communication",
  lib: "Library",
  transport: "Transportation"
};

const featureDescriptions: Record<string, string> = {
  core: "Basic school management features",
  attend: "Student attendance tracking",
  exam: "Exam scheduling and results",
  fee: "Fee collection and management",
  hw: "Homework assignment and tracking",
  announce: "School announcements and notices",
  chat: "Internal messaging system",
  lib: "Library book management",
  transport: "School bus and transport management"
};

export default function EnhancedSchoolDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const schoolId = params.id as string;

  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'admins' | 'analytics'>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SchoolAdmin | null>(null);
  const [passwordResetModalOpen, setPasswordResetModalOpen] = useState(false);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<SchoolAdmin | null>(null);
  const [schoolStatusModalOpen, setSchoolStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: school, isLoading: schoolLoading, error: schoolError } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();
      
      if (error) throw error;
      return data as School;
    },
    enabled: !!schoolId && user?.role === 'super_admin',
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['school-analytics', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_analytics')
        .select('*')
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      return data as SchoolAnalytics;
    },
    enabled: !!schoolId && user?.role === 'super_admin',
  });

  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: ['school-admins', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_admins')
        .select(`
          *,
          user:users(email, created_at)
        `)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      return data as SchoolAdmin[];
    },
    enabled: !!schoolId && user?.role === 'super_admin',
  });

  // Update features when school data loads
  useEffect(() => {
    if (school?.enabled_features) {
      setFeatures(school.enabled_features);
    }
  }, [school]);

  const updateFeaturesMutation = useMutation({
    mutationFn: async (newFeatures: Record<string, boolean>) => {
      const { error } = await supabase
        .from('schools')
        .update({ enabled_features: newFeatures })
        .eq('id', schoolId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setHasChanges(false);
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (adminData: { email?: string; username?: string; password: string; role: string; permissions: Record<string, boolean>; useUsername?: boolean }) => {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminData.email,
          username: adminData.username,
          password: adminData.password,
          role: adminData.role,
          permissions: adminData.permissions,
          schoolId: schoolId,
          useUsername: adminData.useUsername,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create administrator');
      }

      // Show the username to the user
      if (result.username) {
        toast.success(`Admin created successfully! Username: ${result.username}`);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-admins', schoolId] });
      setAdminModalOpen(false);
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async (data: { adminId: string; role: string; permissions: Record<string, boolean> }) => {
      const { error } = await supabase
        .from('school_admins')
        .update({
          role: data.role,
          permissions: data.permissions,
        })
        .eq('id', data.adminId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-admins', schoolId] });
      setAdminModalOpen(false);
      setEditingAdmin(null);
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const { error } = await supabase
        .from('school_admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-admins', schoolId] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: string; newPassword: string }) => {
      const response = await fetch('/api/admin/reset-admin-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      return result;
    },
    onSuccess: () => {
      setPasswordResetModalOpen(false);
      setResetPasswordAdmin(null);
    },
  });

  const toggleSchoolStatusMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'inactive') => {
      const { error } = await supabase
        .from('schools')
        .update({ status: newStatus })
        .eq('id', schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setSchoolStatusModalOpen(false);
    },
  });

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
      // Redirect to schools list after successful deletion
      router.push('/super-admin/schools');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete school');
    },
  });

  const handleFeatureToggle = (featureKey: string, enabled: boolean) => {
    const newFeatures = { ...features, [featureKey]: enabled };
    setFeatures(newFeatures);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateFeaturesMutation.mutate(features);
  };

  const handleReset = () => {
    if (school?.enabled_features) {
      setFeatures(school.enabled_features);
      setHasChanges(false);
    }
  };

  const handleAddAdmin = () => {
    setEditingAdmin(null);
    setAdminModalOpen(true);
  };

  const handleEditAdmin = (admin: SchoolAdmin) => {
    setEditingAdmin(admin);
    setAdminModalOpen(true);
  };

  const handleDeleteAdmin = (adminId: string) => {
    if (confirm('Are you sure you want to remove this administrator?')) {
      deleteAdminMutation.mutate(adminId);
    }
  };

  const handleResetPassword = (admin: SchoolAdmin) => {
    setResetPasswordAdmin(admin);
    setPasswordResetModalOpen(true);
  };

  const handleToggleSchoolStatus = () => {
    setSchoolStatusModalOpen(true);
  };

  const handleDeleteSchool = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (schoolId: string, confirmationText: string) => {
    await deleteSchoolMutation.mutateAsync({ schoolId, confirmationText });
  };

  const formatAddress = (address: School['address']) => {
    if (!address) return 'No address provided';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.country,
      address.postal_code
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address provided';
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
        </motion.div>
      </div>
    );
  }

  if (schoolLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg p-6 mb-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
              <div>
                <div className="bg-card rounded-lg p-6">
                  <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-muted rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (schoolError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error Loading School</h2>
          <p className="text-muted-foreground mb-4">Unable to load school information.</p>
          <Link href="/super-admin">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!school) return null;

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
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="text-destructive hover:text-destructive"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* School Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                {/* Logo */}
                <div className="w-20 h-20 relative flex-shrink-0">
                  {school.logo_url ? (
                    <img 
                      src={school.logo_url} 
                      alt={`${school.name} logo`}
                      className="w-full h-full object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center ${school.logo_url ? 'hidden' : ''}`}>
                    <School2 className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>

                {/* School Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">{school.name}</h1>
                    {school.website_url && (
                      <a 
                        href={school.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                    <Badge variant={school.status === 'active' ? 'default' : 'secondary'}>
                      {school.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>{school.domain || 'No domain'}</span>
                    </div>
                    {school.email_address && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{school.email_address}</span>
                      </div>
                    )}
                    {school.phone_number && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{school.phone_number}</span>
                      </div>
                    )}
                    {school.address && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{formatAddress(school.address)}</span>
                      </div>
                    )}
                    {school.establishment_year && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Est. {school.establishment_year}</span>
                      </div>
                    )}
                    {school.school_type && (
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">{school.school_type}</span>
                      </div>
                    )}
                  </div>

                  {school.description && (
                    <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                      {school.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditModalOpen(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'features', label: 'Features', icon: Settings },
            { id: 'admins', label: 'Administrators', icon: Shield },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center space-x-2"
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <GraduationCap className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="text-2xl font-bold">{analytics?.total_students || 0}</div>
                      <p className="text-sm text-muted-foreground">Students</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="text-2xl font-bold">{analytics?.total_teachers || 0}</div>
                      <p className="text-sm text-muted-foreground">Teachers</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <UserCheck className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="text-2xl font-bold">{analytics?.total_parents || 0}</div>
                      <p className="text-sm text-muted-foreground">Parents</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Activity className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="text-2xl font-bold">{analytics?.total_users || 0}</div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </CardContent>
                  </Card>
                </div>

                {/* School Details Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Phone className="w-5 h-5" />
                        <span>Contact Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {school.email_address && (
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{school.email_address}</span>
                        </div>
                      )}
                      {school.phone_number && (
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{school.phone_number}</span>
                        </div>
                      )}
                      {school.address && (
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm">{formatAddress(school.address)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Principal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Crown className="w-5 h-5" />
                        <span>Principal Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {school.principal_name ? (
                        <>
                          <div className="font-medium">{school.principal_name}</div>
                          {school.principal_email && (
                            <div className="flex items-center space-x-3 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span>{school.principal_email}</span>
                            </div>
                          )}
                          {school.principal_phone && (
                            <div className="flex items-center space-x-3 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{school.principal_phone}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">No principal information available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'features' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Management</CardTitle>
                    <CardDescription>
                      Enable or disable features for this school. Changes will be applied immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(featureLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-foreground">{label}</h3>
                              {key === 'core' && (
                                <Badge variant="secondary">Required</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {featureDescriptions[key]}
                            </p>
                          </div>
                          
                          <div className="ml-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={features[key] || false}
                                onChange={(e) => handleFeatureToggle(key, e.target.checked)}
                                disabled={key === 'core'} // Core is always required
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"></div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Save Controls */}
                    {hasChanges && (
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">
                              You have unsaved changes
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={handleReset}>
                              Reset
                            </Button>
                            <Button 
                              size="sm"
                              onClick={handleSave}
                              disabled={updateFeaturesMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {updateFeaturesMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {updateFeaturesMutation.isError && (
                      <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">
                          Error saving changes. Please try again.
                        </p>
                      </div>
                    )}

                    {updateFeaturesMutation.isSuccess && !hasChanges && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          Changes saved successfully!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'admins' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>School Administrators</CardTitle>
                        <CardDescription>
                          Manage administrators for this school
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={handleAddAdmin}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Admin
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {adminsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-full"></div>
                              <div>
                                <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                                <div className="h-3 bg-muted rounded w-24"></div>
                              </div>
                            </div>
                            <div className="h-8 bg-muted rounded w-20"></div>
                          </div>
                        ))}
                      </div>
                    ) : admins && admins.length > 0 ? (
                      <div className="space-y-3">
                        {admins.map((admin) => (
                          <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{admin.user.email}</span>
                                  {admin.is_primary && (
                                    <Badge variant="default" className="text-xs">Primary</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {admin.role} • Joined {new Date(admin.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditAdmin(admin)}
                                title="Edit Administrator"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleResetPassword(admin)}
                                title="Reset Password"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              {!admin.is_primary && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                  title="Delete Administrator"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No administrators found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>School Analytics</CardTitle>
                    <CardDescription>
                      Detailed insights and performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="animate-pulse h-20 bg-muted rounded"></div>
                        ))}
                      </div>
                    ) : analytics ? (
                      <div className="space-y-6">
                        {/* Capacity Utilization */}
                        {analytics.total_capacity && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Capacity Utilization</h4>
                              <span className="text-sm text-muted-foreground">
                                {analytics.total_students} / {analytics.total_capacity} students
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3">
                              <div
                                className="bg-primary h-3 rounded-full transition-all"
                                style={{ width: `${Math.min(analytics.capacity_utilization_percent, 100)}%` }}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {analytics.capacity_utilization_percent}% capacity utilized
                            </p>
                          </div>
                        )}

                        {/* User Distribution */}
                        <div>
                          <h4 className="font-medium mb-4">User Distribution</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{analytics.total_students}</div>
                              <p className="text-sm text-muted-foreground">Students</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">{analytics.total_teachers}</div>
                              <p className="text-sm text-muted-foreground">Teachers</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">{analytics.total_parents}</div>
                              <p className="text-sm text-muted-foreground">Parents</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">{analytics.total_admins}</div>
                              <p className="text-sm text-muted-foreground">Admins</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No analytics data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>School Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">School ID:</span>
                  <p className="font-mono text-xs">{school.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p>{new Date(school.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <p>{new Date(school.updated_at || school.created_at).toLocaleDateString()}</p>
                </div>
                {school.board_affiliation && (
                  <div>
                    <span className="text-muted-foreground">Board:</span>
                    <p>{school.board_affiliation}</p>
                  </div>
                )}
                {school.total_capacity && (
                  <div>
                    <span className="text-muted-foreground">Capacity:</span>
                    <p>{school.total_capacity.toLocaleString()} students</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Features Active:</span>
                  <p>
                    {Object.values(features).filter(Boolean).length} / {Object.keys(features).length}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Theme Colors */}
            {school.theme_colors && (
              <Card>
                <CardHeader>
                  <CardTitle>Theme Colors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(school.theme_colors).map(([key, color]) => (
                      <div key={key} className="text-center">
                        <div 
                          className="w-full h-12 rounded-lg border border-border mb-2"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-xs font-medium capitalize">{key}</p>
                        <p className="text-xs text-muted-foreground font-mono">{color}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit School Details
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => {
                    // Show user analytics instead of navigating to school admin
                    setActiveTab('analytics');
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View User Analytics
                </Button>
                
                <Button 
                  variant="outline" 
                  className={`w-full justify-start ${school?.status === 'active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                  size="sm"
                  onClick={handleToggleSchoolStatus}
                >
                  {school?.status === 'active' ? (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Deactivate School
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      Activate School
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => {
                    // Toggle to features tab
                    setActiveTab('features');
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  School Settings
                </Button>
                
                {/* Danger Zone - Delete School */}
                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5" 
                    size="sm"
                    onClick={handleDeleteSchool}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete School Permanently
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit School Modal */}
      {school && (
        <EnhancedSchoolForm
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          editMode={true}
          initialData={{
            id: school.id,
            name: school.name,
            domain: school.domain || '',
            description: school.description || '',
            school_type: school.school_type || 'public',
            board_affiliation: school.board_affiliation || '',
            establishment_year: school.establishment_year?.toString() || '',
            total_capacity: school.total_capacity?.toString() || '',
            logo_url: school.logo_url || '',
            website_url: school.website_url || '',
            email_address: school.email_address || '',
            phone_number: school.phone_number || '',
            address: {
              street: school.address?.street || '',
              city: school.address?.city || '',
              state: school.address?.state || '',
              country: school.address?.country || '',
              postal_code: school.address?.postal_code || ''
            },
            principal_name: school.principal_name || '',
            principal_email: school.principal_email || '',
            principal_phone: school.principal_phone || '',
            theme_colors: {
              primary: school.theme_colors?.primary || '#2563eb',
              secondary: school.theme_colors?.secondary || '#64748b',
              accent: school.theme_colors?.accent || '#0ea5e9'
            }
          }}
        />
      )}

      {/* Admin Management Modal */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>{editingAdmin ? 'Edit Administrator' : 'Add Administrator'}</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const useUsername = formData.get('loginType') === 'username';
              const email = !useUsername ? (formData.get('email') as string) : undefined;
              const username = useUsername ? (formData.get('username') as string) : undefined;
              const password = formData.get('password') as string;
              const role = formData.get('role') as string;

              const permissions = {
                manage_users: formData.get('manage_users') === 'on',
                manage_sections: formData.get('manage_sections') === 'on',
                manage_timetable: formData.get('manage_timetable') === 'on',
                view_analytics: formData.get('view_analytics') === 'on',
              };

              if (editingAdmin) {
                updateAdminMutation.mutate({
                  adminId: editingAdmin.id,
                  role,
                  permissions,
                });
              } else {
                addAdminMutation.mutate({
                  email,
                  username,
                  password,
                  role,
                  permissions,
                  useUsername,
                });
              }
            }}
            className="space-y-4"
          >
            {!editingAdmin && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Login Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="loginType"
                        value="username"
                        defaultChecked
                        className="text-primary"
                        onChange={(e) => {
                          const emailInput = document.getElementById('admin-email-input') as HTMLInputElement;
                          const usernameInput = document.getElementById('admin-username-input') as HTMLInputElement;
                          if (emailInput && usernameInput) {
                            emailInput.required = !e.target.checked;
                            emailInput.disabled = e.target.checked;
                            usernameInput.required = e.target.checked;
                            usernameInput.disabled = !e.target.checked;
                          }
                        }}
                      />
                      <span className="text-sm">Username</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="loginType"
                        value="email"
                        className="text-primary"
                        onChange={(e) => {
                          const emailInput = document.getElementById('admin-email-input') as HTMLInputElement;
                          const usernameInput = document.getElementById('admin-username-input') as HTMLInputElement;
                          if (emailInput && usernameInput) {
                            emailInput.required = e.target.checked;
                            emailInput.disabled = !e.target.checked;
                            usernameInput.required = !e.target.checked;
                            usernameInput.disabled = e.target.checked;
                          }
                        }}
                      />
                      <span className="text-sm">Email Address</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Username</label>
                  <input
                    id="admin-username-input"
                    type="text"
                    name="username"
                    required
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="e.g., admin01, principal_smith"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a unique username for login (recommended for admins without email)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <input
                    id="admin-email-input"
                    type="email"
                    name="email"
                    disabled
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter secure password (min 6 characters)"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                name="role"
                defaultValue={editingAdmin?.role || 'admin'}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="admin">Administrator</option>
                <option value="principal">Principal</option>
                <option value="vice_principal">Vice Principal</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Permissions</label>
              <div className="space-y-2">
                {[
                  { key: 'manage_users', label: 'Manage Users (Teachers, Students, Parents)' },
                  { key: 'manage_sections', label: 'Manage Sections & Classes' },
                  { key: 'manage_timetable', label: 'Manage Timetable' },
                  { key: 'view_analytics', label: 'View Analytics & Reports' },
                ].map((permission) => (
                  <label key={permission.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name={permission.key}
                      defaultChecked={editingAdmin?.permissions?.[permission.key] || true}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdminModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addAdminMutation.isPending || updateAdminMutation.isPending}
              >
                {addAdminMutation.isPending || updateAdminMutation.isPending
                  ? 'Saving...'
                  : editingAdmin
                  ? 'Update Admin'
                  : 'Add Admin'}
              </Button>
            </div>
          </form>

          {(addAdminMutation.isError || updateAdminMutation.isError) && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {editingAdmin ? 'Error updating administrator.' : 'Error adding administrator.'} Please try again.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={passwordResetModalOpen} onOpenChange={setPasswordResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-primary" />
              <span>Reset Password</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newPassword = formData.get('newPassword') as string;

              if (resetPasswordAdmin && newPassword) {
                resetPasswordMutation.mutate({
                  userId: resetPasswordAdmin.user_id,
                  newPassword,
                });
              }
            }}
            className="space-y-4"
          >
            <div className="text-sm text-muted-foreground">
              Resetting password for: <strong>{resetPasswordAdmin?.user.email}</strong>
            </div>

            <div>
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setPasswordResetModalOpen(false)}
                disabled={resetPasswordMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>

            {resetPasswordMutation.isError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  Error resetting password. Please try again.
                </p>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* School Status Toggle Modal */}
      <Dialog open={schoolStatusModalOpen} onOpenChange={setSchoolStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {school?.status === 'active' ? (
                <>
                  <Shield className="w-5 h-5 text-orange-600" />
                  <span>Deactivate School</span>
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5 text-green-600" />
                  <span>Activate School</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {school?.status === 'active' ? (
                <>
                  Are you sure you want to <strong>deactivate</strong> {school.name}? 
                  <br />
                  <br />
                  This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Prevent all users from logging in</li>
                    <li>Disable all school operations</li>
                    <li>Make the school appear as inactive in the system</li>
                  </ul>
                </>
              ) : (
                <>
                  Are you sure you want to <strong>activate</strong> {school?.name}?
                  <br />
                  <br />
                  This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Allow users to log in and access the system</li>
                    <li>Enable all school operations</li>
                    <li>Make the school appear as active in the system</li>
                  </ul>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSchoolStatusModalOpen(false)}
                disabled={toggleSchoolStatusMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const newStatus = school?.status === 'active' ? 'inactive' : 'active';
                  toggleSchoolStatusMutation.mutate(newStatus);
                }}
                disabled={toggleSchoolStatusMutation.isPending}
                className={school?.status === 'active' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {toggleSchoolStatusMutation.isPending 
                  ? (school?.status === 'active' ? 'Deactivating...' : 'Activating...')
                  : (school?.status === 'active' ? 'Deactivate' : 'Activate')
                }
              </Button>
            </div>

            {toggleSchoolStatusMutation.isError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  Error changing school status. Please try again.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete School Modal */}
      <DeleteSchoolModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        school={school}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteSchoolMutation.isPending}
      />
    </div>
  );
}