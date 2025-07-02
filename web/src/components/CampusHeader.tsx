'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useKBar } from 'kbar';
import { 
  Search, 
  Plus, 
  Users, 
  GraduationCap, 
  UserCheck, 
  Calendar,
  FileText,
  Megaphone,
  Menu,
  LogOut,
  Settings,
  User,
  Bell
} from 'lucide-react';
import type { Brand } from '@erp/common';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/ui/notification-bell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CampusHeaderProps {
  brand: Brand;
  onMenuToggle: () => void;
}

export function CampusHeader({ brand, onMenuToggle }: CampusHeaderProps) {
  const { user, signOut } = useAuth();
  const { query } = useKBar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const quickCreateActions = [
    { name: 'Add Student', href: '/school-admin/students?action=create', icon: GraduationCap },
    { name: 'Add Teacher', href: '/school-admin/teachers?action=create', icon: UserCheck },
    { name: 'Create Class', href: '/school-admin/sections?action=create', icon: Users },
    { name: 'Schedule Exam', href: '/school-admin/exams?action=create', icon: Calendar },
    { name: 'Create Report', href: '/school-admin/reports?action=create', icon: FileText },
    { name: 'New Announcement', href: '/school-admin/announcements?action=create', icon: Megaphone },
  ];

  const handleSearchClick = () => {
    query.toggle();
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 w-full h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="h-full">
        {/* Gradient bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        
        <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden focus-primary"
              onClick={onMenuToggle}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* CampusHoster badge */}
            <Link href="/school-admin">
              <Badge 
                variant="secondary" 
                className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors focus-primary"
              >
                CampusHoster
              </Badge>
            </Link>

            {/* School info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {brand.logo ? (
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : (
                  <span className="text-primary font-semibold text-sm">
                    {brand.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-semibold text-sm text-foreground">
                  {brand.name}
                </h1>
                <p className="text-xs text-muted-foreground hidden lg:block">
                  School Management
                </p>
              </div>
            </div>
          </div>

          {/* Center section - Search */}
          <div className="flex-1 max-w-lg mx-4">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground hover:text-foreground focus-primary"
              onClick={handleSearchClick}
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Search for anything...</span>
              <span className="sm:hidden">Search...</span>
              <kbd className="pointer-events-none ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2">
            {/* Quick create dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="focus-primary">
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {quickCreateActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem key={action.name} asChild>
                      <Link href={action.href} className="flex items-center focus-primary">
                        <Icon className="h-4 w-4 mr-2" />
                        {action.name}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification bell */}
            <NotificationBell />

            {/* Theme toggle */}
            <ThemeToggle />

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full focus-primary">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url} alt={user?.first_name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user?.first_name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/school-admin/settings" className="flex items-center focus-primary">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/school-admin/settings" className="flex items-center focus-primary">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="focus-primary">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.header>
  );
} 