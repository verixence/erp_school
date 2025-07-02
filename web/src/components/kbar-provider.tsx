'use client';

import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
  ActionId,
  ActionImpl,
} from 'kbar';
import { useRouter } from 'next/navigation';
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
  FileText,
  MessageSquare,
  Megaphone,
  Plus,
  Settings,
} from 'lucide-react';

interface KBarProviderWrapperProps {
  children: React.ReactNode;
}

export function KBarProviderWrapper({ children }: KBarProviderWrapperProps) {
  const router = useRouter();
  const { user } = useAuth();

  const actions = [
    // Navigation Actions
    {
      id: 'dashboard',
      name: 'Dashboard',
      shortcut: ['d'],
      keywords: 'dashboard home overview',
      section: 'Navigation',
      perform: () => router.push('/school-admin'),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'classes',
      name: 'Classes',
      shortcut: ['c'],
      keywords: 'classes sections rooms',
      section: 'Navigation',
      perform: () => router.push('/school-admin/sections'),
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'students',
      name: 'Students',
      shortcut: ['s'],
      keywords: 'students pupils learners',
      section: 'Navigation',
      perform: () => router.push('/school-admin/students'),
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: 'teachers',
      name: 'Teachers',
      shortcut: ['t'],
      keywords: 'teachers faculty staff',
      section: 'Navigation',
      perform: () => router.push('/school-admin/teachers'),
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      id: 'parents',
      name: 'Parents',
      shortcut: ['p'],
      keywords: 'parents guardians families',
      section: 'Navigation',
      perform: () => router.push('/school-admin/parents'),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'attendance',
      name: 'Attendance',
      shortcut: ['a'],
      keywords: 'attendance presence absent',
      section: 'Navigation',
      perform: () => router.push('/school-admin/attendance'),
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    {
      id: 'timetable',
      name: 'Timetable',
      shortcut: ['m'],
      keywords: 'timetable schedule classes timing',
      section: 'Navigation',
      perform: () => router.push('/school-admin/timetable'),
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'exams',
      name: 'Exams',
      shortcut: ['e'],
      keywords: 'exams tests assessments',
      section: 'Navigation',
      perform: () => router.push('/school-admin/exams'),
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'reports',
      name: 'Reports',
      shortcut: ['r'],
      keywords: 'reports analytics data',
      section: 'Navigation',
      perform: () => router.push('/school-admin/reports'),
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'community',
      name: 'Community',
      shortcut: ['o'],
      keywords: 'community posts social feed',
      section: 'Navigation',
      perform: () => router.push('/school-admin/community'),
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'announcements',
      name: 'Announcements',
      shortcut: ['n'],
      keywords: 'announcements notices alerts',
      section: 'Navigation',
      perform: () => router.push('/school-admin/announcements'),
      icon: <Megaphone className="w-4 h-4" />,
    },

    // Quick Actions
    {
      id: 'create_student',
      name: 'Add New Student',
      shortcut: ['n', 's'],
      keywords: 'new student add enroll',
      section: 'Quick Actions',
      perform: () => router.push('/school-admin/students?action=create'),
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: 'create_teacher',
      name: 'Add New Teacher',
      shortcut: ['n', 't'],
      keywords: 'new teacher add faculty staff',
      section: 'Quick Actions',
      perform: () => router.push('/school-admin/teachers?action=create'),
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: 'create_class',
      name: 'Create New Class',
      shortcut: ['n', 'c'],
      keywords: 'new class section room',
      section: 'Quick Actions',
      perform: () => router.push('/school-admin/sections?action=create'),
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: 'schedule_exam',
      name: 'Schedule Exam',
      shortcut: ['n', 'e'],
      keywords: 'schedule exam test assessment',
      section: 'Quick Actions',
      perform: () => router.push('/school-admin/exams?action=create'),
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: 'create_announcement',
      name: 'New Announcement',
      shortcut: ['n', 'a'],
      keywords: 'new announcement notice alert',
      section: 'Quick Actions',
      perform: () => router.push('/school-admin/announcements?action=create'),
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: 'create_post',
      name: 'New Community Post',
      shortcut: ['n', 'p'],
      keywords: 'new post community social',
      section: 'Quick Actions',
      perform: () => router.push('/school-admin/community?action=create'),
      icon: <Plus className="w-4 h-4" />,
    },
  ];

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <KBarAnimator className="relative mx-auto max-w-2xl mt-16 overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <KBarSearch 
                className="w-full border-0 bg-transparent text-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0" 
                placeholder="Search for actions..."
              />
            </div>
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
}

function RenderResults() {
  const { results, rootActionId } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800">
            {item}
          </div>
        ) : (
          <div
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              {item.subtitle && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {item.subtitle}
                </div>
              )}
            </div>
            {item.shortcut?.length ? (
              <div className="flex gap-1">
                {item.shortcut.map((sc) => (
                  <kbd
                    key={sc}
                    className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
                  >
                    {sc}
                  </kbd>
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    />
  );
} 