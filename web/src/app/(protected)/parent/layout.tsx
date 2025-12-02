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
import { BookOpen, Calendar, Bell, Settings, Home, GraduationCap, MessageSquare, FileText, LogOut, Camera, CalendarDays, Mail, Video, Wallet } from 'lucide-react';
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
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch brand data for the school with timeout and error handling
  const { data: brand, isLoading: brandLoading, error: brandError } = useQuery({
    queryKey: ['school-brand', user?.school_id],
    queryFn: () => getBrandForSchool(user!.school_id!),
    enabled: !!user?.school_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Inject brand CSS when brand data is available
  useEffect(() => {
    if (brand) {
      injectBrandCSS(brand);
    }
  }, [brand]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'parent')) {
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
  if (!user || user.role !== 'parent') {
    return null;
  }

  // Don't block rendering if brand fails - use default styling
  // Only show loading for initial brand fetch, not on errors
  if (brandLoading && !brandError && !brand) {
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Brand loading timed out, proceeding with default styling');
    }, 3000);

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading school data...</p>
        </div>
      </div>
    );
  }

  // If brand fails to load, proceed with default styling - don't block the app!
  if (brandError) {
    console.warn('Failed to load school brand, using default styling:', brandError);
  }

  const sidebarItems = [
    { href: '/parent', label: 'Dashboard', icon: Home },
    { href: '/parent/community', label: 'Community', icon: MessageSquare },
    { href: '/parent/online-classes', label: 'Online Classes', icon: Video },
    { href: '/parent/attendance/enhanced', label: 'Attendance', icon: Calendar },
    { href: '/parent/homework', label: 'Homework', icon: BookOpen },
    { href: '/parent/timetable', label: 'Timetable', icon: GraduationCap },
    { href: '/parent/exams', label: 'Exams', icon: FileText },
    { href: '/parent/fees', label: 'Fees', icon: Wallet },
    { href: '/parent/reports', label: 'Report Cards', icon: FileText },
    { href: '/parent/announcements', label: 'Announcements', icon: Bell },
    { href: '/parent/gallery', label: 'Gallery', icon: Camera },
    { href: '/parent/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/parent/feedback', label: 'Feedback', icon: Mail },
    { href: '/parent/settings', label: 'Settings', icon: Settings },
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
              <div className="flex items-center mb-3">
                <img
                  src="/logo.png"
                  alt="CampusHoster Logo"
                  className="w-20 h-20 object-contain mr-3"
                />
                <h2 className="text-xl font-bold text-foreground">Parent Portal</h2>
              </div>
              <p className="text-sm text-muted-foreground">
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
                <LogOut className="w-5 h-5 mr-3" />
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