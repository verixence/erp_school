'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { Brand } from '@erp/common';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { 
  LayoutDashboard, 
  Building2,
  GraduationCap, 
  UserCheck, 
  Users, 
  ClipboardCheck,
  Calendar,
  BookOpen,
  Award,
  FileText,
  MessageSquare,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Shield,
  School,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/school-admin', icon: LayoutDashboard, description: 'Overview & Analytics' },
  { name: 'Classes', href: '/school-admin/sections', icon: Building2, description: 'Manage Classes & Sections' },
  { name: 'Students', href: '/school-admin/students', icon: GraduationCap, description: 'Student Management' },
  { name: 'Teachers', href: '/school-admin/teachers', icon: UserCheck, description: 'Teacher Management' },
  { name: 'Parents', href: '/school-admin/parents', icon: Users, description: 'Parent Management' },
  { name: 'Attendance', href: '/school-admin/attendance', icon: ClipboardCheck, description: 'Attendance Tracking' },
  { name: 'Timetable', href: '/school-admin/timetable', icon: Calendar, description: 'Schedule Management' },
  { name: 'Exams', href: '/school-admin/exams', icon: BookOpen, description: 'Examination System' },
  { name: 'Marks', href: '/school-admin/marks', icon: Award, description: 'Marks & Assessment' },
  { name: 'Reports', href: '/school-admin/reports', icon: FileText, description: 'Analytics & Reports' },
  { name: 'Report Templates', href: '/school-admin/report-templates', icon: FileText, description: 'Customizable Report Cards' },
  { name: 'Community', href: '/school-admin/community', icon: MessageSquare, description: 'School Community' },
  { name: 'Announcements', href: '/school-admin/announcements', icon: Megaphone, description: 'School Announcements' },
];

const superAdminNavigation = [
  { name: 'Overview', href: '/super-admin', icon: Shield, description: 'System Overview' },
  { name: 'Schools', href: '/super-admin/schools', icon: School, description: 'Manage Schools' },
  { name: 'Template Catalogue', href: '/super-admin/template-catalogue', icon: Palette, description: 'Manage Public Templates' },
  { name: 'Audit Logs', href: '/super-admin/audit-logs', icon: FileText, description: 'System Audit Logs' },
];

interface AdminSidebarProps {
  brand: Brand;
  isOpen: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ brand, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const renderNavItem = (item: any, isActive: boolean) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "sidebar-nav-item group",
                isActive && "active"
              )}
              title={isCollapsed ? `${item.name} - ${item.description}` : undefined}
            >
              <Icon className={cn(
                "h-5 w-5 transition-colors flex-shrink-0",
                isActive ? "text-brand-primary" : "text-muted-foreground group-hover:text-brand-primary"
              )} />
              
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="ml-3 flex-1 min-w-0"
                >
                  <div className="text-sm font-medium">{item.name}</div>
                  {!isActive && (
                    <div className="text-xs text-muted-foreground group-hover:text-brand-primary/70 truncate">
                      {item.description}
                    </div>
                  )}
                </motion.div>
              )}

              {isActive && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary rounded-r"
                />
              )}
            </Link>
          );
  };

  const sidebarContent = (
    <div className={cn(
      "h-full flex flex-col card-flat border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-brand-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Navigation</span>
          </motion.div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="hidden lg:flex h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {/* School Admin Navigation */}
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/school-admin' && pathname.startsWith(item.href));
          return renderNavItem(item, isActive);
        })}

        {/* Super Admin Section */}
        {user?.role === 'super_admin' && (
          <>
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              {!isCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Super Admin
                </div>
              )}
              {superAdminNavigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/super-admin' && pathname.startsWith(item.href));
                return renderNavItem(item, isActive);
              })}
            </div>
          </>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground space-y-1"
          >
            <div className="font-medium text-brand-primary truncate">{brand.name}</div>
            <div className="truncate" title={brand.address}>{brand.address}</div>
          </motion.div>
        )}
      </div>
    </div>
  );

  // Mobile overlay
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return (
      <>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={onClose}
            />
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-16 bottom-0 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className="hidden lg:block">
      {sidebarContent}
    </div>
  );
} 