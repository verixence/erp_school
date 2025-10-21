import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, Inbox, UserX, BookOpen, Calendar } from 'lucide-react-native';

interface EmptyStateProps {
  icon?: 'alert' | 'inbox' | 'user' | 'book' | 'calendar';
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

const iconMap = {
  alert: AlertCircle,
  inbox: Inbox,
  user: UserX,
  book: BookOpen,
  calendar: Calendar,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  message,
  actionText,
  onAction
}) => {
  const IconComponent = iconMap[icon];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconComponent size={64} color="#9ca3af" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionText && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
