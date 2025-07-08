import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Custom components
import { Card, CardContent } from '../../src/components/Card';
import { Heading2, Heading3, Body, BodySmall, Caption } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { theme } from '../../src/theme/colors';

// Hooks
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren } from '../../src/hooks/useParentData';

// API
import { supabase } from '../../src/lib/supabase';

interface HomeworkAssignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'late';
  teacher_name: string;
  submission_date?: string;
  student_id: string;
}

export default function HomeworkScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [homework, setHomework] = useState<HomeworkAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);

  // Fetch homework assignments
  const fetchHomework = useCallback(async () => {
    if (!children || children.length === 0) return;

    try {
      setIsLoading(true);
      const studentIds = children.map(child => child.id);
      
      const { data, error } = await supabase
        .from('homework_assignments')
        .select(`
          id,
          title,
          subject,
          description,
          due_date,
          status,
          teacher_name,
          submission_date,
          student_id
        `)
        .in('student_id', studentIds)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching homework:', error);
        return;
      }

      setHomework(data || []);
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setIsLoading(false);
    }
  }, [children]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHomework();
    setRefreshing(false);
  }, [fetchHomework]);

  // Fetch homework when children data is available
  React.useEffect(() => {
    if (children && !childrenLoading) {
      fetchHomework();
    }
  }, [children, childrenLoading, fetchHomework]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning[500];
      case 'submitted':
        return theme.colors.success[500];
      case 'late':
        return theme.colors.danger[500];
      default:
        return theme.colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'schedule';
      case 'submitted':
        return 'check-circle';
      case 'late':
        return 'error';
      default:
        return 'help';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'submitted':
        return 'Submitted';
      case 'late':
        return 'Late';
      default:
        return 'Unknown';
    }
  };

  // Calculate stats
  const stats = {
    pending: homework.filter(h => h.status === 'pending').length,
    submitted: homework.filter(h => h.status === 'submitted').length,
    late: homework.filter(h => h.status === 'late').length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Heading2>Homework Assignments</Heading2>
          {children && children.length > 0 && (
            <Body variant="secondary">
              {children.length === 1 
                ? `${children[0].full_name} - Grade ${children[0].sections?.grade}`
                : `${children.length} children`
              }
            </Body>
          )}
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Card variant="default" style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.warning[50] }]}>
                <MaterialIcons name="schedule" size={24} color={theme.colors.warning[500]} />
              </View>
              <Heading3 style={styles.statValue}>{stats.pending}</Heading3>
              <Caption style={styles.statLabel}>Pending</Caption>
            </CardContent>
          </Card>
          
          <Card variant="default" style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.success[50] }]}>
                <MaterialIcons name="check-circle" size={24} color={theme.colors.success[500]} />
              </View>
              <Heading3 style={styles.statValue}>{stats.submitted}</Heading3>
              <Caption style={styles.statLabel}>Submitted</Caption>
            </CardContent>
          </Card>
          
          <Card variant="default" style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.danger[50] }]}>
                <MaterialIcons name="error" size={24} color={theme.colors.danger[500]} />
              </View>
              <Heading3 style={styles.statValue}>{stats.late}</Heading3>
              <Caption style={styles.statLabel}>Late</Caption>
            </CardContent>
          </Card>
        </View>

        {/* Homework List */}
        <View style={styles.homeworkContainer}>
          {isLoading ? (
            <Card variant="default" style={styles.loadingCard}>
              <CardContent style={styles.loadingContent}>
                <MaterialIcons name="refresh" size={32} color={theme.colors.primary[500]} />
                <Body variant="secondary" style={{ marginTop: theme.spacing.sm }}>
                  Loading homework assignments...
                </Body>
              </CardContent>
            </Card>
          ) : homework.length === 0 ? (
            <Card variant="default" style={styles.emptyCard}>
              <CardContent style={styles.emptyContent}>
                <MaterialIcons name="assignment" size={64} color={theme.colors.text.muted} />
                <Heading3 variant="secondary" style={styles.emptyTitle}>
                  No homework assignments
                </Heading3>
                <Body variant="muted" style={styles.emptyText}>
                  Great! No homework assignments at the moment. Check back later for updates.
                </Body>
              </CardContent>
            </Card>
          ) : (
            homework.map((item) => {
              const child = children?.find(c => c.id === item.student_id);
              const overdueFlag = isOverdue(item.due_date);
              
              return (
                <Card key={item.id} variant="default" style={styles.homeworkCard}>
                  <CardContent style={styles.homeworkContent}>
                    <View style={styles.homeworkHeader}>
                      <View style={styles.homeworkInfo}>
                        <Body weight="medium" style={styles.homeworkTitle}>
                          {item.title}
                        </Body>
                        <BodySmall variant="secondary" style={styles.homeworkSubject}>
                          {item.subject} • {item.teacher_name}
                        </BodySmall>
                                                 {child && children && children.length > 1 && (
                          <BodySmall variant="secondary" style={styles.studentName}>
                            {child.full_name}
                          </BodySmall>
                        )}
                      </View>
                      <View style={styles.statusContainer}>
                        <MaterialIcons
                          name={getStatusIcon(item.status)}
                          size={20}
                          color={getStatusColor(item.status)}
                        />
                        <Caption
                          style={{
                            ...styles.statusText,
                            color: getStatusColor(item.status)
                          }}
                        >
                          {getStatusLabel(item.status)}
                        </Caption>
                      </View>
                    </View>

                    <Body style={styles.homeworkDescription}>
                      {item.description}
                    </Body>

                    <View style={styles.homeworkMeta}>
                      <View style={styles.metaItem}>
                        <MaterialIcons 
                          name="event" 
                          size={16} 
                          color={overdueFlag ? theme.colors.danger[500] : theme.colors.text.secondary} 
                        />
                        <BodySmall 
                          variant="secondary" 
                          style={overdueFlag ? { color: theme.colors.danger[500] } : {}}
                        >
                          Due: {formatDate(item.due_date)}
                          {overdueFlag && ' (Overdue)'}
                        </BodySmall>
                      </View>
                      {item.submission_date && (
                        <View style={styles.metaItem}>
                          <MaterialIcons name="check" size={16} color={theme.colors.success[500]} />
                          <BodySmall variant="secondary">
                            Submitted: {formatDate(item.submission_date)}
                          </BodySmall>
                        </View>
                      )}
                    </View>

                    {item.status === 'pending' && (
                      <View style={styles.homeworkActions}>
                        <TouchableOpacity style={styles.actionButton}>
                          <MaterialIcons name="info" size={16} color={theme.colors.primary[500]} />
                          <Caption style={styles.actionText}>View Details</Caption>
                        </TouchableOpacity>
                      </View>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </View>

        {/* Empty state for no children */}
        {!childrenLoading && (!children || children.length === 0) && (
          <Card variant="default" style={styles.emptyCard}>
            <CardContent style={styles.emptyContent}>
              <MaterialIcons name="people-outline" size={64} color={theme.colors.text.muted} />
              <Heading3 variant="secondary" style={styles.emptyTitle}>
                No children linked
              </Heading3>
              <Body variant="muted" style={styles.emptyText}>
                No children are linked to your account. Contact your school administration for assistance.
              </Body>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    borderColor: theme.colors.border,
  },
  statContent: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
  },
  homeworkContainer: {
    gap: theme.spacing.md,
  },
  loadingCard: {
    borderColor: theme.colors.border,
  },
  loadingContent: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyCard: {
    borderColor: theme.colors.border,
  },
  emptyContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  homeworkCard: {
    borderColor: theme.colors.border,
  },
  homeworkContent: {
    gap: theme.spacing.md,
  },
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  homeworkInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  homeworkTitle: {
    color: theme.colors.text.primary,
  },
  homeworkSubject: {
    color: theme.colors.text.secondary,
  },
  studentName: {
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  homeworkDescription: {
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  homeworkMeta: {
    gap: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  homeworkActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary[50],
  },
  actionText: {
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
}); 