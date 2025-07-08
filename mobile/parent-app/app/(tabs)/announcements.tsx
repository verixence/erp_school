import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Chip, Text, SegmentedButtons } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren, useAnnouncements } from '../../src/hooks/useParentData';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high' | 'normal'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: children } = useChildren(user?.id);
  
  // Get school ID from first child (assuming all children are from same school)
  const schoolId = children?.[0]?.sections?.school_id;

  const { data: announcements, isLoading, refetch } = useAnnouncements(schoolId);

  // Filter announcements based on priority
  const filteredAnnouncements = React.useMemo(() => {
    if (!announcements) return [];

    if (filter === 'all') {
      return announcements;
    }

    return announcements.filter(announcement => announcement.priority === filter);
  }, [announcements, filter]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'normal':
        return '#2563eb';
      case 'low':
        return '#16a34a';
      default:
        return '#64748b';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'check-circle';
      default:
        return 'notifications';
    }
  };

  const formatAnnouncementDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  const getTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  // Calculate stats
  const totalAnnouncements = announcements?.length || 0;
  const urgentAnnouncements = announcements?.filter(a => a.priority === 'urgent').length || 0;
  const highAnnouncements = announcements?.filter(a => a.priority === 'high').length || 0;
  const normalAnnouncements = announcements?.filter(a => a.priority === 'normal').length || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Announcement Summary</Title>
          <View style={styles.statsGrid}>
            <Card style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <Card.Content style={styles.statContent}>
                <MaterialIcons name="campaign" size={24} color="#3b82f6" />
                <Text style={styles.statNumber}>{totalAnnouncements}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
              <Card.Content style={styles.statContent}>
                <MaterialIcons name="error" size={24} color="#dc2626" />
                <Text style={styles.statNumber}>{urgentAnnouncements}</Text>
                <Text style={styles.statLabel}>Urgent</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
              <Card.Content style={styles.statContent}>
                <MaterialIcons name="warning" size={24} color="#ea580c" />
                <Text style={styles.statNumber}>{highAnnouncements}</Text>
                <Text style={styles.statLabel}>High</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
              <Card.Content style={styles.statContent}>
                <MaterialIcons name="info" size={24} color="#2563eb" />
                <Text style={styles.statNumber}>{normalAnnouncements}</Text>
                <Text style={styles.statLabel}>Normal</Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Filter Options */}
        <Card style={styles.filterCard}>
          <Card.Content>
            <Text style={styles.filterLabel}>Filter by Priority</Text>
            <SegmentedButtons
              value={filter}
              onValueChange={(value) => setFilter(value as any)}
              buttons={[
                { value: 'all', label: 'All' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'High' },
                { value: 'normal', label: 'Normal' },
              ]}
            />
          </Card.Content>
        </Card>

        {/* Announcements List */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>
            {filter === 'all' ? 'All Announcements' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Priority`}
          </Title>
          
          {isLoading ? (
            <Card style={styles.loadingCard}>
              <Card.Content style={styles.loadingContent}>
                <MaterialIcons name="campaign" size={40} color="#94a3b8" />
                <Text style={styles.loadingText}>Loading announcements...</Text>
              </Card.Content>
            </Card>
          ) : filteredAnnouncements.length > 0 ? (
            <View style={styles.announcementsContainer}>
              {filteredAnnouncements.map((announcement) => (
                <Card key={announcement.id} style={[
                  styles.announcementCard,
                  announcement.priority === 'urgent' && styles.urgentCard
                ]}>
                  <Card.Content>
                    <View style={styles.announcementHeader}>
                      <View style={styles.titleContainer}>
                        <MaterialIcons 
                          name={getPriorityIcon(announcement.priority) as any} 
                          size={20} 
                          color={getPriorityColor(announcement.priority)}
                        />
                        <Title style={styles.announcementTitle}>{announcement.title}</Title>
                      </View>
                      <Chip
                        style={[
                          styles.priorityChip,
                          { backgroundColor: `${getPriorityColor(announcement.priority)}20` }
                        ]}
                        textStyle={{ 
                          color: getPriorityColor(announcement.priority), 
                          fontWeight: 'bold',
                          textTransform: 'capitalize'
                        }}
                      >
                        {announcement.priority}
                      </Chip>
                    </View>

                    <Paragraph style={styles.announcementContent}>
                      {announcement.content}
                    </Paragraph>

                    <View style={styles.announcementFooter}>
                      <View style={styles.dateContainer}>
                        <MaterialIcons name="event" size={16} color="#64748b" />
                        <Text style={styles.dateText}>
                          {formatAnnouncementDate(announcement.published_at)}
                        </Text>
                      </View>
                      <View style={styles.timeAgoContainer}>
                        <MaterialIcons name="access-time" size={16} color="#64748b" />
                        <Text style={styles.timeAgoText}>
                          {getTimeAgo(announcement.published_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaContainer}>
                      <View style={styles.audienceContainer}>
                        <MaterialIcons name="group" size={16} color="#64748b" />
                        <Text style={styles.audienceText}>
                          Target: {announcement.target_audience}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialIcons name="campaign" size={60} color="#94a3b8" />
                <Title style={styles.emptyTitle}>
                  {filter === 'all' ? 'No Announcements' : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Priority Announcements`}
                </Title>
                <Paragraph style={styles.emptyText}>
                  {filter === 'all' 
                    ? 'No announcements have been posted yet.'
                    : `No ${filter} priority announcements found.`
                  }
                </Paragraph>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* No School State */}
        {!schoolId && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialIcons name="school" size={60} color="#94a3b8" />
              <Title style={styles.emptyTitle}>No School Information</Title>
              <Paragraph style={styles.emptyText}>
                Unable to load announcements. Please ensure your children are properly enrolled.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  filterCard: {
    elevation: 2,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 12,
  },
  announcementsContainer: {
    gap: 12,
  },
  announcementCard: {
    elevation: 2,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  priorityChip: {
    height: 28,
  },
  announcementContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  timeAgoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeAgoText: {
    fontSize: 12,
    color: '#64748b',
  },
  metaContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  audienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audienceText: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  loadingCard: {
    elevation: 1,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  emptyCard: {
    elevation: 1,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
  },
}); 