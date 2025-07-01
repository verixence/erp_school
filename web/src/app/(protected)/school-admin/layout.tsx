'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  UserCheck, 
  Building2,
  LogOut,
  School2,
  ClipboardCheck,
  Calendar,
  BookOpen,
  MessageSquare,
  Megaphone,
  FileText,
  Settings,
  BellRing,
  UserCog,
  Edit
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { NotificationBell } from '@/components/ui/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = [
  { name: 'Dashboard', href: '/school-admin', icon: LayoutDashboard },
  { name: 'Students', href: '/school-admin/students', icon: GraduationCap },
  { name: 'Teachers', href: '/school-admin/teachers', icon: UserCheck },
  { name: 'Parents', href: '/school-admin/parents', icon: Users },
  { name: 'Classes', href: '/school-admin/sections', icon: Building2 },
  { name: 'Attendance', href: '/school-admin/attendance', icon: ClipboardCheck },
  { name: 'Timetable', href: '/school-admin/timetable', icon: Calendar },
  { name: 'Exams', href: '/school-admin/exams', icon: BookOpen },
  { name: 'Reports', href: '/school-admin/reports', icon: FileText },
  { name: 'Community', href: '/school-admin/community', icon: MessageSquare },
  { name: 'Announcements', href: '/school-admin/announcements', icon: BellRing },
];

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'school_admin')) {
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

  if (!user || user.role !== 'school_admin') {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDisplayNameUpdate = () => {
    // This will be handled by a modal/dialog
    router.push('/school-admin?settings=display-name');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="glassmorphism border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/school-admin" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">School Admin</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <ThemeToggle />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatars/admin.png" alt="Admin" />
                      <AvatarFallback>
                        {user?.email?.[0]?.toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.email || 'Admin'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        School Administrator
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDisplayNameUpdate}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Set Display Name</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <Card className="glassmorphism">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h2>
                <nav className="space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-3 transition-all duration-200 group"
                      >
                        <Icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.name}</div>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 