'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  type Notification
} from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [mounted, setMounted] = useState(false);

  // Only run after component mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything during SSR
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className={`relative ${className}`}>
        <Bell className="w-5 h-5" />
      </Button>
    );
  }

  return <NotificationBellInternal className={className} />;
}

function NotificationBellInternal({ className = '' }: NotificationBellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: notifications = [] } = useNotifications(user?.id || '');
  const { data: unreadCount = 0 } = useUnreadNotificationsCount(user?.id || '');
  
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }
    
    // Navigate to related content based on notification type and user role
    if (notification.related_id) {
      let navigationPath = '';
      
      switch (notification.type) {
        case 'announcement':
          // Navigate to announcements page based on user role
          switch (user?.role) {
            case 'school_admin':
              navigationPath = '/school-admin/announcements';
              break;
            case 'teacher':
              navigationPath = '/teacher/announcements';
              break;
            case 'parent':
              navigationPath = '/parent/announcements';
              break;
            case 'student':
              navigationPath = '/student/announcements';
              break;
            default:
              navigationPath = '/feed';
          }
          break;
          
        case 'post':
          // Navigate to community feed for all users
          navigationPath = '/feed';
          break;
          
        case 'exam':
          // Navigate to exams page based on user role
          switch (user?.role) {
            case 'school_admin':
              navigationPath = '/school-admin/exams';
              break;
            case 'teacher':
              navigationPath = '/teacher/exams';
              break;
            case 'parent':
              navigationPath = '/parent/exams';
              break;
            case 'student':
              navigationPath = '/student/exams';
              break;
            default:
              navigationPath = '/feed';
          }
          break;
          
        case 'homework':
          // Navigate to homework page based on user role
          switch (user?.role) {
            case 'teacher':
              navigationPath = '/teacher/homework';
              break;
            case 'parent':
              navigationPath = '/parent/homework';
              break;
            case 'student':
              navigationPath = '/student/homework';
              break;
            default:
              navigationPath = '/feed';
          }
          break;
          
        default:
          navigationPath = '/feed';
      }
      
      // Close the popover and navigate
      setIsOpen(false);
      router.push(navigationPath);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllAsRead.mutateAsync(user.id);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification.mutateAsync(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'post':
        return '💬';
      case 'exam':
        return '📝';
      case 'homework':
        return '📚';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'border-l-blue-500';
      case 'post':
        return 'border-l-green-500';
      case 'exam':
        return 'border-l-red-500';
      case 'homework':
        return 'border-l-orange-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold">
              Notifications
            </CardTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      border-l-4 p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors
                      ${getNotificationColor(notification.type)}
                      ${!notification.is_read ? 'bg-blue-50' : ''}
                    `}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <p className={`
                            text-sm font-medium truncate
                            ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}
                          `}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="w-6 h-6 p-0 ml-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-600"
                  onClick={() => setIsOpen(false)}
                >
                  View all notifications
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
} 