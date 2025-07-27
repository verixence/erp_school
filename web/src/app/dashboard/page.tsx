'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect based on user role
      switch (user.role) {
        case 'super_admin':
          router.replace('/super-admin');
          break;
        case 'school_admin':
          router.replace('/school-admin');
          break;
        case 'teacher':
          router.replace('/teacher');
          break;
        case 'parent':
          router.replace('/parent');
          break;
        default:
          router.replace('/login');
      }
    } else if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Redirecting you to the right place...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Redirecting</h2>
        <p className="text-gray-600">Taking you to your dashboard...</p>
      </div>
    </div>
  );
} 