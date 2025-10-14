'use client';

import { useState, useEffect } from 'react';
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
  UserPlus,
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
  Palette,
  Camera,
  CalendarDays,
  Mail,
  Star,
  Target,
  CheckCircle,
  X,
  Image,
  Heart,
  Settings,
  UserX,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AdminSidebarProps {
  brand: Brand;
  isOpen: boolean;
  onClose?: () => void;
}

interface SidebarLinkProps {
  href: string;
  icon: any;
  children: React.ReactNode;
  isActive: boolean;
}

const SidebarLink = ({ href, icon: Icon, children, isActive }: SidebarLinkProps) => {
  return (
    <Link
      href={href}
      className={cn("sidebar-link", isActive && "active")}
    >
      <Icon className={cn("sidebar-link-icon", isActive && "active")} />
      {children}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="sidebar-active-indicator"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
};

export function AdminSidebar({ brand, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const sidebarContent = (
    <>
      {/* Close button for mobile */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground lg:hidden"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 pt-12 lg:pt-0">
        <SidebarLink
          href="/school-admin"
          icon={LayoutDashboard}
          isActive={pathname === "/school-admin"}
        >
          Dashboard
        </SidebarLink>

        <SidebarLink
          href="/school-admin/sections"
          icon={Building2}
          isActive={pathname.startsWith("/school-admin/sections")}
        >
          Classes
        </SidebarLink>

        <SidebarLink
          href="/school-admin/students"
          icon={GraduationCap}
          isActive={pathname.startsWith("/school-admin/students")}
        >
          Students
        </SidebarLink>

        <SidebarLink
          href="/school-admin/teachers"
          icon={UserCheck}
          isActive={pathname.startsWith("/school-admin/teachers")}
        >
          Teachers
        </SidebarLink>

        <SidebarLink
          href="/school-admin/parents"
          icon={Users}
          isActive={pathname.startsWith("/school-admin/parents")}
        >
          Parents
        </SidebarLink>

        <SidebarLink
          href="/school-admin/admission-enquiry"
          icon={UserPlus}
          isActive={pathname.startsWith("/school-admin/admission-enquiry")}
        >
          Admission Enquiry
        </SidebarLink>

        <SidebarLink
          href="/school-admin/leave-requests"
          icon={UserX}
          isActive={pathname.startsWith("/school-admin/leave-requests")}
        >
          Leave Requests
        </SidebarLink>

        <SidebarLink
          href="/school-admin/attendance"
          icon={CheckCircle}
          isActive={pathname.startsWith("/school-admin/attendance")}
        >
          Attendance
        </SidebarLink>

        <SidebarLink
          href="/school-admin/timetable"
          icon={CalendarDays}
          isActive={pathname.startsWith("/school-admin/timetable")}
        >
          Timetable
        </SidebarLink>

        <SidebarLink
          href="/school-admin/exams"
          icon={BookOpen}
          isActive={pathname.startsWith("/school-admin/exams")}
        >
          Exams
        </SidebarLink>

        <SidebarLink
          href="/school-admin/marks"
          icon={Award}
          isActive={pathname.startsWith("/school-admin/marks")}
        >
          Marks
        </SidebarLink>

        <SidebarLink
          href="/school-admin/reports"
          icon={FileText}
          isActive={pathname.startsWith("/school-admin/reports") || pathname.startsWith("/school-admin/cbse-reports") || pathname.startsWith("/school-admin/ssc-reports") || pathname.startsWith("/school-admin/state-board-reports")}
        >
          Reports
        </SidebarLink>

        <SidebarLink
          href="/school-admin/fees"
          icon={DollarSign}
          isActive={pathname.startsWith("/school-admin/fees")}
        >
          Finance & Accounting
        </SidebarLink>

        <SidebarLink
          href="/school-admin/promotions"
          icon={TrendingUp}
          isActive={pathname.startsWith("/school-admin/promotions")}
        >
          Student Promotions
        </SidebarLink>

        <SidebarLink
          href="/school-admin/announcements"
          icon={Megaphone}
          isActive={pathname.startsWith("/school-admin/announcements")}
        >
          Announcements
        </SidebarLink>

        <SidebarLink
          href="/school-admin/gallery"
          icon={Image}
          isActive={pathname.startsWith("/school-admin/gallery")}
        >
          Gallery
        </SidebarLink>

        <SidebarLink
          href="/school-admin/community"
          icon={Heart}
          isActive={pathname.startsWith("/school-admin/community")}
        >
          Community
        </SidebarLink>

        <SidebarLink
          href="/school-admin/feedback"
          icon={MessageSquare}
          isActive={pathname.startsWith("/school-admin/feedback")}
        >
          Feedback
        </SidebarLink>

        <SidebarLink
          href="/school-admin/settings"
          icon={Settings}
          isActive={pathname.startsWith("/school-admin/settings")}
        >
          Settings
        </SidebarLink>
      </nav>

      {/* User section */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              School Admin
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex sidebar">{sidebarContent}</aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {(isOpen || !isMobile) && (
          <motion.aside
            initial={isMobile ? { x: -300 } : { x: 0 }}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -300 } : { x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden sidebar"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
} 