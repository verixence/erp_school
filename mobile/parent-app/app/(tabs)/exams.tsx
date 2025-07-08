import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Custom components
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/Card';
import { Heading1, Heading2, Heading3, Body, BodySmall, Caption } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { theme } from '../../src/theme/colors';

// Hooks
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren } from '../../src/hooks/useParentData';

interface ExamResult {
  id: string;
  exam_name: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  grade: string;
  exam_date: string;
  result_date: string;
  teacher_remarks?: string;
  child_name: string;
}

interface UpcomingExam {
  id: string;
  exam_name: string;
  subject: string;
  exam_date: string;
  exam_time: string;
  duration: string;
  syllabus: string;
  exam_type: 'Unit Test' | 'Mid Term' | 'Final' | 'Internal Assessment';
  child_name: string;
}

export default function ExamsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'results' | 'analytics'>('upcoming');

  const { data: children, isLoading: childrenLoading, refetch: refetchChildren } = useChildren(user?.id);

  // Mock data for demonstration - replace with real API calls
  const upcomingExams: UpcomingExam[] = [
    {
      id: '1',
      exam_name: 'Unit Test 1',
      subject: 'Mathematics',
      exam_date: '2024-01-25',
      exam_time: '09:00 AM',
      duration: '2 hours',
      syllabus: 'Chapters 1-3: Algebra, Geometry basics',
      exam_type: 'Unit Test',
      child_name: 'John Doe',
    },
    {
      id: '2',
      exam_name: 'Unit Test 1',
      subject: 'English',
      exam_date: '2024-01-27',
      exam_time: '10:00 AM',
      duration: '2 hours',
      syllabus: 'Grammar, Comprehension, Essay writing',
      exam_type: 'Unit Test',
      child_name: 'John Doe',
    },
    {
      id: '3',
      exam_name: 'Mid Term Examination',
      subject: 'Science',
      exam_date: '2024-02-15',
      exam_time: '09:00 AM',
      duration: '3 hours',
      syllabus: 'Physics: Light, Sound; Chemistry: Acids & Bases',
      exam_type: 'Mid Term',
      child_name: 'John Doe',
    },
  ];

  const examResults: ExamResult[] = [
    {
      id: '1',
      exam_name: 'Monthly Test',
      subject: 'Mathematics',
      marks_obtained: 88,
      total_marks: 100,
      grade: 'A+',
      exam_date: '2024-01-10',
      result_date: '2024-01-15',
      teacher_remarks: 'Excellent performance in algebra. Needs improvement in geometry.',
      child_name: 'John Doe',
    },
    {
      id: '2',
      exam_name: 'Monthly Test',
      subject: 'English',
      marks_obtained: 92,
      total_marks: 100,
      grade: 'A+',
      exam_date: '2024-01-10',
      result_date: '2024-01-15',
      teacher_remarks: 'Outstanding essay writing skills. Good vocabulary.',
      child_name: 'John Doe',
    },
    {
      id: '3',
      exam_name: 'Monthly Test',
      subject: 'Science',
      marks_obtained: 85,
      total_marks: 100,
      grade: 'A',
      exam_date: '2024-01-10',
      result_date: '2024-01-15',
      teacher_remarks: 'Good understanding of concepts. Practice more numericals.',
      child_name: 'John Doe',
    },
  ];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchChildren();
      // Add API calls to refresh exam data here
    } finally {
      setRefreshing(false);
    }
  }, [refetchChildren]);

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'Unit Test':
        return theme.colors.blue[500];
      case 'Mid Term':
        return theme.colors.orange[500];
      case 'Final':
        return theme.colors.red[500];
      case 'Internal Assessment':
        return theme.colors.purple[500];
      default:
        return theme.colors.gray[500];
    }
  };

  const getGradeColor = (grade: string) => {
    const gradeValue = grade.replace(/[^A-F]/g, '');
    switch (gradeValue) {
      case 'A':
        return theme.colors.green[500];
      case 'B':
        return theme.colors.blue[500];
      case 'C':
        return theme.colors.yellow[500];
      case 'D':
        return theme.colors.orange[500];
      case 'F':
        return theme.colors.red[500];
      default:
        return theme.colors.gray[500];
    }
  };

  const calculatePercentage = (obtained: number, total: number) => {
    return Math.round((obtained / total) * 100);
  };

  const getOverallPerformance = () => {
    if (examResults.length === 0) return { average: 0, grade: 'N/A', trend: 'neutral' };
    
    const totalPercentage = examResults.reduce((sum, result) => 
      sum + calculatePercentage(result.marks_obtained, result.total_marks), 0
    );
    const average = Math.round(totalPercentage / examResults.length);
    
    let grade = 'F';
    if (average >= 90) grade = 'A+';
    else if (average >= 80) grade = 'A';
    else if (average >= 70) grade = 'B';
    else if (average >= 60) grade = 'C';
    else if (average >= 50) grade = 'D';
    
    return { average, grade, trend: 'improving' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getDaysUntilExam = (examDate: string) => {
    const today = new Date();
    const exam = new Date(examDate);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const performance = getOverallPerformance();

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
          <View style={styles.headerContent}>
            <Heading1 style={styles.title}>Exams & Results</Heading1>
            <Body variant="secondary" style={styles.subtitle}>
              Track exam schedules and academic performance
            </Body>
          </View>
        </View>

        {/* Overall Performance Card */}
        <Card variant="elevated" style={styles.performanceCard}>
          <CardContent style={styles.performanceContent}>
            <View style={styles.performanceHeader}>
              <View style={styles.performanceIcon}>
                <MaterialIcons name="trending-up" size={24} color={theme.colors.white} />
              </View>
              <View style={styles.performanceInfo}>
                <Caption style={styles.performanceLabel}>Overall Performance</Caption>
                <Heading2 style={styles.performanceValue}>{performance.average}%</Heading2>
                <Body style={styles.performanceGrade}>Grade: {performance.grade}</Body>
              </View>
              <View style={styles.performanceStats}>
                <View style={styles.statItem}>
                  <Heading3 style={styles.statValue}>{upcomingExams.length}</Heading3>
                  <Caption style={styles.statLabel}>Upcoming</Caption>
                </View>
                <View style={styles.statItem}>
                  <Heading3 style={styles.statValue}>{examResults.length}</Heading3>
                  <Caption style={styles.statLabel}>Completed</Caption>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Child Selection */}
        {children && children.length > 1 && (
          <Card variant="default" style={styles.childSelectionCard}>
            <CardContent style={styles.childSelectionContent}>
              <Body weight="medium" style={styles.childSelectionTitle}>Select Child:</Body>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.childButtons}>
                  <TouchableOpacity
                    style={[
                      styles.childButton,
                      selectedChild === null && styles.childButtonActive
                    ]}
                    onPress={() => setSelectedChild(null)}
                  >
                    <Body style={[
                      styles.childButtonText,
                      selectedChild === null && styles.childButtonTextActive
                    ]}>
                      All Children
                    </Body>
                  </TouchableOpacity>
                  {children.map((child: any) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.childButton,
                        selectedChild === child.id && styles.childButtonActive
                      ]}
                      onPress={() => setSelectedChild(child.id)}
                    >
                      <Body style={[
                        styles.childButtonText,
                        selectedChild === child.id && styles.childButtonTextActive
                      ]}>
                        {child.full_name}
                      </Body>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <View style={styles.tabButtons}>
            {[
              { key: 'upcoming', label: 'Upcoming', icon: 'schedule' },
              { key: 'results', label: 'Results', icon: 'assessment' },
              { key: 'analytics', label: 'Analytics', icon: 'analytics' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  selectedTab === tab.key && styles.tabButtonActive
                ]}
                onPress={() => setSelectedTab(tab.key as any)}
              >
                <MaterialIcons 
                  name={tab.icon as any} 
                  size={20} 
                  color={selectedTab === tab.key ? theme.colors.primary[500] : theme.colors.text.secondary}
                />
                <Body style={[
                  styles.tabButtonText,
                  selectedTab === tab.key && styles.tabButtonTextActive
                ]}>
                  {tab.label}
                </Body>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content based on selected tab */}
        {selectedTab === 'upcoming' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Heading3 style={styles.sectionTitle}>Upcoming Exams</Heading3>
              <Caption variant="secondary">{upcomingExams.length} scheduled</Caption>
            </View>

            {upcomingExams.length > 0 ? (
              <View style={styles.examsContainer}>
                {upcomingExams.map((exam) => (
                  <Card key={exam.id} variant="default" style={styles.examCard}>
                    <CardContent style={styles.examContent}>
                      <View style={styles.examHeader}>
                        <View style={styles.examInfo}>
                          <View style={styles.examTitleRow}>
                            <Heading3 style={styles.examName}>{exam.exam_name}</Heading3>
                            <View style={[
                              styles.examTypeBadge,
                              { backgroundColor: `${getExamTypeColor(exam.exam_type)}20` }
                            ]}>
                              <Caption style={[
                                styles.examTypeText,
                                { color: getExamTypeColor(exam.exam_type) }
                              ]}>
                                {exam.exam_type}
                              </Caption>
                            </View>
                          </View>
                          <Body variant="secondary" style={styles.examSubject}>{exam.subject}</Body>
                        </View>
                        <View style={styles.examCountdown}>
                          <Caption variant="muted">In</Caption>
                          <Body weight="medium" style={{
                            ...styles.daysUntil,
                            color: getExamTypeColor(exam.exam_type)
                          }}>
                            {getDaysUntilExam(exam.exam_date)}
                          </Body>
                        </View>
                      </View>

                      <View style={styles.examDetails}>
                        <View style={styles.examDetailRow}>
                          <MaterialIcons name="event" size={16} color={theme.colors.text.muted} />
                          <Caption variant="secondary">{formatDate(exam.exam_date)}</Caption>
                        </View>
                        <View style={styles.examDetailRow}>
                          <MaterialIcons name="access-time" size={16} color={theme.colors.text.muted} />
                          <Caption variant="secondary">{formatTime(exam.exam_time)} • {exam.duration}</Caption>
                        </View>
                        <View style={styles.examDetailRow}>
                          <MaterialIcons name="book" size={16} color={theme.colors.text.muted} />
                          <Caption variant="secondary" style={styles.syllabusText}>{exam.syllabus}</Caption>
                        </View>
                      </View>

                      <View style={styles.examActions}>
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => Alert.alert('Study Material', 'Download study material for this exam.')}
                        >
                          Study Material
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => Alert.alert('Set Reminder', 'Reminder set for this exam.')}
                        >
                          Set Reminder
                        </Button>
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            ) : (
              <Card variant="default" style={styles.emptyCard}>
                <CardContent style={styles.emptyContent}>
                  <MaterialIcons name="event-note" size={64} color={theme.colors.text.muted} />
                  <Heading3 variant="secondary" style={styles.emptyTitle}>No Upcoming Exams</Heading3>
                  <Body variant="muted" style={styles.emptyText}>
                    There are no scheduled exams at the moment. Check back later for updates.
                  </Body>
                </CardContent>
              </Card>
            )}
          </View>
        )}

        {selectedTab === 'results' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Heading3 style={styles.sectionTitle}>Exam Results</Heading3>
              <Caption variant="secondary">{examResults.length} results</Caption>
            </View>

            {examResults.length > 0 ? (
              <View style={styles.resultsContainer}>
                {examResults.map((result) => (
                  <Card key={result.id} variant="default" style={styles.resultCard}>
                    <CardContent style={styles.resultContent}>
                      <View style={styles.resultHeader}>
                        <View style={styles.resultInfo}>
                          <Heading3 style={styles.resultExamName}>{result.exam_name}</Heading3>
                          <Body variant="secondary" style={styles.resultSubject}>{result.subject}</Body>
                          <Caption variant="muted">Result on {formatDate(result.result_date)}</Caption>
                        </View>
                        <View style={styles.resultScore}>
                          <View style={styles.scoreContainer}>
                            <Heading2 style={styles.scoreValue}>
                              {result.marks_obtained}/{result.total_marks}
                            </Heading2>
                            <Caption variant="secondary">
                              {calculatePercentage(result.marks_obtained, result.total_marks)}%
                            </Caption>
                          </View>
                          <View style={[
                            styles.gradeBadge,
                            { backgroundColor: `${getGradeColor(result.grade)}20` }
                          ]}>
                            <Body weight="medium" style={[
                              styles.gradeText,
                              { color: getGradeColor(result.grade) }
                            ]}>
                              {result.grade}
                            </Body>
                          </View>
                        </View>
                      </View>

                      {result.teacher_remarks && (
                        <View style={styles.remarksContainer}>
                          <View style={styles.remarksHeader}>
                            <MaterialIcons name="comment" size={16} color={theme.colors.text.muted} />
                            <Caption variant="secondary" style={styles.remarksTitle}>Teacher's Remarks</Caption>
                          </View>
                          <Body variant="secondary" style={styles.remarksText}>
                            {result.teacher_remarks}
                          </Body>
                        </View>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </View>
            ) : (
              <Card variant="default" style={styles.emptyCard}>
                <CardContent style={styles.emptyContent}>
                  <MaterialIcons name="assignment" size={64} color={theme.colors.text.muted} />
                  <Heading3 variant="secondary" style={styles.emptyTitle}>No Results Available</Heading3>
                  <Body variant="muted" style={styles.emptyText}>
                    Exam results will appear here once they are published by your teachers.
                  </Body>
                </CardContent>
              </Card>
            )}
          </View>
        )}

        {selectedTab === 'analytics' && (
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>Performance Analytics</Heading3>
            
            {/* Subject-wise Performance */}
            <Card variant="default" style={styles.analyticsCard}>
              <CardHeader style={styles.cardHeader}>
                <CardTitle style={styles.cardTitle}>Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent style={styles.analyticsContent}>
                {examResults.reduce((acc: any[], result) => {
                  const existingSubject = acc.find(item => item.subject === result.subject);
                  if (existingSubject) {
                    existingSubject.totalMarks += result.marks_obtained;
                    existingSubject.totalPossible += result.total_marks;
                    existingSubject.count += 1;
                  } else {
                    acc.push({
                      subject: result.subject,
                      totalMarks: result.marks_obtained,
                      totalPossible: result.total_marks,
                      count: 1,
                    });
                  }
                  return acc;
                }, []).map((subjectData, index) => {
                  const percentage = Math.round((subjectData.totalMarks / subjectData.totalPossible) * 100);
                  return (
                    <View key={index} style={styles.subjectPerformance}>
                      <View style={styles.subjectHeader}>
                        <Body weight="medium" style={styles.subjectName}>{subjectData.subject}</Body>
                        <Body weight="medium" style={[
                          styles.subjectPercentage,
                          { color: getGradeColor(percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : 'C') }
                        ]}>
                          {percentage}%
                        </Body>
                      </View>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            { 
                              width: `${percentage}%`,
                              backgroundColor: getGradeColor(percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : 'C')
                            }
                          ]} 
                        />
                      </View>
                      <Caption variant="muted">
                        {subjectData.totalMarks}/{subjectData.totalPossible} marks • {subjectData.count} exams
                      </Caption>
                    </View>
                  );
                })}
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card variant="default" style={styles.analyticsCard}>
              <CardHeader style={styles.cardHeader}>
                <CardTitle style={styles.cardTitle}>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent style={styles.analyticsContent}>
                <View style={styles.insightItem}>
                  <View style={styles.insightIcon}>
                    <MaterialIcons name="trending-up" size={20} color={theme.colors.green[500]} />
                  </View>
                  <View style={styles.insightText}>
                    <Body weight="medium" style={styles.insightTitle}>Strong Performance</Body>
                    <Caption variant="secondary">Consistently scoring above 85% in most subjects</Caption>
                  </View>
                </View>

                <View style={styles.insightItem}>
                  <View style={styles.insightIcon}>
                    <MaterialIcons name="star" size={20} color={theme.colors.yellow[500]} />
                  </View>
                  <View style={styles.insightText}>
                    <Body weight="medium" style={styles.insightTitle}>Best Subject</Body>
                    <Caption variant="secondary">English - Average 92% across all exams</Caption>
                  </View>
                </View>

                <View style={styles.insightItem}>
                  <View style={styles.insightIcon}>
                    <MaterialIcons name="improve" size={20} color={theme.colors.blue[500]} />
                  </View>
                  <View style={styles.insightText}>
                    <Body weight="medium" style={styles.insightTitle}>Improvement Opportunity</Body>
                    <Caption variant="secondary">Focus more on Science practical applications</Caption>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.text.secondary,
  },
  performanceCard: {
    backgroundColor: theme.colors.primary[500],
    overflow: 'hidden',
  },
  performanceContent: {
    padding: theme.spacing.lg,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  performanceIcon: {
    width: 48,
    height: 48,
    backgroundColor: `${theme.colors.white}20`,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  performanceInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  performanceLabel: {
    color: theme.colors.white,
    opacity: 0.9,
  },
  performanceValue: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bold,
  },
  performanceGrade: {
    color: theme.colors.white,
    opacity: 0.9,
  },
  performanceStats: {
    gap: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  statValue: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
  },
  statLabel: {
    color: theme.colors.white,
    opacity: 0.8,
  },
  childSelectionCard: {
    borderColor: theme.colors.border,
  },
  childSelectionContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  childSelectionTitle: {
    color: theme.colors.text.primary,
  },
  childButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  childButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  childButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  childButtonText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  },
  childButtonTextActive: {
    color: theme.colors.white,
  },
  tabContainer: {
    marginVertical: theme.spacing.sm,
  },
  tabButtons: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.background,
  },
  tabButtonText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  },
  tabButtonTextActive: {
    color: theme.colors.primary[500],
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.text.primary,
  },
  examsContainer: {
    gap: theme.spacing.md,
  },
  examCard: {
    borderColor: theme.colors.border,
  },
  examContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  examInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  examTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  examName: {
    color: theme.colors.text.primary,
    flex: 1,
  },
  examTypeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
  },
  examTypeText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
  },
  examSubject: {
    fontSize: theme.typography.fontSize.sm,
  },
  examCountdown: {
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  daysUntil: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bold,
  },
  examDetails: {
    gap: theme.spacing.sm,
  },
  examDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  syllabusText: {
    flex: 1,
    lineHeight: 18,
  },
  examActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  resultsContainer: {
    gap: theme.spacing.md,
  },
  resultCard: {
    borderColor: theme.colors.border,
  },
  resultContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  resultExamName: {
    color: theme.colors.text.primary,
  },
  resultSubject: {
    fontSize: theme.typography.fontSize.sm,
  },
  resultScore: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  scoreContainer: {
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  scoreValue: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
  },
  gradeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  gradeText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bold,
  },
  remarksContainer: {
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  remarksTitle: {
    fontFamily: theme.typography.fontFamily.medium,
  },
  remarksText: {
    lineHeight: 20,
  },
  analyticsCard: {
    borderColor: theme.colors.border,
  },
  cardHeader: {
    padding: theme.spacing.md,
    paddingBottom: 0,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  analyticsContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  subjectPerformance: {
    gap: theme.spacing.sm,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    color: theme.colors.text.primary,
  },
  subjectPercentage: {
    fontFamily: theme.typography.fontFamily.bold,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  insightTitle: {
    color: theme.colors.text.primary,
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
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
}); 