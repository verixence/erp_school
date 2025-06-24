'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, School2, Save, Shield, AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  domain: string | null;
  enabled_features: Record<string, boolean>;
  status: string;
  created_at: string;
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

export default function SchoolFeatureTogglePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const schoolId = params.id as string;

  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: school, isLoading, error } = useQuery({
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

  if (user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need super admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="w-12 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading School</h2>
          <p className="text-gray-600 mb-4">Unable to load school information.</p>
          <Link
            href="/super-admin"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!school) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/super-admin"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* School Info */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <School2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
              <p className="text-gray-600">{school.domain || 'No domain configured'}</p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                school.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {school.status}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">School ID:</span>
              <p className="font-mono text-gray-900">{school.id}</p>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <p className="text-gray-900">{new Date(school.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Features Active:</span>
              <p className="text-gray-900">
                {Object.values(features).filter(Boolean).length} / {Object.keys(features).length}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Feature Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enable or disable features for this school. Changes will be applied immediately.
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(featureLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{label}</h3>
                      {key === 'core' && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
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
                    <button
                      onClick={handleReset}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={updateFeaturesMutation.isPending}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {updateFeaturesMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {updateFeaturesMutation.isError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
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
          </div>
        </div>
      </div>
    </div>
  );
}