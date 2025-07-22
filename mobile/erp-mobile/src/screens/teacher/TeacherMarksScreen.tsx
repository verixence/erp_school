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
  section: string;
  exam_date: string;
  exam_time?: string;
  duration_minutes: number;
  max_marks: number;
  school_id: string;
  exam_groups?: {
    id: string;
    name: string;
    exam_type: string;
    start_date: string;
    end_date: string;
  };
}

interface Student {
  id: string;
  full_name: string;
  admission_no?: string;
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
          exam_groups(
            id,
            name,
            exam_type,
            start_date,
            end_date
          )
        `)
        .eq('school_id', user.school_id)
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
            exam_groups(
              id,
              name,
              exam_type,
              start_date,
              end_date
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

      // Parse the section string to extract grade and section
      // Format could be "Grade 1 A" or "1A" etc.
      const sectionMatch = examPaper.section.match(/(?:Grade\s*)?(\d+)\s*([A-Z])/i);
      let grade = null;
      let section = null;

      if (sectionMatch) {
        grade = sectionMatch[1];
        section = sectionMatch[2].toUpperCase();
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no')
        .eq('grade', grade || examPaper.section)
        .eq('section', section || '')
        .eq('school_id', user?.school_id)
        .order('full_name', { ascending: true });

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

  // Grade calculation function
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

  // Validate all marks
  const validateAllMarks = () => {
    if (!selectedExamPaper) return false;
    
    const selectedPaper = examPapers.find(ep => ep.id === selectedExamPaper);
    if (!selectedPaper) return false;

    const errors: string[] = [];
    let isValid = true;

    students.forEach(student => {
      const studentMarks = marksData[student.id];
      if (!studentMarks || studentMarks.absent) return;
      
      const marks = parseFloat(studentMarks.marks);
      if (isNaN(marks)) {
        errors.push(`Missing marks for ${student.full_name}`);
        isValid = false;
      } else if (marks < 0 || marks > selectedPaper.max_marks) {
        errors.push(`Invalid marks for ${student.full_name} (must be 0-${selectedPaper.max_marks})`);
        isValid = false;
      }
    });

    if (!isValid) {
      Alert.alert('Validation Error', errors.join('\n'));
    }

    return isValid;
  };

  const handleSaveMarks = async () => {
    if (!selectedExamPaper) {
      Alert.alert('Error', 'Please select an exam paper first');
      return;
    }

    if (!validateAllMarks()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await saveMarksMutation.mutateAsync();
      Alert.alert('Success', 'Marks saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save marks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkMarkPresent = () => {
    Alert.alert(
      'Mark All Present',
      'This will mark all students as present. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            const updatedMarksData = { ...marksData };
            students.forEach(student => {
              updatedMarksData[student.id] = {
                ...updatedMarksData[student.id],
                absent: false
              };
            });
            setMarksData(updatedMarksData);
          }
        }
      ]
    );
  };

  const handleBulkSetMarks = () => {
    Alert.prompt(
      'Set Marks for All',
      'Enter marks to set for all present students:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: (marks) => {
            if (!marks || isNaN(parseFloat(marks))) {
              Alert.alert('Error', 'Please enter valid marks');
              return;
            }
            
            const selectedPaper = examPapers.find(ep => ep.id === selectedExamPaper);
            if (!selectedPaper) return;
            
            const numMarks = parseFloat(marks);
            if (numMarks < 0 || numMarks > selectedPaper.max_marks) {
              Alert.alert('Error', `Marks must be between 0 and ${selectedPaper.max_marks}`);
              return;
            }

            const updatedMarksData = { ...marksData };
            students.forEach(student => {
              if (!updatedMarksData[student.id]?.absent) {
                updatedMarksData[student.id] = {
                  ...updatedMarksData[student.id],
                  marks: marks,
                  absent: false
                };
              }
            });
            setMarksData(updatedMarksData);
          }
        }
      ],
      'plain-text'
    );
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
                `${selectedPaper.subject} - ${selectedPaper.exam_groups?.name || 'Unknown'} (${selectedPaper.section})` : 
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
                    {selectedPaper.exam_groups?.name || 'Unknown Exam'} • {selectedPaper.section}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    Date: {formatDate(selectedPaper.exam_date)} • Duration: {selectedPaper.duration_minutes} mins
                  </Text>
                </CardContent>
              </Card>

              {/* Bulk Operations */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                  Bulk Operations
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      backgroundColor: '#f3f4f6',
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                    onPress={handleBulkMarkPresent}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
                      Mark All Present
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      backgroundColor: '#f3f4f6',
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                    onPress={handleBulkSetMarks}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
                      Set Marks for All
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

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
                              {student.full_name}
                            </Text>
                            {student.admission_no && (
                              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                Admission No: {student.admission_no}
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
                            
                            {/* Grade Display */}
                            <View style={{ width: 60, alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 }}>
                                Grade
                              </Text>
                              {studentMarks.marks && !isNaN(parseFloat(studentMarks.marks)) ? (
                                <View style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  backgroundColor: (() => {
                                    const grade = calculateGrade(parseFloat(studentMarks.marks), selectedPaper.max_marks);
                                    if (grade === 'A+' || grade === 'A') return '#dcfce7';
                                    if (grade === 'B+' || grade === 'B') return '#dbeafe';
                                    if (grade === 'C') return '#fef3c7';
                                    if (grade === 'D') return '#fed7aa';
                                    return '#fecaca';
                                  })()
                                }}>
                                  <Text style={{
                                    fontSize: 14,
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    color: (() => {
                                      const grade = calculateGrade(parseFloat(studentMarks.marks), selectedPaper.max_marks);
                                      if (grade === 'A+' || grade === 'A') return '#166534';
                                      if (grade === 'B+' || grade === 'B') return '#1e40af';
                                      if (grade === 'C') return '#92400e';
                                      if (grade === 'D') return '#c2410c';
                                      return '#dc2626';
                                    })()
                                  }}>
                                    {calculateGrade(parseFloat(studentMarks.marks), selectedPaper.max_marks)}
                                  </Text>
                                </View>
                              ) : (
                                <View style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  backgroundColor: '#f3f4f6'
                                }}>
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#9ca3af', textAlign: 'center' }}>
                                    -
                                  </Text>
                                </View>
                              )}
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

              {/* Statistics Summary */}
              <Card style={{ marginTop: 16, marginBottom: 16 }}>
                <CardContent style={{ padding: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                    Marks Entry Summary
                  </Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                        {students.length}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>Total Students</Text>
                    </View>
                    
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#ef4444' }}>
                        {Object.values(marksData).filter(data => data.absent).length}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>Absent</Text>
                    </View>
                    
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#10b981' }}>
                        {Object.values(marksData).filter(data => !data.absent && data.marks && !isNaN(parseFloat(data.marks))).length}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>Marks Entered</Text>
                    </View>
                    
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#f59e0b' }}>
                        {students.length - Object.values(marksData).filter(data => data.absent).length - Object.values(marksData).filter(data => !data.absent && data.marks && !isNaN(parseFloat(data.marks))).length}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>Pending</Text>
                    </View>
                  </View>

                  {/* Grade Distribution */}
                  {Object.values(marksData).some(data => !data.absent && data.marks && !isNaN(parseFloat(data.marks))) && (
                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                        Grade Distribution
                      </Text>
                      
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {['A+', 'A', 'B+', 'B', 'C', 'D', 'F'].map(gradeLevel => {
                          const count = Object.values(marksData).filter(data => {
                            if (data.absent || !data.marks || isNaN(parseFloat(data.marks))) return false;
                            return calculateGrade(parseFloat(data.marks), selectedPaper!.max_marks) === gradeLevel;
                          }).length;
                          
                          if (count === 0) return null;
                          
                          return (
                            <View key={gradeLevel} style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              backgroundColor: '#f3f4f6',
                              borderRadius: 4
                            }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>
                                {gradeLevel}: {count}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </CardContent>
              </Card>

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
                      {paper.exam_groups?.name || 'Unknown'} • {paper.section}
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
