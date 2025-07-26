'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Save, 
  Users, 
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Award,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';
import { 
  useExamPaper,
  useMarks,
  useUpdateMark,
  useBulkCreateMarks,
  useBulkUpdateMarks,
  useCreateMarksForExam,
  calculateGrade,
  DEFAULT_FA_GRADING,
  DEFAULT_SA_GRADING,
  type Mark,
  type UpdateMarkData,
  type GradeBand
} from '@erp/common';
import { toast } from 'sonner';

export default function MarksEntryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const paperId = params.paperId as string;
  
  const [marksData, setMarksData] = useState<Record<string, { marks?: number; isAbsent: boolean; remarks?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // API hooks
  const { data: examPaper, isLoading: examPaperLoading } = useExamPaper(paperId);
  const { data: marks = [], isLoading: marksLoading } = useMarks(paperId);
  
  // Fetch school details to determine board type
  const { data: school } = useQuery({
    queryKey: ['school-details', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, board_type, state_board_type, assessment_pattern')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });
  
  const updateMarkMutation = useUpdateMark();
  const bulkCreateMarksMutation = useBulkCreateMarks();
  const bulkUpdateMarksMutation = useBulkUpdateMarks();
  const createMarksForExamMutation = useCreateMarksForExam();

  // Determine if this is a State Board assessment
  const isStateBoardAssessment = useMemo(() => {
    return school?.state_board_type === 'Telangana' || 
           school?.assessment_pattern === 'State_FA_SA' ||
           examPaper?.exam_group?.exam_type?.startsWith('state_');
  }, [school, examPaper]);

  // Determine assessment type for grading
  const assessmentType = useMemo(() => {
    if (!examPaper) return null;
    
    if (isStateBoardAssessment) {
      if (examPaper.exam_group?.exam_type?.includes('fa') || examPaper.max_marks <= 20) {
        return 'FA';
      } else if (examPaper.exam_group?.exam_type?.includes('sa') || examPaper.max_marks >= 80) {
        return 'SA';
      }
    }
    return null;
  }, [examPaper, isStateBoardAssessment]);

  // Get appropriate grading scale
  const gradingScale = useMemo((): GradeBand[] => {
    if (isStateBoardAssessment && assessmentType) {
      return assessmentType === 'FA' ? DEFAULT_FA_GRADING : DEFAULT_SA_GRADING;
    }
    return []; // Use CBSE grading for non-State Board
  }, [isStateBoardAssessment, assessmentType]);

  // Calculate grade and remark for State Board assessments
  const calculateStateBoardGrade = (marks: number, maxMarks: number): { grade: string; remark: string } => {
    if (!isStateBoardAssessment || gradingScale.length === 0) {
      return { grade: '', remark: '' };
    }

    if (assessmentType === 'FA') {
      // For FA, use marks directly (out of 20)
      const gradeBand = gradingScale.find(band => marks >= band.min && marks <= band.max);
      return gradeBand ? { grade: gradeBand.grade, remark: gradeBand.remark } : { grade: 'D', remark: 'Work Hard' };
    } else {
      // For SA, use percentage
      const percentage = (marks / maxMarks) * 100;
      const gradeBand = gradingScale.find(band => percentage >= band.min && percentage <= band.max);
      return gradeBand ? { grade: gradeBand.grade, remark: gradeBand.remark } : { grade: 'D', remark: 'Need to Improve' };
    }
  };

  // Enhanced calculateGrade function with State Board support
  const calculateGradeEnhanced = (marks: number, maxMarks: number) => {
    if (isStateBoardAssessment) {
      const gradeInfo = calculateStateBoardGrade(marks, maxMarks);
      return gradeInfo.grade;
    }
    
    // Original CBSE grading logic
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Initialize marks data when marks are loaded
  useEffect(() => {
    if (marks.length > 0) {
      const initialData: Record<string, { marks?: number; isAbsent: boolean; remarks?: string }> = {};
      marks.forEach(mark => {
        initialData[mark.id] = {
          marks: mark.marks_obtained !== null && mark.marks_obtained !== undefined ? mark.marks_obtained : undefined,
          isAbsent: mark.is_absent,
          remarks: mark.remarks || undefined
        };
      });
      setMarksData(initialData);
    }
  }, [marks]);

  const handleMarksChange = (markId: string, field: 'marks' | 'isAbsent' | 'remarks', value: any) => {
    setMarksData(prev => {
      const currentData = prev[markId] || {};
      
      // If marking as absent, clear the marks
      if (field === 'isAbsent' && value === true) {
        return {
          ...prev,
          [markId]: {
            ...currentData,
            isAbsent: true,
            marks: undefined
          }
        };
      }
      
      // If unmarking as absent, ensure marks field exists
      if (field === 'isAbsent' && value === false) {
        return {
          ...prev,
          [markId]: {
            ...currentData,
            isAbsent: false,
            marks: currentData.marks || undefined
          }
        };
      }
      
      return {
        ...prev,
        [markId]: {
          ...currentData,
          [field]: value
        }
      };
    });
  };

  const handleSaveMarks = async () => {
    if (!examPaper) return;
    
    setIsSaving(true);
    try {
      const updates: Array<{ id: string } & UpdateMarkData> = [];
      
      Object.entries(marksData).forEach(([markId, data]) => {
        const mark = marks.find(m => m.id === markId);
        if (mark) {
          // Validate marks if not absent
          if (!data.isAbsent && data.marks !== undefined) {
            if (data.marks < 0 || data.marks > examPaper.max_marks) {
              throw new Error(`Invalid marks for ${mark.student?.full_name}. Must be between 0 and ${examPaper.max_marks}`);
            }
          }
          
          updates.push({
            id: markId,
            marks_obtained: data.isAbsent ? undefined : data.marks,
            is_absent: data.isAbsent,
            remarks: data.remarks
          });
        }
      });

      const result = await bulkUpdateMarksMutation.mutateAsync(updates);
      
      // Enhanced success message with better feedback
      if (result && Array.isArray(result)) {
        toast.success(`✅ Success! All ${result.length} marks have been saved successfully!`, {
          duration: 4000,
          position: 'top-center'
        });
      } else {
        toast.success('✅ Success! Marks have been saved successfully!', {
          duration: 4000,
          position: 'top-center'
        });
      }
      
      // Show success animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving marks:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to save marks. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMarksEntries = async () => {
    if (!examPaper || !paperId) return;
    
    try {
      await createMarksForExamMutation.mutateAsync(paperId);
      toast.success('Marks entries created successfully!');
    } catch (error: any) {
      console.error('Error creating marks entries:', error);
      toast.error(error.message || 'Failed to create marks entries. Please try again.');
    }
  };

  const validateAllMarks = () => {
    let isValid = true;
    const errors: string[] = [];

    Object.entries(marksData).forEach(([markId, data]) => {
      const mark = marks.find(m => m.id === markId);
      if (mark && !data.isAbsent) {
        if (data.marks === undefined || data.marks === null) {
          errors.push(`Missing marks for ${mark.student?.full_name}`);
          isValid = false;
        } else if (data.marks < 0 || data.marks > examPaper!.max_marks) {
          errors.push(`Invalid marks for ${mark.student?.full_name}`);
          isValid = false;
        }
      }
    });

    if (!isValid) {
      toast.error(`Please fix the following errors:\n${errors.join('\n')}`);
    }

    return isValid;
  };

  const handleSaveAndSubmit = async () => {
    if (validateAllMarks()) {
      await handleSaveMarks();
      // Additional submission logic here
      toast.success('Marks submitted for review!');
    }
  };

  if (examPaperLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!examPaper) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Exam paper not found</h3>
          <p className="text-gray-500 mb-6">The exam paper you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (marksLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
            <p className="text-gray-600 mt-1">
              {examPaper.subject} - {examPaper.section}
            </p>
            {examPaper.exam_group && (
              <p className="text-sm text-gray-500">
                {examPaper.exam_group.name} ({examPaper.exam_group.exam_type.replace('_', ' ')})
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-2 rounded-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Marks Saved!</span>
            </motion.div>
          )}
          
          <Button
            variant="outline"
            onClick={() => {/* Export logic */}}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveMarks}
            disabled={isSaving}
            className={saveSuccess ? 'bg-green-50 border-green-200' : ''}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            onClick={handleSaveAndSubmit}
            disabled={isSaving}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save & Submit
          </Button>
        </div>
      </motion.div>

      {/* Exam Paper Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-morphism border-0 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Exam Details</h2>
            </div>
            {isStateBoardAssessment && (
              <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                {assessmentType} Assessment
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label className="text-sm font-medium text-gray-500">Subject</Label>
              <p className="text-lg font-semibold text-gray-900">{examPaper.subject}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Section</Label>
              <p className="text-lg font-semibold text-gray-900">{examPaper.section}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Max Marks</Label>
              <p className="text-lg font-semibold text-gray-900">{examPaper.max_marks}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">
                {isStateBoardAssessment ? 'Assessment Type' : 'Pass Marks'}
              </Label>
              <p className="text-lg font-semibold text-gray-900">
                {isStateBoardAssessment ? assessmentType : examPaper.pass_marks}
              </p>
            </div>
          </div>
          
          {examPaper.exam_date && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-500">Exam Date</Label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(examPaper.exam_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
          
          {examPaper.instructions && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-500">Instructions</Label>
              <p className="text-sm text-gray-700 mt-1">{examPaper.instructions}</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Grading Legend for State Board */}
      {isStateBoardAssessment && gradingScale.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-morphism border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                Grading Scale - {assessmentType} Assessment
              </CardTitle>
              <CardDescription>
                {assessmentType === 'FA' ? 'Formative Assessment grading based on marks obtained out of 20' : 'Summative Assessment grading based on percentage scored'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {gradingScale.map((band, index) => (
                  <div key={index} className="text-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                    <div className="text-xl font-bold text-purple-600 mb-1">{band.grade}</div>
                    <div className="text-sm text-gray-600 font-medium">
                      {assessmentType === 'FA' ? `${band.min}-${band.max}` : `${band.min}-${band.max}%`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{band.remark}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Marks Entry Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-morphism border-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h2 className="text-xl font-semibold text-gray-900">Student Marks</h2>
                <Badge variant="outline">{marks.length} Students</Badge>
              </div>
              
              {marks.length === 0 && (
                <Button onClick={handleCreateMarksEntries}>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Marks Entries
                </Button>
              )}
            </div>
            
            {marks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead className="text-center">Marks Obtained</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      {isStateBoardAssessment && (
                        <TableHead className="text-center">Remark</TableHead>
                      )}
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marks.map((mark, index) => {
                      const markData = marksData[mark.id] || { 
                        isAbsent: mark.is_absent, 
                        marks: mark.marks_obtained !== null && mark.marks_obtained !== undefined ? mark.marks_obtained : undefined 
                      };
                      const grade = markData.marks && !markData.isAbsent 
                        ? calculateGradeEnhanced(markData.marks, examPaper.max_marks) 
                        : markData.isAbsent ? 'AB' : '';
                      
                      const gradeInfo = isStateBoardAssessment && markData.marks && !markData.isAbsent 
                        ? calculateStateBoardGrade(markData.marks, examPaper.max_marks)
                        : { grade: '', remark: '' };
                      
                      return (
                        <motion.tr
                          key={mark.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {mark.student?.full_name}
                          </TableCell>
                          <TableCell>
                            {mark.student?.admission_no || 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max={examPaper.max_marks}
                              value={markData.isAbsent ? '' : (markData.marks !== undefined && markData.marks !== null ? markData.marks.toString() : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === null) {
                                  handleMarksChange(mark.id, 'marks', undefined);
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue)) {
                                    handleMarksChange(mark.id, 'marks', numValue);
                                  }
                                }
                              }}
                              disabled={markData.isAbsent}
                              className="w-20 text-center"
                              placeholder={markData.isAbsent ? 'AB' : '0'}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={
                                grade === 'O' ? 'bg-green-100 text-green-800' :
                                grade === 'A+' || grade === 'A' ? 'bg-blue-100 text-blue-800' :
                                grade === 'B+' || grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                grade === 'C' ? 'bg-orange-100 text-orange-800' :
                                grade === 'D' ? 'bg-red-100 text-red-800' :
                                grade === 'F' ? 'bg-red-100 text-red-800' :
                                grade === 'AB' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-500'
                              }
                            >
                              {grade || '-'}
                            </Badge>
                          </TableCell>
                          {isStateBoardAssessment && (
                            <TableCell className="text-center">
                              <span className="text-sm text-gray-600">
                                {gradeInfo.remark || (markData.isAbsent ? 'Absent' : '--')}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={markData.isAbsent}
                              onChange={(e) => handleMarksChange(mark.id, 'isAbsent', e.target.checked)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={markData.remarks !== undefined ? markData.remarks : ''}
                              onChange={(e) => handleMarksChange(mark.id, 'remarks', e.target.value)}
                              placeholder="Optional remarks..."
                              className="min-w-32"
                            />
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No marks entries found</h3>
                <p className="text-gray-500 mb-6">
                  Create marks entries for students in this section to start entering marks.
                </p>
                <Button onClick={handleCreateMarksEntries}>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Marks Entries
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Summary Statistics */}
      {marks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-morphism border-0 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{marks.length}</p>
                <p className="text-sm text-gray-500">Total Students</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(marksData).filter(data => data.isAbsent).length}
                </p>
                <p className="text-sm text-gray-500">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(marksData).filter(data => !data.isAbsent && data.marks !== undefined).length}
                </p>
                <p className="text-sm text-gray-500">Marks Entered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {marks.length - Object.values(marksData).filter(data => data.isAbsent).length - Object.values(marksData).filter(data => !data.isAbsent && data.marks !== undefined).length}
                </p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
} 