'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BookOpen, Calendar, Bell, Settings, Home, GraduationCap, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-client';

export default function ParentLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'parent')) {
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

  if (!user || user.role !== 'parent') {
    return null;
  }

  const sidebarItems = [
    { href: '/parent', label: 'Dashboard', icon: Home },
    { href: '/parent/attendance', label: 'Attendance', icon: Calendar },
    { href: '/parent/homework', label: 'Homework', icon: BookOpen },
    { href: '/parent/timetable', label: 'Timetable', icon: GraduationCap },
    { href: '/parent/announcements', label: 'Announcements', icon: Bell },
    { href: '/parent/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Parent Portal</h2>
          <p className="text-sm text-gray-600 mt-1">
            {user.email}
          </p>
        </div>
        
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
        <div className="p-6 border-t">
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
} 