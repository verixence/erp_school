import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  SafeAreaView
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Save,
  Users,
  CheckCircle,
  AlertCircle,
  Award,
  Calendar,
  Clock,
  User,
  BookOpen
} from 'lucide-react-native';

interface Student {
  id: string;
  full_name: string;
  admission_no?: string;
  section?: string;
  grade?: string;
}

interface Mark {
  id?: string;
  student_id: string;
  exam_paper_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
  remarks?: string;
  student?: Student;
}

interface ExamDetails {
  id: string;
  exam_name: string;
  subject: string;
  section: string;
  grade: number;
  date: string;
  start_time: string;
  max_marks: number;
  venue: string;
}

export const TeacherMarksEntryScreen: React.FC = () => {
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const examDetails = (route.params as any)?.examDetails as ExamDetails;
  const examId = (route.params as any)?.examId || examDetails?.id;

  // Debug user authentication on component mount
  useEffect(() => {
    console.log('🔍 TeacherMarksEntry: Component mounted with user:', {
      userId: user?.id,
      schoolId: user?.school_id,
      role: user?.role,
      examId,
      hasExamDetails: !!examDetails
    });

    // Test database structure (only in development)
    if (user?.id && __DEV__) {
      const testQuery = async () => {
        // Test 1: Check direct teacher_id approach
        const { data: directData, error: directError } = await supabase
          .from('exam_papers')
          .select('id, subject, section, teacher_id')
          .eq('school_id', user.school_id)
          .eq('teacher_id', user.id)
          .limit(1);
        
        // Test 2: Check teachers table approach
        const { data: teachersData, error: teachersError } = await supabase
          .from('exam_papers')
          .select(`
            id, subject, section, teacher_id,
            teachers!inner(user_id)
          `)
          .eq('school_id', user.school_id)
          .eq('teachers.user_id', user.id)
          .limit(1);

        console.log('🧪 TeacherMarksEntry: DB Structure Tests:', { 
          direct: { data: directData, error: directError },
          teachers_join: { data: teachersData, error: teachersError },
          userId: user.id 
        });
      };
      testQuery();
    }
  }, [user, examId, examDetails]);

  const [refreshing, setRefreshing] = useState(false);
  const [marksData, setMarksData] = useState<Record<string, { marks?: number; isAbsent: boolean; remarks?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showExamSelection, setShowExamSelection] = useState(!examId);
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Fetch available exams for selection when no exam is specified
  const { data: availableExams = [] } = useQuery({
    queryKey: ['teacher-completed-exams', user?.id],
    queryFn: async () => {
      if (!user?.id || examId) {
        console.log('❌ TeacherMarksEntry: Skipping availableExams query', { userId: user?.id, examId });
        return [];
      }

      console.log('🔍 TeacherMarksEntry: Fetching available exams for teacher:', user.id);

      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          id,
          subject,
          section,
          exam_date,
          exam_time,
          max_marks,
          venue,
          exam_groups(
            name,
            exam_type
          ),
          teachers!inner(
            user_id
          )
        `)
        .eq('school_id', user.school_id)
        .eq('teachers.user_id', user.id)
        .lte('exam_date', new Date().toISOString().split('T')[0]) // Past exams only
        .order('exam_date', { ascending: false });

      console.log('📊 TeacherMarksEntry: Available exams query result:', { data, error });

      if (error) {
        console.error('❌ TeacherMarksEntry: Available exams query error:', error);
        throw error;
      }
      
      const mappedData = data?.map((exam: any) => {
        // Parse grade and section from the section text field
        // Section is stored as text like "Grade 3 A" or "3A" 
        const sectionText = exam.section || '';
        const gradeMatch = sectionText.match(/(\d+)/);
        const grade = gradeMatch ? parseInt(gradeMatch[1]) : 0;
        
        return {
          id: exam.id,
          exam_name: exam.exam_groups?.name || `${exam.subject} Exam`,
          subject: exam.subject,
          section: sectionText,
          grade: grade,
          date: exam.exam_date,
          start_time: exam.exam_time,
          max_marks: exam.max_marks,
          venue: exam.venue || 'TBA'
        };
      }) || [];

      console.log('✅ TeacherMarksEntry: Mapped available exams:', mappedData);
      return mappedData;
    },
    enabled: !!user?.id && !examId,
  });

  // Fetch students for the exam section (needed when no marks exist yet)
  const { data: sectionStudents = [] } = useQuery({
    queryKey: ['exam-section-students', examId || selectedExamId],
    queryFn: async (): Promise<any[]> => {
      const currentExamId = examId || selectedExamId;
      const currentExam = examDetails || availableExams.find(e => e.id === currentExamId);
      if (!currentExamId || !currentExam) {
        console.log('❌ TeacherMarksEntry: No exam info for students query');
        return [];
      }

      console.log('🔍 TeacherMarksEntry: Fetching students for section:', currentExam.section);

      // Parse section format exactly like web app (e.g., "Grade 3 A" -> grade: "3", section: "A")
      const sectionMatch = currentExam.section.match(/Grade (\d+) ([A-Z]+)/);
      let query = supabase
        .from('students')
        .select(`
          id,
          full_name,
          admission_no,
          grade,
          section
        `)
        .eq('school_id', user?.school_id);

      if (sectionMatch) {
        const [, grade, section] = sectionMatch;
        console.log('🔍 TeacherMarksEntry: Parsed section - grade:', grade, 'section:', section);
        query = query.eq('grade', grade).eq('section', section);
      } else {
        // Fallback: try exact section match
        console.log('🔍 TeacherMarksEntry: Using fallback section match:', currentExam.section);
        query = query.eq('section', currentExam.section);
      }

      const { data, error } = await query.order('full_name');

      console.log('📊 TeacherMarksEntry: Section students query result:', { data, error });

      if (error) {
        console.error('❌ TeacherMarksEntry: Students query error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!(examId || selectedExamId) && !!user?.school_id,
  });

  // Fetch marks for this exam
  const { data: marks = [], isLoading: marksLoading, refetch } = useQuery({
    queryKey: ['exam-marks', examId || selectedExamId],
    queryFn: async (): Promise<Mark[]> => {
      const currentExamId = examId || selectedExamId;
      if (!currentExamId) {
        console.log('❌ TeacherMarksEntry: No exam ID for marks query');
        return [];
      }

      console.log('🔍 TeacherMarksEntry: Fetching marks for exam:', currentExamId);

      const { data, error } = await supabase
        .from('marks')
        .select(`
          id,
          student_id,
          exam_paper_id,
          marks_obtained,
          is_absent,
          remarks,
          students(
            id,
            full_name,
            admission_no,
            section,
            grade
          )
        `)
        .eq('exam_paper_id', currentExamId)
        .order('students(full_name)');

      console.log('📊 TeacherMarksEntry: Marks query result:', { examId: currentExamId, data, error });

      if (error) {
        console.error('❌ TeacherMarksEntry: Marks query error:', error);
        throw error;
      }
      
      const mappedMarks = (data || []).map((mark: any) => ({
        ...mark,
        student: mark.students
      }));

      console.log('✅ TeacherMarksEntry: Mapped marks data:', mappedMarks);
      return mappedMarks;
    },
    enabled: !!(examId || selectedExamId),
  });

  // Create marks entries for students (like web app useCreateMarksForExam)
  const createMarksForExam = async (examPaperId: string, students: any[]) => {
    console.log('📝 TeacherMarksEntry: Creating marks entries for', students.length, 'students');
    
    const marksEntries = students.map(student => ({
      exam_paper_id: examPaperId,
      student_id: student.id,
      school_id: user?.school_id,
      entered_by: user?.id,
      is_absent: false,
      marks_obtained: null,
      subject: (examDetails || availableExams.find(e => e.id === examPaperId))?.subject
    }));

    const { data, error } = await supabase
      .from('marks')
      .insert(marksEntries)
      .select(`
        id,
        student_id,
        exam_paper_id,
        marks_obtained,
        is_absent,
        remarks,
        students(
          id,
          full_name,
          admission_no,
          section,
          grade
        )
      `);

    if (error && !error.message.includes('duplicate key')) {
      console.error('❌ TeacherMarksEntry: Error creating marks entries:', error);
      throw error;
    }
    
    console.log('✅ TeacherMarksEntry: Created marks entries:', data?.length || 0);
    return data || [];
  };

  // Stable exam ID to prevent unnecessary recalculations
  const currentExamId = examId || selectedExamId;

  // Combine existing marks with section students to create complete list
  const studentsWithMarks = useMemo(() => {
    console.log('🔄 TeacherMarksEntry: Combining marks and students data:', { 
      marksCount: marks.length, 
      studentsCount: sectionStudents.length,
      examId: currentExamId
    });

    if (marks.length > 0) {
      // Use existing marks data (students are already included)
      return marks;
    } else if (sectionStudents.length > 0 && currentExamId) {
      // Create placeholder marks for section students (will create actual entries when saving)
      return sectionStudents.map(student => ({
        id: null, // No marks record exists yet
        student_id: student.id,
        exam_paper_id: currentExamId,
        marks_obtained: null,
        is_absent: false,
        remarks: null,
        student: student
      }));
    }
    return [];
  }, [marks, sectionStudents, currentExamId]);

  // Initialize marks data when students/marks are loaded (prevent infinite loop)
  const prevStudentsRef = useRef<string>('');
  
  useEffect(() => {
    if (studentsWithMarks.length === 0) return;
    
    // Create a stable key based on student IDs and their current marks state
    const currentStudentsKey = studentsWithMarks
      .map(mark => `${mark.id || mark.student_id}-${mark.marks_obtained}-${mark.is_absent}`)
      .sort()
      .join('|');
    
    // Only update if the students data has actually changed
    if (prevStudentsRef.current !== currentStudentsKey) {
      const initialData: Record<string, { marks?: number; isAbsent: boolean; remarks?: string }> = {};
      studentsWithMarks.forEach((mark, index) => {
        // Use index as key for new records, mark.id for existing records
        const key = mark.id || `new_${index}`;
        initialData[key] = {
          marks: mark.marks_obtained !== null ? mark.marks_obtained : undefined,
          isAbsent: mark.is_absent,
          remarks: mark.remarks || undefined
        };
      });
      setMarksData(initialData);
      prevStudentsRef.current = currentStudentsKey;
      console.log('✅ TeacherMarksEntry: Initialized marks data for', studentsWithMarks.length, 'students');
    }
  }, [studentsWithMarks]);

  // Save marks mutation
  const saveMarksMutation = useMutation({
    mutationFn: async (markUpdates: any[]) => {
      console.log('💾 TeacherMarksEntry: Saving marks:', markUpdates.length, 'records');
      console.log('📋 TeacherMarksEntry: Mark update data:', JSON.stringify(markUpdates, null, 2));
      
      const { error } = await supabase
        .from('marks')
        .upsert(markUpdates, { onConflict: 'exam_paper_id,student_id' });

      if (error) {
        console.error('❌ TeacherMarksEntry: Save marks error:', error);
        throw error;
      }
      
      console.log('✅ TeacherMarksEntry: Marks saved successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-marks', examId || selectedExamId] });
      queryClient.invalidateQueries({ queryKey: ['exam-section-students', examId || selectedExamId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-exam-papers'] });
      Alert.alert('Success', 'Marks saved successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to save marks. Please try again.');
    },
  });

  const handleMarksChange = (markId: string, field: 'marks' | 'isAbsent' | 'remarks', value: any) => {
    setMarksData(prev => ({
      ...prev,
      [markId]: {
        ...prev[markId],
        [field]: value,
        // If marking as absent, clear marks
        ...(field === 'isAbsent' && value ? { marks: undefined } : {}),
        // If entering marks, unmark absent
        ...(field === 'marks' && value !== undefined && value !== '' ? { isAbsent: false } : {})
      }
    }));
  };

  const handleSaveMarks = async () => {
    const currentExamId = examId || selectedExamId;
    if (!currentExamId) return;

    const currentExamDetails = examDetails || availableExams.find(e => e.id === selectedExamId);
    const maxMarks = currentExamDetails?.max_marks || 100;

    console.log('🚀 TeacherMarksEntry: Starting save marks process');
    console.log('📝 TeacherMarksEntry: Current user:', { id: user?.id, school_id: user?.school_id, role: user?.role });
    console.log('📝 TeacherMarksEntry: Current exam details:', { id: currentExamId, subject: currentExamDetails?.subject, max_marks: maxMarks });

    // If no marks exist yet, create them first (like web app)
    if (marks.length === 0 && sectionStudents.length > 0) {
      console.log('📝 TeacherMarksEntry: No marks exist, creating entries first...');
      try {
        const newMarks = await createMarksForExam(currentExamId, sectionStudents);
        
                 // Now proceed with the update using the newly created marks
         const markUpdates = newMarks.map((mark: any) => {
           const key = mark.id;
           const markData = marksData[`new_${sectionStudents.findIndex(s => s.id === mark.student_id)}`] || {};
           
           return {
             id: mark.id,
             student_id: mark.student_id,
             exam_paper_id: currentExamId,
             school_id: user?.school_id,  // ✅ Required for RLS policy
             entered_by: user?.id,        // ✅ Required for RLS policy
             subject: currentExamDetails?.subject, // ✅ Required field from DB migration
             marks_obtained: markData.isAbsent ? null : (markData.marks || null),
             is_absent: markData.isAbsent,
             remarks: markData.remarks || null
           };
         });

                 // Validate required fields for RLS policy
         const missingFields = markUpdates.filter(mark => 
           !mark.school_id || !mark.entered_by || !mark.subject
         );
         if (missingFields.length > 0) {
           console.error('❌ TeacherMarksEntry: Missing required fields for RLS in create flow:', missingFields);
           Alert.alert('Error', 'Missing required information. Please refresh and try again.');
           return;
         }

         setIsSaving(true);
         await saveMarksMutation.mutateAsync(markUpdates);
         return;
      } catch (error) {
        console.error('❌ TeacherMarksEntry: Error creating marks entries:', error);
        Alert.alert('Error', 'Failed to create marks entries. Please try again.');
        return;
      }
    }

    // Normal update flow for existing marks
    const errors: string[] = [];
    
    const markUpdates = studentsWithMarks.map((mark: any, index: number) => {
      const key = mark.id || `new_${index}`;
      const markData = marksData[key] || {};
      
      if (!markData.isAbsent) {
        if (markData.marks === undefined || markData.marks === null) {
          errors.push(`Missing marks for ${mark.student?.full_name}`);
        } else if (markData.marks < 0 || markData.marks > maxMarks) {
          errors.push(`Invalid marks for ${mark.student?.full_name} (0-${maxMarks})`);
        }
      }

      return {
        id: mark.id, // null for new records
        student_id: mark.student_id,
        exam_paper_id: currentExamId,
        school_id: user?.school_id,  // ✅ Required for RLS policy
        entered_by: user?.id,        // ✅ Required for RLS policy
        subject: currentExamDetails?.subject, // ✅ Required field from DB migration
        marks_obtained: markData.isAbsent ? null : (markData.marks || null),
        is_absent: markData.isAbsent,
        remarks: markData.remarks || null
      };
    });

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    // Validate required fields for RLS policy
    const missingFields = markUpdates.filter(mark => 
      !mark.school_id || !mark.entered_by || !mark.subject
    );
    if (missingFields.length > 0) {
      console.error('❌ TeacherMarksEntry: Missing required fields for RLS:', missingFields);
      Alert.alert('Error', 'Missing required information. Please refresh and try again.');
      return;
    }

    setIsSaving(true);
    try {
      await saveMarksMutation.mutateAsync(markUpdates);
    } finally {
      setIsSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const calculateGrade = (marks: number, maxMarks: number) => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getCompletionStats = () => {
    const total = studentsWithMarks.length;
    const completed = studentsWithMarks.filter((mark: any, index: number) => {
      const key = mark.id || `new_${index}`;
      const markData = marksData[key];
      return markData?.isAbsent || (markData?.marks !== undefined && markData?.marks !== null);
    }).length;
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const stats = getCompletionStats();

  const handleExamSelection = (exam: any) => {
    setSelectedExamId(exam.id);
    setShowExamSelection(false);
  };

  // Show exam selection screen if no exam details provided
  if (showExamSelection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Select Exam Paper</Text>
            <Text style={styles.headerSubtitle}>Choose an exam to enter marks</Text>
          </View>
        </View>

        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {availableExams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Award size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No exams available</Text>
              <Text style={styles.emptySubtext}>No completed exams found for marks entry</Text>
            </View>
          ) : (
            availableExams.map((exam) => (
              <TouchableOpacity
                key={exam.id}
                style={styles.examSelectionCard}
                onPress={() => handleExamSelection(exam)}
              >
                <View style={styles.examSelectionHeader}>
                  <Text style={styles.examSelectionTitle}>{exam.exam_name}</Text>
                  <View style={styles.examSelectionSubject}>
                    <BookOpen size={16} color="#6b7280" />
                    <Text style={styles.examSelectionSubjectText}>
                      {exam.subject} • Grade {exam.grade} {exam.section}
                    </Text>
                  </View>
                </View>
                <View style={styles.examSelectionDetails}>
                  <View style={styles.examSelectionDetailRow}>
                    <Calendar size={14} color="#6b7280" />
                    <Text style={styles.examSelectionDetailText}>
                      {new Date(exam.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.examSelectionDetailRow}>
                    <Award size={14} color="#6b7280" />
                    <Text style={styles.examSelectionDetailText}>{exam.max_marks} marks</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!examDetails && !examId && !selectedExamId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>Exam details not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Marks Entry</Text>
          <Text style={styles.headerSubtitle}>
            {(() => {
              const currentExam = examDetails || availableExams.find(e => e.id === selectedExamId);
              return currentExam ? `${currentExam.subject} • Grade ${currentExam.grade} ${currentExam.section}` : 'Select an exam';
            })()}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSaveMarks}
          disabled={isSaving}
        >
          <Save size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Exam Info Card */}
      <View style={styles.examInfoCard}>
        <View style={styles.examInfoHeader}>
          <View style={styles.examInfoLeft}>
            <Text style={styles.examName}>
              {(() => {
                const currentExam = examDetails || availableExams.find(e => e.id === selectedExamId);
                return currentExam?.exam_name || 'Exam';
              })()}
            </Text>
            <View style={styles.examDetails}>
              <View style={styles.examDetailItem}>
                <Calendar size={14} color="#6b7280" />
                <Text style={styles.examDetailText}>
                  {(() => {
                    const currentExam = examDetails || availableExams.find(e => e.id === selectedExamId);
                    return currentExam?.date ? new Date(currentExam.date).toLocaleDateString() : 'N/A';
                  })()}
                </Text>
              </View>
              <View style={styles.examDetailItem}>
                <Award size={14} color="#6b7280" />
                <Text style={styles.examDetailText}>
                  {(() => {
                    const currentExam = examDetails || availableExams.find(e => e.id === selectedExamId);
                    return currentExam?.max_marks || 0;
                  })()} marks
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.completionBadge}>
            <Text style={styles.completionText}>{stats.percentage}%</Text>
            <Text style={styles.completionLabel}>Complete</Text>
          </View>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${stats.percentage}%`,
                backgroundColor: stats.percentage === 100 ? '#10b981' : '#f59e0b'
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {stats.completed}/{stats.total} students completed
        </Text>
      </View>

      {/* Students List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {marksLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        ) : studentsWithMarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No students found</Text>
            <Text style={styles.emptySubtext}>Students will appear here when enrolled for this exam</Text>
          </View>
        ) : (
          studentsWithMarks.map((mark: any, index: number) => {
            const key = mark.id || `new_${index}`;
            const markData = marksData[key] || { marks: undefined, isAbsent: false, remarks: '' };
            const currentExam = examDetails || availableExams.find(e => e.id === selectedExamId);
            const maxMarks = currentExam?.max_marks || 100;
            const grade = markData.marks !== undefined && !markData.isAbsent 
              ? calculateGrade(markData.marks, maxMarks)
              : '';
            
            return (
              <View key={key} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{mark.student?.full_name}</Text>
                    <Text style={styles.studentDetails}>
                      {mark.student?.admission_no ? `Admission No: ${mark.student.admission_no}` : 
                       `Student ID: ${mark.student_id.slice(-6)}`}
                    </Text>
                  </View>
                  {grade && (
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(grade) + '20' }]}>
                      <Text style={[styles.gradeText, { color: getGradeColor(grade) }]}>
                        {grade}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.marksInputContainer}>
                  <View style={styles.marksInputRow}>
                    <View style={styles.marksInputGroup}>
                      <Text style={styles.inputLabel}>Marks</Text>
                      <TextInput
                        style={[
                          styles.marksInput,
                          markData.isAbsent && styles.marksInputDisabled
                        ]}
                        value={markData.isAbsent ? 'Absent' : (markData.marks?.toString() || '')}
                        onChangeText={(text) => {
                          const marks = parseInt(text) || undefined;
                          handleMarksChange(key, 'marks', marks);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        editable={!markData.isAbsent}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>

                    <View style={styles.absentContainer}>
                      <Text style={styles.inputLabel}>Absent</Text>
                      <TouchableOpacity
                        style={[styles.checkbox, markData.isAbsent && styles.checkboxChecked]}
                        onPress={() => handleMarksChange(key, 'isAbsent', !markData.isAbsent)}
                      >
                        {markData.isAbsent && (
                          <CheckCircle size={16} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.remarksContainer}>
                    <Text style={styles.inputLabel}>Remarks (Optional)</Text>
                    <TextInput
                      style={styles.remarksInput}
                      value={markData.remarks || ''}
                      onChangeText={(text) => handleMarksChange(key, 'remarks', text)}
                      placeholder="Enter remarks..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A+': case 'A': return '#10b981';
    case 'B+': case 'B': return '#3b82f6';
    case 'C': return '#f59e0b';
    case 'D': return '#ef4444';
    case 'F': return '#dc2626';
    default: return '#6b7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  examInfoCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  examInfoLeft: {
    flex: 1,
  },
  examName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  examDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  examDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examDetailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  completionBadge: {
    alignItems: 'center',
  },
  completionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  completionLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  marksInputContainer: {
    gap: 12,
  },
  marksInputRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-end',
  },
  marksInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  marksInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  marksInputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  absentContainer: {
    alignItems: 'center',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  remarksContainer: {
    marginTop: 4,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  examSelectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examSelectionHeader: {
    marginBottom: 12,
  },
  examSelectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  examSelectionSubject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examSelectionSubjectText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  examSelectionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  examSelectionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examSelectionDetailText: {
    fontSize: 12,
    color: '#6b7280',
  },
}); 