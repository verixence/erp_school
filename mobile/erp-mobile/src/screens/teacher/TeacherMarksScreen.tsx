import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  PenTool, 
  Award, 
  Users, 
  FileText, 
  Calendar,
  ChevronDown,
  X,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';

interface ExamPaper {
  id: string;
  exam_group_id: string;
  subject: string;
  exam_date: string;
  exam_time?: string;
  duration_minutes: number;
  max_marks: number;
  school_id: string;
  exam_groups: {
    id: string;
    name: string;
    exam_type: string;
    grade: number;
    section: string;
  };
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_number?: string;
  section_id: string;
}

interface Mark {
  id?: string;
  student_id: string;
  exam_paper_id: string;
  marks_obtained: number;
  is_absent: boolean;
  remarks?: string;
}

export const TeacherMarksScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExamPaper, setSelectedExamPaper] = useState<string>('');
  const [showExamPaperModal, setShowExamPaperModal] = useState(false);
  const [marksData, setMarksData] = useState<Record<string, { marks: string; absent: boolean; remarks: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teacher's exam papers
  const { data: examPapers = [], isLoading: examPapersLoading, refetch: refetchExamPapers } = useQuery({
    queryKey: ['teacher-exam-papers', user?.id],
    queryFn: async (): Promise<ExamPaper[]> => {
      if (!user?.id) return [];

            // First try to get exam papers via teacher assignment in exam_papers table
      let examPapersData, examPapersError;
      
      const teacherPapersResult = await supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups!inner(
            id,
            name,
            exam_type,
            grade,
            section
          )
        `)
        .eq('school_id', user.school_id)
        .eq('teacher_id', user.id)
        .order('exam_date', { ascending: false });

      if (teacherPapersResult.data && teacherPapersResult.data.length > 0) {
        return teacherPapersResult.data;
      }

      // Fallback: Get exam papers for sections where teacher is assigned
      const sectionsResult = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (sectionsResult.data && sectionsResult.data.length > 0) {
        const sectionNames = sectionsResult.data.map((item: any) => 
          `Grade ${item.sections.grade} ${item.sections.section}`
        );

        const { data, error } = await supabase
          .from('exam_papers')
          .select(`
            *,
            exam_groups!inner(
              id,
              name,
              exam_type,
              grade,
              section
            )
          `)
          .eq('school_id', user.school_id)
          .in('section', sectionNames)
          .order('exam_date', { ascending: false });

        if (error) {
          console.error('Error fetching exam papers:', error);
          throw error;
        }

        return data || [];
      }

      // Final fallback: Get all exam papers for the school
      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups!inner(
            id,
            name,
            exam_type,
            grade,
            section
          )
        `)
        .eq('school_id', user.school_id)
        .order('exam_date', { ascending: false });

      if (error) {
        console.error('Error fetching exam papers:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch students for selected exam paper
  const { data: students = [], isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['exam-paper-students', selectedExamPaper],
    queryFn: async (): Promise<Student[]> => {
      if (!selectedExamPaper) return [];

      const examPaper = examPapers.find(ep => ep.id === selectedExamPaper);
      if (!examPaper) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, roll_number, section_id')
        .eq('grade', examPaper.exam_groups.grade)
        .eq('section', examPaper.exam_groups.section)
        .eq('school_id', user?.school_id)
        .order('roll_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedExamPaper && examPapers.length > 0,
  });

  // Fetch existing marks for selected exam paper
  const { data: existingMarks = [], refetch: refetchMarks } = useQuery({
    queryKey: ['exam-marks', selectedExamPaper],
    queryFn: async (): Promise<Mark[]> => {
      if (!selectedExamPaper) return [];

      const { data, error } = await supabase
        .from('marks')
        .select('*')
        .eq('exam_paper_id', selectedExamPaper);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedExamPaper,
  });

  // Initialize marks data when students or existing marks change
  React.useEffect(() => {
    if (students.length > 0) {
      const initialMarks: Record<string, { marks: string; absent: boolean; remarks: string }> = {};
      
      students.forEach(student => {
        const existingMark = existingMarks.find(m => m.student_id === student.id);
        initialMarks[student.id] = {
          marks: existingMark ? existingMark.marks_obtained.toString() : '',
          absent: existingMark ? existingMark.is_absent : false,
          remarks: existingMark ? existingMark.remarks || '' : ''
        };
      });
      
      setMarksData(initialMarks);
    }
  }, [students, existingMarks]);

  // Save marks mutation
  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamPaper) throw new Error('No exam paper selected');

      const marksToSave: Omit<Mark, 'id'>[] = [];
      const marksToUpdate: Mark[] = [];

      students.forEach(student => {
        const studentMarks = marksData[student.id];
        if (!studentMarks) return;

        const existingMark = existingMarks.find(m => m.student_id === student.id);
        const markData = {
          student_id: student.id,
          exam_paper_id: selectedExamPaper,
          marks_obtained: studentMarks.absent ? 0 : parseFloat(studentMarks.marks) || 0,
          is_absent: studentMarks.absent,
          remarks: studentMarks.remarks || undefined
        };

        if (existingMark) {
          marksToUpdate.push({ ...markData, id: existingMark.id });
        } else {
          marksToSave.push(markData);
        }
      });

      // Insert new marks
      if (marksToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('marks')
          .insert(marksToSave);
        
        if (insertError) throw insertError;
      }

      // Update existing marks
      for (const mark of marksToUpdate) {
        const { error: updateError } = await supabase
          .from('marks')
          .update({
            marks_obtained: mark.marks_obtained,
            is_absent: mark.is_absent,
            remarks: mark.remarks
          })
          .eq('id', mark.id);
        
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-marks'] });
      Alert.alert('Success', 'Marks saved successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to save marks. Please try again.');
      console.error('Save marks error:', error);
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchExamPapers(),
      refetchStudents(),
      refetchMarks()
    ]);
    setRefreshing(false);
  };

  const handleMarksChange = (studentId: string, field: 'marks' | 'absent' | 'remarks', value: string | boolean) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedExamPaper) {
      Alert.alert('Error', 'Please select an exam paper first');
      return;
    }

    const selectedPaper = examPapers.find(ep => ep.id === selectedExamPaper);
    if (!selectedPaper) return;

    // Validate marks
    const hasInvalidMarks = students.some(student => {
      const studentMarks = marksData[student.id];
      if (!studentMarks || studentMarks.absent) return false;
      
      const marks = parseFloat(studentMarks.marks);
      return isNaN(marks) || marks < 0 || marks > selectedPaper.max_marks;
    });

    if (hasInvalidMarks) {
      Alert.alert('Error', `Please enter valid marks (0 to ${selectedPaper.max_marks})`);
      return;
    }

    setIsSubmitting(true);
    try {
      await saveMarksMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCompletionStats = () => {
    const totalStudents = students.length;
    const completedMarks = students.filter(student => {
      const studentMarks = marksData[student.id];
      return studentMarks && (studentMarks.absent || studentMarks.marks.trim() !== '');
    }).length;
    
    return { totalStudents, completedMarks };
  };

  if (examPapersLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading exam papers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedPaper = examPapers.find(ep => ep.id === selectedExamPaper);
  const { totalStudents, completedMarks } = getCompletionStats();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{ 
        backgroundColor: 'white', 
        paddingHorizontal: 24, 
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            backgroundColor: '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <PenTool size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Marks Entry
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Enter exam marks for students
            </Text>
          </View>
        </View>

        {/* Exam Paper Selector */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
            Select Exam Paper
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: 'white'
            }}
            onPress={() => setShowExamPaperModal(true)}
          >
            <Text style={{ fontSize: 16, color: selectedExamPaper ? '#111827' : '#9ca3af', flex: 1 }}>
              {selectedPaper ? 
                `${selectedPaper.subject} - ${selectedPaper.exam_groups.name} (Grade ${selectedPaper.exam_groups.grade} ${selectedPaper.exam_groups.section})` : 
                'Select an exam paper'
              }
            </Text>
            <ChevronDown size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {selectedPaper && (
          <View style={{ flexDirection: 'row', marginTop: 16, marginHorizontal: -6 }}>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#3b82f6' }}>
                  {selectedPaper.max_marks}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  Max Marks
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10b981' }}>
                  {totalStudents}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  Students
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#f59e0b' }}>
                  {completedMarks}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  Completed
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#8b5cf6' }}>
                  {totalStudents > 0 ? Math.round((completedMarks / totalStudents) * 100) : 0}%
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  Progress
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ padding: 24 }}>
          {selectedPaper && students.length > 0 ? (
            <>
              {/* Exam Paper Info */}
              <Card style={{ marginBottom: 24 }}>
                <CardContent style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Award size={20} color="#3b82f6" />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
                      {selectedPaper.subject}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                    {selectedPaper.exam_groups?.name || 'Unknown Exam'} • Grade {selectedPaper.exam_groups?.grade || '?'}{selectedPaper.exam_groups?.section || '?'}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    Date: {formatDate(selectedPaper.exam_date)} • Duration: {selectedPaper.duration_minutes} mins
                  </Text>
                </CardContent>
              </Card>

              {/* Students List */}
              <View style={{ gap: 12 }}>
                {students.map((student) => {
                  const studentMarks = marksData[student.id] || { marks: '', absent: false, remarks: '' };
                  
                  return (
                    <Card key={student.id}>
                      <CardContent style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                              {student.first_name} {student.last_name}
                            </Text>
                            {student.roll_number && (
                              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                Roll No: {student.roll_number}
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: studentMarks.absent ? '#fef2f2' : '#f0fdf4',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6
                            }}
                            onPress={() => handleMarksChange(student.id, 'absent', !studentMarks.absent)}
                          >
                            {studentMarks.absent ? (
                              <AlertCircle size={12} color="#ef4444" />
                            ) : (
                              <CheckCircle size={12} color="#10b981" />
                            )}
                            <Text style={{ 
                              fontSize: 12, 
                              color: studentMarks.absent ? '#ef4444' : '#10b981',
                              fontWeight: '500',
                              marginLeft: 4
                            }}>
                              {studentMarks.absent ? 'Absent' : 'Present'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        
                        {!studentMarks.absent && (
                          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 }}>
                                Marks (out of {selectedPaper.max_marks})
                              </Text>
                              <TextInput
                                style={{
                                  borderWidth: 1,
                                  borderColor: '#d1d5db',
                                  borderRadius: 6,
                                  paddingHorizontal: 8,
                                  paddingVertical: 6,
                                  fontSize: 16,
                                  color: '#111827'
                                }}
                                placeholder="0"
                                value={studentMarks.marks}
                                onChangeText={(text) => handleMarksChange(student.id, 'marks', text)}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>
                        )}
                        
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 }}>
                            Remarks (Optional)
                          </Text>
                          <TextInput
                            style={{
                              borderWidth: 1,
                              borderColor: '#d1d5db',
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 6,
                              fontSize: 14,
                              color: '#111827',
                              minHeight: 40
                            }}
                            placeholder="Add any remarks..."
                            value={studentMarks.remarks}
                            onChangeText={(text) => handleMarksChange(student.id, 'remarks', text)}
                            multiline={true}
                          />
                        </View>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>

              {/* Save Button */}
              <View style={{ marginTop: 24, marginBottom: 32 }}>
                <Button
                  title={isSubmitting ? "Saving..." : "Save All Marks"}
                  onPress={handleSaveMarks}
                  loading={isSubmitting}
                  style={{ backgroundColor: '#3b82f6' }}
                />
              </View>
            </>
          ) : selectedPaper && students.length === 0 ? (
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <Users size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  No Students Found
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                  No students found for this exam paper. Please check the exam configuration.
                </Text>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <PenTool size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  Select Exam Paper
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                  Choose an exam paper from the dropdown above to start entering marks.
                </Text>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Exam Paper Selector Modal */}
      <Modal
        visible={showExamPaperModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExamPaperModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'flex-end' 
        }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20,
            paddingTop: 20,
            maxHeight: '80%'
          }}>
            <View style={{ 
              paddingHorizontal: 24, 
              paddingBottom: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: '#e5e7eb',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Select Exam Paper
              </Text>
              <TouchableOpacity onPress={() => setShowExamPaperModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ padding: 24, gap: 12 }}>
                {examPapers.length > 0 ? (
                  examPapers.map((paper) => (
                    <TouchableOpacity
                      key={paper.id}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selectedExamPaper === paper.id ? '#3b82f6' : '#e5e7eb',
                        backgroundColor: selectedExamPaper === paper.id ? '#dbeafe' : 'white'
                      }}
                      onPress={() => {
                        setSelectedExamPaper(paper.id);
                        setShowExamPaperModal(false);
                      }}
                    >
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: '600', 
                        color: selectedExamPaper === paper.id ? '#1d4ed8' : '#111827',
                        marginBottom: 4
                      }}>
                        {paper.subject}
                      </Text>
                                          <Text style={{
                      fontSize: 14,
                      color: selectedExamPaper === paper.id ? '#1d4ed8' : '#6b7280',
                      marginBottom: 2
                    }}>
                      {paper.exam_groups.name} • Grade {paper.exam_groups.grade} {paper.exam_groups.section}
                    </Text>
                      <Text style={{ 
                        fontSize: 12, 
                        color: selectedExamPaper === paper.id ? '#1d4ed8' : '#9ca3af'
                      }}>
                        {formatDate(paper.exam_date)} • Max Marks: {paper.max_marks}
                      </Text>
                    </TouchableOpacity>
                  ))
                                 ) : (
                   <View style={{ padding: 32, alignItems: 'center' }}>
                     <FileText size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                     <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                       No Exam Papers Available
                     </Text>
                     <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                       No exam papers with valid exam groups are available for marks entry. Please contact the administration to set up exam groups.
                     </Text>
                   </View>
                 )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
