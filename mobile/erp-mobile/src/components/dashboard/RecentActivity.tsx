import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CheckCircle, BookOpen, Award, MessageSquare, Calendar } from 'lucide-react-native';
import { schoolTheme } from '../../theme/schoolTheme';

interface Activity {
  id: string;
  type: 'attendance' | 'homework' | 'exam' | 'message' | 'event';
  title: string;
  description: string;
  time: string;
}

interface RecentActivityProps {
  activities: Activity[];
  theme?: typeof schoolTheme;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, theme = schoolTheme }) => {
  if (activities.length === 0) return null;

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'attendance':
        return { Icon: CheckCircle, color: theme.colors.success.main };
      case 'homework':
        return { Icon: BookOpen, color: theme.colors.warning.main };
      case 'exam':
        return { Icon: Award, color: theme.colors.parent.main };
      case 'message':
        return { Icon: MessageSquare, color: theme.colors.info.main };
      case 'event':
        return { Icon: Calendar, color: theme.colors.info.main };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.bold }]}>
        Recent Activity
      </Text>
      <View style={styles.timeline}>
        {activities.map((activity, index) => {
          const { Icon, color } = getActivityIcon(activity.type);
          const isLast = index === activities.length - 1;

          return (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.timelineColumn}>
                <View style={[styles.iconContainer, { backgroundColor: color + '15', borderColor: color }]}>
                  <Icon size={16} color={color} />
                </View>
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.colors.border.light }]} />}
              </View>
              <View style={[styles.activityContent, !isLast && styles.activityContentWithPadding]}>
                <View style={styles.activityHeader}>
                  <Text
                    style={[
                      styles.activityTitle,
                      { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.semibold },
                    ]}
                  >
                    {activity.title}
                  </Text>
                  <Text
                    style={[
                      styles.activityTime,
                      { color: theme.colors.text.tertiary, fontFamily: theme.typography.fonts.regular },
                    ]}
                  >
                    {activity.time}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.activityDescription,
                    { color: theme.colors.text.secondary, fontFamily: theme.typography.fonts.regular },
                  ]}
                >
                  {activity.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 16,
  },
  timeline: {
    backgroundColor: 'transparent',
  },
  activityItem: {
    flexDirection: 'row',
  },
  timelineColumn: {
    width: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'white',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
    paddingLeft: 12,
  },
  activityContentWithPadding: {
    paddingBottom: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 15,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
