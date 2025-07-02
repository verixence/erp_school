'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrandForSchool, injectBrandCSS } from '@erp/common';
import { CampusHeader } from '@/components/CampusHeader';
import { AdminSidebar } from '@/components/AdminSidebar';
import { CampusFooter } from '@/components/CampusFooter';
import { KBarProviderWrapper } from '@/components/kbar-provider';

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode;
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
    if (!isLoading && (!user || user.role !== 'school_admin')) {
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
  if (!user || user.role !== 'school_admin') {
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
          <AdminSidebar 
            brand={brand}
            isOpen={isMobileMenuOpen}
            onClose={handleMobileMenuClose}
          />

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