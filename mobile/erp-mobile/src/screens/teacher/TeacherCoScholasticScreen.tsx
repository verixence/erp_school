import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Modal,
  Alert,
  TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Star,
  Users,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Save,
  X,
  Award,
  BookOpen,
  Heart,
  ThumbsUp,
  Clock,
  Zap,
  MessageSquare
} from 'lucide-react-native';

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface Section {
  id: string;
  grade: number;
  section: string;
}

interface CoScholasticAssessment {
  id?: string;
  student_id: string;
  term: 'Term1' | 'Term2';
  academic_year: string;
  
  // Co-Scholastic Activities
  oral_expression?: 'A' | 'B' | 'C' | 'D';
  handwriting?: 'A' | 'B' | 'C' | 'D';
  general_knowledge?: 'A' | 'B' | 'C' | 'D';
  activity_sports?: 'A' | 'B' | 'C' | 'D';
  
  // Attitude and Values
  towards_teachers?: 'A' | 'B' | 'C' | 'D';
  towards_students?: 'A' | 'B' | 'C' | 'D';
  towards_school?: 'A' | 'B' | 'C' | 'D';
  
  // Personal Qualities
  punctuality?: 'A' | 'B' | 'C' | 'D';
  initiative?: 'A' | 'B' | 'C' | 'D';
  confidence?: 'A' | 'B' | 'C' | 'D';
  neatness?: 'A' | 'B' | 'C' | 'D';
  
  teacher_remarks?: string;
  status: 'draft' | 'completed';
}

const GRADE_OPTIONS = [
  { value: 'A', label: 'A - Excellent', color: '#10b981' },
  { value: 'B', label: 'B - Good', color: '#3b82f6' },
  { value: 'C', label: 'C - Satisfactory', color: '#f59e0b' },
  { value: 'D', label: 'D - Needs Improvement', color: '#ef4444' }
];

const ASSESSMENT_CATEGORIES = {
  'Co-Scholastic Activities': [
    { key: 'oral_expression', label: 'Oral Expression', icon: MessageSquare },
    { key: 'handwriting', label: 'Handwriting', icon: Edit },
    { key: 'general_knowledge', label: 'General Knowledge', icon: BookOpen },
    { key: 'activity_sports', label: 'Activity & Sports', icon: Award }
  ],
  'Attitude and Values': [
    { key: 'towards_teachers', label: 'Towards Teachers', icon: Heart },
    { key: 'towards_students', label: 'Towards Students', icon: Users },
    { key: 'towards_school', label: 'Towards School', icon: Star }
  ],
  'Personal Qualities': [
    { key: 'punctuality', label: 'Punctuality', icon: Clock },
    { key: 'initiative', label: 'Initiative', icon: Zap },
    { key: 'confidence', label: 'Confidence', icon: ThumbsUp },
    { key: 'neatness', label: 'Neatness', icon: CheckCircle }
  ]
};

export const TeacherCoScholasticScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<'Term1' | 'Term2'>('Term1');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentData, setAssessmentData] = useState<CoScholasticAssessment>({
    student_id: '',
    term: 'Term1',
    academic_year: '2024-25',
    status: 'draft'
  });

  // Fetch sections where this teacher is the class teacher
  const { data: classTeacherSections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['class-teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) return [];

      console.log('Fetching sections for teacher:', user.id, 'school:', user.school_id);
      
      // Try direct class teacher query first
      const { data: directSections, error: directError } = await supabase
        .from('sections')
        .select('id, grade, section, class_teacher, school_id')
        .eq('class_teacher', user.id)
        .eq('school_id', user?.school_id)
        .order('grade, section');

      console.log('Direct sections query result:', { data: directSections, error: directError });
      
      if (directError) throw directError;
      
      // If we found sections directly, return them
      if (directSections && directSections.length > 0) {
        return directSections;
      }
      
      // Otherwise, try the junction table approach for any sections where teacher teaches
      console.log('No direct class teacher sections found, trying junction table...');
      const { data: junctionSections, error: junctionError } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id, grade, section, class_teacher, school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user?.school_id);

      console.log('Junction table query result:', { data: junctionSections, error: junctionError });
      
      if (junctionError) throw junctionError;
      
      // Transform junction table results
      return (junctionSections || []).map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        class_teacher: item.sections.class_teacher,
        school_id: item.sections.school_id
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch students from class teacher sections
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['class-teacher-students', user?.id, classTeacherSections],
    queryFn: async (): Promise<Student[]> => {
      if (!user?.id || classTeacherSections.length === 0) return [];

      console.log('Class teacher sections:', classTeacherSections);
      const sectionIds = classTeacherSections.map(s => s.id);
      
      // Try UUID-based section_id query first
      const { data: uuidStudents, error: uuidError } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section, section_id')
        .in('section_id', sectionIds)
        .eq('school_id', user?.school_id)
        .order('full_name');

      console.log('UUID-based students query result:', { data: uuidStudents, error: uuidError, sectionIds });
      
      if (uuidError) {
        console.error('UUID query error:', uuidError);
      }
      
      // If UUID query returns students, use them
      if (uuidStudents && uuidStudents.length > 0) {
        return uuidStudents;
      }
      
      // Fallback: Try text-based matching for backward compatibility
      console.log('UUID query returned no students, trying text-based fallback...');
      
      const textBasedQueries = classTeacherSections.map(async (section) => {
        const { data: textStudents, error: textError } = await supabase
          .from('students')
          .select('id, full_name, admission_no, grade, section, section_id')
          .eq('school_id', user?.school_id)
          .eq('section', section.section)
          .eq('grade', section.grade.toString())
          .order('full_name');
        
        if (textError) {
          console.error(`Text-based query error for section ${section.grade}${section.section}:`, textError);
          return [];
        }
        
        console.log(`Text-based students for section ${section.grade}${section.section}:`, textStudents);
        return textStudents || [];
      });
      
      const allResults = await Promise.all(textBasedQueries);
      const allStudents = allResults.flat();
      
      // Remove duplicates by student ID
      const uniqueStudents = allStudents.filter((student, index, arr) => 
        arr.findIndex(s => s.id === student.id) === index
      );
      
      console.log('Final combined students result:', uniqueStudents);
      return uniqueStudents;
    },
    enabled: !!user?.id && classTeacherSections.length > 0,
  });

  // Fetch existing assessments
  const { data: existingAssessments = [], refetch: refetchAssessments } = useQuery({
    queryKey: ['co-scholastic-assessments', user?.id, selectedTerm],
    queryFn: async (): Promise<CoScholasticAssessment[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('co_scholastic_assessments')
        .select('*')
        .eq('assessed_by', user.id)
        .eq('term', selectedTerm)
        .eq('academic_year', '2024-25');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create/Update assessment mutation
  const assessmentMutation = useMutation({
    mutationFn: async (data: CoScholasticAssessment) => {
      const payload = {
        ...data,
        school_id: user?.school_id,
        assessed_by: user?.id,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };

      // Use upsert to handle both create and update cases
      const { error } = await supabase
        .from('co_scholastic_assessments')
        .upsert(payload, {
          onConflict: 'student_id,term,academic_year'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Assessment saved successfully!');
      setShowAssessmentModal(false);
      refetchAssessments();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save assessment');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAssessments();
    setRefreshing(false);
  };

  const openAssessmentModal = (student: Student) => {
    setSelectedStudent(student);
    
    // Check if assessment already exists
    const existing = existingAssessments.find(a => a.student_id === student.id);
    
    if (existing) {
      setAssessmentData(existing);
    } else {
      setAssessmentData({
        student_id: student.id,
        term: selectedTerm,
        academic_year: '2024-25',
        status: 'draft'
      });
    }
    
    setShowAssessmentModal(true);
  };

  const handleSaveAssessment = () => {
    if (!selectedStudent) return;
    
    assessmentMutation.mutate(assessmentData);
  };

  const getGradeColor = (grade?: string) => {
    const gradeOption = GRADE_OPTIONS.find(g => g.value === grade);
    return gradeOption?.color || '#6b7280';
  };

  const getGradeLabel = (grade?: string) => {
    const gradeOption = GRADE_OPTIONS.find(g => g.value === grade);
    return gradeOption?.label || 'Not Assessed';
  };

  const renderGradeSelector = (category: string, field: string, value?: string) => {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          {category}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GRADE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: value === option.value ? option.color : '#d1d5db',
                backgroundColor: value === option.value ? option.color + '20' : 'white'
              }}
              onPress={() => setAssessmentData(prev => ({ ...prev, [field]: option.value }))}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: value === option.value ? option.color : '#6b7280'
              }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const getAssessmentStatus = (studentId: string) => {
    const assessment = existingAssessments.find(a => a.student_id === studentId);
    return assessment?.status || 'not_started';
  };

  const getCompletionStats = () => {
    const total = students.length;
    const completed = existingAssessments.filter(a => a.status === 'completed').length;
    const draft = existingAssessments.filter(a => a.status === 'draft').length;
    
    return { total, completed, draft, notStarted: total - completed - draft };
  };

  const stats = getCompletionStats();

  if (sectionsLoading || studentsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#6b7280' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (classTeacherSections.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Star size={64} color="#d1d5db" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
            No Class Teacher Sections
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
            You need to be assigned as a class teacher to access co-scholastic assessments.
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
            Teacher ID: {user?.id}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Star size={24} color="#7c3aed" />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginLeft: 8 }}>
            Co-Scholastic Assessments
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>
          CBSE attitude, values & personal qualities assessment
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Term Selection */}
        <View style={{ padding: 16 }}>
          <Card>
            <CardHeader>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                Select Term
              </Text>
            </CardHeader>
            <CardContent>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['Term1', 'Term2'].map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: selectedTerm === term ? '#7c3aed' : '#f3f4f6',
                      alignItems: 'center'
                    }}
                    onPress={() => setSelectedTerm(term as 'Term1' | 'Term2')}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: selectedTerm === term ? 'white' : '#6b7280'
                    }}>
                      {term}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Statistics */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Card>
            <CardHeader>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                Assessment Progress
              </Text>
            </CardHeader>
            <CardContent>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#10b981' }}>{stats.completed}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Completed</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#f59e0b' }}>{stats.draft}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Draft</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#6b7280' }}>{stats.notStarted}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Not Started</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>{stats.total}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Total</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Students List */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Card>
            <CardHeader>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                Students ({students.length})
              </Text>
            </CardHeader>
            <CardContent>
              {students.map((student) => {
                const status = getAssessmentStatus(student.id);
                const statusColor = status === 'completed' ? '#10b981' : 
                                  status === 'draft' ? '#f59e0b' : '#6b7280';
                const statusText = status === 'completed' ? 'Completed' :
                                 status === 'draft' ? 'Draft' : 'Not Started';

                return (
                  <TouchableOpacity
                    key={student.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                      backgroundColor: '#f9fafb',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#e5e7eb'
                    }}
                    onPress={() => openAssessmentModal(student)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                        {student.full_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>
                        Grade {student.grade} {student.section} • {student.admission_no}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        backgroundColor: statusColor + '20'
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: statusColor
                        }}>
                          {statusText}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {students.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Users size={48} color="#d1d5db" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 12 }}>
                    No Students Found
                  </Text>
                  <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
                    Students will appear here when you're assigned as a class teacher
                  </Text>
                  <Text style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', marginTop: 8 }}>
                    Sections: {classTeacherSections.map(s => `${s.grade}${s.section}`).join(', ')}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', marginTop: 2 }}>
                    Check console for debugging details
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      {/* Assessment Modal */}
      <Modal
        visible={showAssessmentModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowAssessmentModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Modal Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb'
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                {selectedStudent?.full_name}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                {selectedTerm} Assessment • Academic Year 2024-25
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAssessmentModal(false)}
              style={{ padding: 8 }}
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
            {Object.entries(ASSESSMENT_CATEGORIES).map(([categoryName, fields]) => (
              <View key={categoryName} style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: 16,
                  paddingBottom: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#e5e7eb'
                }}>
                  {categoryName}
                </Text>
                
                {fields.map((field) => (
                  <View key={field.key}>
                    {renderGradeSelector(field.label, field.key, (assessmentData as any)[field.key])}
                  </View>
                ))}
              </View>
            ))}

            {/* Teacher Remarks */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Teacher Remarks
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                multiline
                placeholder="Add remarks about the student's overall performance..."
                value={assessmentData.teacher_remarks || ''}
                onChangeText={(text) => setAssessmentData(prev => ({ ...prev, teacher_remarks: text }))}
              />
            </View>

            {/* Status Selection */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Assessment Status
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { value: 'draft', label: 'Save as Draft', color: '#f59e0b' },
                  { value: 'completed', label: 'Mark Complete', color: '#10b981' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: assessmentData.status === option.value ? option.color : '#d1d5db',
                      backgroundColor: assessmentData.status === option.value ? option.color + '20' : 'white',
                      alignItems: 'center'
                    }}
                    onPress={() => setAssessmentData(prev => ({ ...prev, status: option.value as 'draft' | 'completed' }))}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: assessmentData.status === option.value ? option.color : '#6b7280'
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            flexDirection: 'row',
            gap: 12
          }}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowAssessmentModal(false)}
              style={{ flex: 1 }}
            />
            <Button
              title={assessmentMutation.isPending ? 'Saving...' : 'Save Assessment'}
              onPress={handleSaveAssessment}
              disabled={assessmentMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}; 