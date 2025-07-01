'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, 
  MapPin, 
  User, 
  Palette, 
  Shield,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Users,
  Upload,
  Image as ImageIcon,
  X,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

interface EnhancedSchoolFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode?: boolean;
  initialData?: Partial<FormData & { id: string }>;
}

type Step = 'basic' | 'contact' | 'principal' | 'settings' | 'admin' | 'review';

interface FormData {
  // Basic Information
  name: string;
  domain: string;
  description: string;
  school_type: string;
  board_affiliation: string;
  establishment_year: string;
  total_capacity: string;
  logo_url: string;
  website_url: string;

  // Contact Information
  email_address: string;
  phone_number: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };

  // Principal Information
  principal_name: string;
  principal_email: string;
  principal_phone: string;

  // Theme and Settings
  theme_colors: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // Admin Account
  adminEmail: string;
  adminPassword: string;
}

const initialFormData: FormData = {
  name: '',
  domain: '',
  description: '',
  school_type: 'public',
  board_affiliation: '',
  establishment_year: '',
  total_capacity: '',
  logo_url: '',
  website_url: '',
  email_address: '',
  phone_number: '',
  address: {
    street: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
  },
  principal_name: '',
  principal_email: '',
  principal_phone: '',
  theme_colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
  },
  adminEmail: '',
  adminPassword: '',
};

const steps: { id: Step; title: string; description: string; icon: React.ComponentType<any> }[] = [
  { id: 'basic', title: 'Basic Information', description: 'School details and branding', icon: Building2 },
  { id: 'contact', title: 'Contact Details', description: 'Address and communication', icon: MapPin },
  { id: 'principal', title: 'Principal Info', description: 'School leadership details', icon: User },
  { id: 'settings', title: 'Settings & Theme', description: 'Customization and preferences', icon: Palette },
  { id: 'admin', title: 'Admin Account', description: 'Primary administrator setup', icon: Shield },
  { id: 'review', title: 'Review & Create', description: 'Confirm and create school', icon: CheckCircle },
];

export function EnhancedSchoolForm({ open, onOpenChange, editMode = false, initialData }: EnhancedSchoolFormProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [formData, setFormData] = useState<FormData>(() => ({
    ...initialFormData,
    ...(editMode && initialData ? {
      name: initialData.name || '',
      domain: initialData.domain || '',
      description: initialData.description || '',
      school_type: initialData.school_type || 'public',
      board_affiliation: initialData.board_affiliation || '',
      establishment_year: initialData.establishment_year?.toString() || '',
      total_capacity: initialData.total_capacity?.toString() || '',
      logo_url: initialData.logo_url || '',
      website_url: initialData.website_url || '',
      email_address: initialData.email_address || '',
      phone_number: initialData.phone_number || '',
      address: initialData.address || {
        street: '',
        city: '',
        state: '',
        country: '',
        postal_code: ''
      },
      principal_name: initialData.principal_name || '',
      principal_email: initialData.principal_email || '',
      principal_phone: initialData.principal_phone || '',
      theme_colors: initialData.theme_colors || {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#0ea5e9'
      },
      adminEmail: '',
      adminPassword: ''
    } : {})
  }));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(
    editMode && initialData?.logo_url ? initialData.logo_url : ''
  );
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Filter out admin step in edit mode
  const availableSteps = editMode ? steps.filter(step => step.id !== 'admin') : steps;
  const currentStepIndex = availableSteps.findIndex(step => step.id === currentStep);

  const schoolMutation = useMutation({
    mutationFn: async (data: FormData) => {
      let finalLogoUrl = formData.logo_url;

      // Upload logo file if provided
      if (logoFile) {
        setUploadingLogo(true);
        try {
          const fileExt = logoFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('school-logos')
            .upload(fileName, logoFile);

          if (uploadError) {
            console.error('Logo upload error:', uploadError);
            throw new Error('Failed to upload logo');
          }

          const { data: { publicUrl } } = supabase.storage
            .from('school-logos')
            .getPublicUrl(fileName);

          finalLogoUrl = publicUrl;
        } catch (error) {
          console.error('Logo upload failed:', error);
          // Continue without logo if upload fails
        } finally {
          setUploadingLogo(false);
        }
      }

      const endpoint = editMode ? '/api/admin/update-school' : '/api/admin/create-school';
      const method = editMode ? 'PUT' : 'POST';
      const payload = editMode 
        ? { id: initialData?.id, ...data, logo_url: finalLogoUrl }
        : { ...data, logo_url: finalLogoUrl };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editMode ? 'update' : 'create'} school`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      if (editMode && initialData?.id) {
        queryClient.invalidateQueries({ queryKey: ['school', initialData.id] });
        queryClient.invalidateQueries({ queryKey: ['school-analytics', initialData.id] });
      }
      handleClose();
    },
  });

  const handleClose = useCallback(() => {
    setCurrentStep('basic');
    setFormData(initialFormData);
    setLogoFile(null);
    setLogoPreview('');
    setLogoInputMode('upload');
    onOpenChange(false);
  }, [onOpenChange]);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < availableSteps.length) {
      setCurrentStep(availableSteps[nextIndex].id);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(availableSteps[prevIndex].id);
    }
  };

  const handleSubmit = () => {
    schoolMutation.mutate(formData);
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateNestedFormData = (key: keyof FormData, nestedKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] as Record<string, any>),
        [nestedKey]: value,
      },
    }));
  };

  // Logo upload handlers
  const handleLogoFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a PNG, JPG, or JPEG file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Clear URL input when file is selected
    updateFormData({ logo_url: '' });
  }, []);

  const handleLogoUrlChange = useCallback((url: string) => {
    updateFormData({ logo_url: url });
    setLogoPreview(url);
    // Clear file when URL is entered
    if (url) {
      setLogoFile(null);
    }
  }, []);

  const clearLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview('');
    updateFormData({ logo_url: '' });
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateFormData({ adminPassword: password });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">School Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Enter school name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="domain">School Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => updateFormData({ domain: e.target.value })}
                  placeholder="school.edu"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Brief description of the school"
                className="mt-1 w-full px-3 py-2 border border-input rounded-md resize-none h-20"
              />
            </div>

            {/* Logo Upload Section */}
            <div>
              <Label>School Logo</Label>
              <div className="mt-2 space-y-4">
                {/* Toggle between upload and URL */}
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={logoInputMode === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogoInputMode('upload')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    variant={logoInputMode === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogoInputMode('url')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Image URL
                  </Button>
                </div>

                {/* File Upload Mode */}
                {logoInputMode === 'upload' && (
                  <div>
                    {logoPreview ? (
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <div className="relative inline-block">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="max-h-32 max-w-32 object-contain rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={clearLogo}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('logo-file-input')?.click()}
                          >
                            Change Logo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById('logo-file-input')?.click()}
                      >
                        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG or JPEG (max 5MB)
                        </p>
                      </div>
                    )}
                    <input
                      id="logo-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </div>
                )}

                {/* URL Input Mode */}
                {logoInputMode === 'url' && (
                  <div className="space-y-2">
                    <Input
                      value={formData.logo_url}
                      onChange={(e) => handleLogoUrlChange(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    {logoPreview && (
                      <div className="relative inline-block">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="max-h-32 max-w-32 object-contain rounded-lg border"
                          onError={() => {
                            setLogoPreview('');
                            alert('Invalid image URL');
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={clearLogo}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="school_type">School Type</Label>
                <select
                  id="school_type"
                  value={formData.school_type}
                  onChange={(e) => updateFormData({ school_type: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="international">International</option>
                  <option value="charter">Charter</option>
                </select>
              </div>
              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => updateFormData({ website_url: e.target.value })}
                  placeholder="https://school.edu"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="board_affiliation">Board Affiliation</Label>
                <Input
                  id="board_affiliation"
                  value={formData.board_affiliation}
                  onChange={(e) => updateFormData({ board_affiliation: e.target.value })}
                  placeholder="CBSE, ICSE, State Board, etc."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="establishment_year">Establishment Year</Label>
                <Input
                  id="establishment_year"
                  type="number"
                  value={formData.establishment_year}
                  onChange={(e) => updateFormData({ establishment_year: e.target.value })}
                  placeholder="1990"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="total_capacity">Total Capacity</Label>
                <Input
                  id="total_capacity"
                  type="number"
                  value={formData.total_capacity}
                  onChange={(e) => updateFormData({ total_capacity: e.target.value })}
                  placeholder="1000"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email_address">School Email *</Label>
                <Input
                  id="email_address"
                  type="email"
                  value={formData.email_address}
                  onChange={(e) => updateFormData({ email_address: e.target.value })}
                  placeholder="info@school.edu"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => updateFormData({ phone_number: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.address.street}
                onChange={(e) => updateNestedFormData('address', 'street', e.target.value)}
                placeholder="123 School Street"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => updateNestedFormData('address', 'city', e.target.value)}
                  placeholder="City"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => updateNestedFormData('address', 'state', e.target.value)}
                  placeholder="State"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.address.country}
                  onChange={(e) => updateNestedFormData('address', 'country', e.target.value)}
                  placeholder="Country"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.address.postal_code}
                  onChange={(e) => updateNestedFormData('address', 'postal_code', e.target.value)}
                  placeholder="12345"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 'principal':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="principal_name">Principal Name</Label>
              <Input
                id="principal_name"
                value={formData.principal_name}
                onChange={(e) => updateFormData({ principal_name: e.target.value })}
                placeholder="Dr. John Smith"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="principal_email">Principal Email</Label>
                <Input
                  id="principal_email"
                  type="email"
                  value={formData.principal_email}
                  onChange={(e) => updateFormData({ principal_email: e.target.value })}
                  placeholder="principal@school.edu"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="principal_phone">Principal Phone</Label>
                <Input
                  id="principal_phone"
                  value={formData.principal_phone}
                  onChange={(e) => updateFormData({ principal_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <Label>Theme Colors</Label>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primary_color" className="text-sm">Primary</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="color"
                      id="primary_color"
                      value={formData.theme_colors.primary}
                      onChange={(e) => updateNestedFormData('theme_colors', 'primary', e.target.value)}
                      className="w-12 h-8 rounded border border-input"
                    />
                    <Input
                      value={formData.theme_colors.primary}
                      onChange={(e) => updateNestedFormData('theme_colors', 'primary', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color" className="text-sm">Secondary</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="color"
                      id="secondary_color"
                      value={formData.theme_colors.secondary}
                      onChange={(e) => updateNestedFormData('theme_colors', 'secondary', e.target.value)}
                      className="w-12 h-8 rounded border border-input"
                    />
                    <Input
                      value={formData.theme_colors.secondary}
                      onChange={(e) => updateNestedFormData('theme_colors', 'secondary', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accent_color" className="text-sm">Accent</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="color"
                      id="accent_color"
                      value={formData.theme_colors.accent}
                      onChange={(e) => updateNestedFormData('theme_colors', 'accent', e.target.value)}
                      className="w-12 h-8 rounded border border-input"
                    />
                    <Input
                      value={formData.theme_colors.accent}
                      onChange={(e) => updateNestedFormData('theme_colors', 'accent', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => updateFormData({ adminEmail: e.target.value })}
                placeholder="admin@school.edu"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="adminPassword">Admin Password *</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => updateFormData({ adminPassword: e.target.value })}
                  placeholder="Enter secure password"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">School Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium capitalize">{formData.school_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{formData.email_address}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{formData.phone_number || 'Not provided'}</p>
                </div>
              </div>
              {(logoPreview || formData.logo_url) && (
                <div>
                  <span className="text-muted-foreground">Logo:</span>
                  <img
                    src={logoPreview || formData.logo_url}
                    alt="School logo"
                    className="mt-2 max-h-16 max-w-16 object-contain rounded border"
                  />
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Administrator Account</h3>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{formData.adminEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Password:</span>
                  <p className="font-medium">{'*'.repeat(formData.adminPassword.length)}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>{editMode ? 'Edit School Details' : 'Create New School'}</span>
          </DialogTitle>
          <DialogDescription>
            {editMode 
              ? 'Update the school profile information' 
              : 'Set up a comprehensive school profile with all necessary information'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {availableSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = currentStepIndex > index;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                  ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                  ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                  ${!isActive && !isCompleted ? 'border-muted-foreground text-muted-foreground' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                {index < availableSteps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {React.createElement(availableSteps[currentStepIndex].icon, { className: "w-5 h-5" })}
                  <span>{availableSteps[currentStepIndex].title}</span>
                </CardTitle>
                <CardDescription>
                  {availableSteps[currentStepIndex].description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Footer */}
        <DialogFooter className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {availableSteps.length}
          </div>

          {currentStep === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={schoolMutation.isPending || uploadingLogo}
              className="flex items-center space-x-2"
            >
              {schoolMutation.isPending || uploadingLogo ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>{uploadingLogo ? 'Uploading...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>{editMode ? 'Update School' : 'Create School'}</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentStepIndex === availableSteps.length - 1}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </DialogFooter>

        {schoolMutation.isError && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              {schoolMutation.error?.message || `Failed to ${editMode ? 'update' : 'create'} school`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 