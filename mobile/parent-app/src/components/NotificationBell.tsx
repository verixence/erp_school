import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/colors';
import { Card, CardContent } from './Card';
import { Heading3, Body, Caption } from './Typography';

interface Notification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  type: string;
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('parent_notifications')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('parent_notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('parent_notifications')
        .update({ read: true })
        .eq('parent_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'campaign';
      case 'homework':
        return 'assignment';
      case 'exam':
        return 'school';
      case 'attendance':
        return 'event-available';
      default:
        return 'notifications';
    }
  };

  // Get notification color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return theme.colors.info[500];
      case 'homework':
        return theme.colors.warning[500];
      case 'exam':
        return theme.colors.danger[500];
      case 'attendance':
        return theme.colors.success[500];
      default:
        return theme.colors.primary[500];
    }
  };

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('parent_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parent_notifications',
          filter: `parent_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  return (
    <>
      <TouchableOpacity
        style={styles.bellContainer}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialIcons 
          name="notifications" 
          size={24} 
          color={theme.colors.text.primary} 
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Heading3>Notifications</Heading3>
            <View style={styles.headerButtons}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={markAllAsRead}
                >
                  <Caption style={styles.markAllText}>Mark all read</Caption>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.notificationsList}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons 
                  name="notifications-none" 
                  size={64} 
                  color={theme.colors.text.muted} 
                />
                <Heading3 variant="secondary" style={styles.emptyTitle}>
                  No notifications
                </Heading3>
                <Body variant="muted" style={styles.emptyText}>
                  You're all caught up! New notifications will appear here.
                </Body>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => !notification.read && markAsRead(notification.id)}
                >
                  <Card 
                    variant="default" 
                    style={[
                      styles.notificationCard,
                      !notification.read && styles.unreadNotification
                    ]}
                  >
                    <CardContent style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <View style={styles.notificationIcon}>
                          <MaterialIcons 
                            name={getNotificationIcon(notification.type) as any}
                            size={20}
                            color={getNotificationColor(notification.type)}
                          />
                        </View>
                        <View style={styles.notificationInfo}>
                          <Body weight="medium" style={styles.notificationTitle}>
                            {notification.title}
                          </Body>
                          <Caption variant="secondary" style={styles.notificationTime}>
                            {formatTime(notification.created_at)}
                          </Caption>
                        </View>
                        {!notification.read && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                      <Body variant="secondary" style={styles.notificationBody}>
                        {notification.body}
                      </Body>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: theme.spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: theme.colors.danger[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  markAllButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  markAllText: {
    color: theme.colors.primary[500],
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  notificationsList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  notificationCard: {
    marginBottom: theme.spacing.sm,
    borderColor: theme.colors.border,
  },
  unreadNotification: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  notificationContent: {
    gap: theme.spacing.sm,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    marginBottom: theme.spacing.xs,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[500],
  },
  notificationBody: {
    marginLeft: 44, // Account for icon width + gap
  },
}); 