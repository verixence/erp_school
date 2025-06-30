'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BookOpen, Calendar, Users, Home, GraduationCap, LogOut, CheckCircle, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-client';

export default function TeacherLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.replace('/not-authorized');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'teacher') {
    return null;
  }

  const sidebarItems = [
    {
      href: '/teacher',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/feed',
      label: 'Community Feed',
      icon: MessageSquare,
    },
    {
      href: '/teacher/attendance',
      label: 'Attendance',
      icon: CheckCircle,
    },
    {
      href: '/teacher/homework',
      label: 'Homework',
      icon: BookOpen,
    },
    {
      href: '/teacher/timetable',
      label: 'Timetable',
      icon: Calendar,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <GraduationCap className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Teacher Portal</h1>
              <p className="text-sm text-gray-600 mt-1">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>
        
        {/* Logout Button */}
        <div className="p-6 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
} 