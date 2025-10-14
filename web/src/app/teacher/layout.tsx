'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrandForSchool, injectBrandCSS } from '@erp/common';
import { CampusHeader } from '@/components/CampusHeader';
import { CampusFooter } from '@/components/CampusFooter';
import { KBarProviderWrapper } from '@/components/kbar-provider';
import { BookOpen, Calendar, Users, Home, GraduationCap, FileText, MessageSquare, CheckCircle, Award, LogOut, Camera, CalendarDays, Mail, Star, Video, UserX, Receipt } from 'lucide-react';
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
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch brand data for the school
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['school-brand', user?.school_id],
    queryFn: () => getBrandForSchool(user!.school_id!),
    enabled: !!user?.school_id,
  });

  // Inject brand CSS when brand data is available
  useEffect(() => {
    if (brand) {
      injectBrandCSS(brand);
    }
  }, [brand]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.replace('/not-authorized');
    }
  }, [user, isLoading, router]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  // Show loading state while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authorized
  if (!user || user.role !== 'teacher') {
    return null;
  }

  // Show loading state while brand is loading
  if (brandLoading || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading school data...</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    {
      href: '/teacher',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/teacher/community',
      label: 'Community',
      icon: MessageSquare,
    },
    {
      href: '/teacher/online-classes',
      label: 'Online Classes',
      icon: Video,
    },
    {
      href: '/teacher/announcements',
      label: 'Announcements',
      icon: FileText,
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
      href: '/teacher/exams',
      label: 'Exams',
      icon: Award,
    },
    {
      href: '/teacher/co-scholastic',
      label: 'Co-Scholastic',
      icon: Star,
    },
    {
      href: '/teacher/timetable',
      label: 'Timetable',
      icon: Calendar,
    },
    {
      href: '/teacher/gallery',
      label: 'Gallery',
      icon: Camera,
    },
    {
      href: '/teacher/calendar',
      label: 'Academic Calendar',
      icon: CalendarDays,
    },
    {
      href: '/teacher/leave-requests',
      label: 'Leave Requests',
      icon: UserX,
    },
    {
      href: '/teacher/expense-claims',
      label: 'Expense Claims',
      icon: Receipt,
    },
  ];

  return (
    <KBarProviderWrapper>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <CampusHeader 
          brand={brand} 
          onMenuToggle={handleMobileMenuToggle}
        />

        {/* Main Layout */}
        <div className="flex flex-1">
          {/* Sidebar */}
          <div className={`
            w-64 bg-card shadow-sm border-r border-border flex flex-col
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            fixed lg:relative z-30 h-full transition-transform duration-300 ease-in-out
          `}>
            {/* Sidebar Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center">
                <img 
                  src="/logo.png" 
                  alt="CampusHoster Logo" 
                  className="w-12 h-12 object-contain mr-3"
                />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Teacher Portal</h1>
                  <p className="text-sm text-muted-foreground mt-1">
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
                  onClick={handleMobileMenuClose}
                  className={`
                    flex items-center px-6 py-3 transition-colors
                    ${pathname === item.href 
                      ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {/* Logout Button */}
            <div className="p-6 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Overlay for mobile */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={handleMobileMenuClose}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  key={pathname}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Footer */}
        <CampusFooter brand={brand} />
      </div>
    </KBarProviderWrapper>
  );
} 