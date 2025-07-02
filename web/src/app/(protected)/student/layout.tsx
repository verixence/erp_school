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
import { BookOpen, Calendar, Bell, Settings, Home, GraduationCap, MessageSquare, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-client';

export default function StudentLayout({ 
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
    if (!isLoading && (!user || user.role !== 'student')) {
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
  if (!user || user.role !== 'student') {
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
    { href: '/student', label: 'Dashboard', icon: Home },
    { href: '/feed', label: 'Community Feed', icon: MessageSquare },
    { href: '/student/attendance', label: 'My Attendance', icon: Calendar },
    { href: '/student/homework', label: 'Homework', icon: BookOpen },
    { href: '/student/timetable', label: 'My Timetable', icon: GraduationCap },
    { href: '/student/exams', label: 'My Exams & Reports', icon: FileText },
    { href: '/student/announcements', label: 'Announcements', icon: Bell },
    { href: '/student/settings', label: 'Settings', icon: Settings },
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
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Student Portal</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {user.email}
              </p>
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
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <GraduationCap className="w-5 h-5 mr-3" />
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