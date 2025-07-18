'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Star, 
  Award,
  Target,
  BookOpen,
  Search,
  CheckCircle,
  AlertCircle,
  Eye,
  Save,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';

interface CoScholasticAssessment {
  id?: string;
  student_id: string;
  term: 'Term1' | 'Term2';
  academic_year: string;
  school_id?: string;
  teacher_id?: string;
  updated_by?: string;
  updated_at?: string;
  
  // Co-Scholastic Activities
  oral_expression?: string;
  handwriting?: string;
  general_knowledge?: string;
  activity_sports?: string;
  
  // Attitude and Values
  towards_teachers?: string;
  towards_students?: string;
  towards_school?: string;
  
  // Personal Qualities
  punctuality?: string;
  initiative?: string;
  confidence?: string;
  neatness?: string;
  
  teacher_remarks?: string;
  status: 'draft' | 'completed';
  [key: string]: string | undefined;
}

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

const GRADE_OPTIONS = [
  { value: 'A', label: 'A - Excellent', color: 'text-green-600' },
  { value: 'B', label: 'B - Good', color: 'text-blue-600' },
  { value: 'C', label: 'C - Satisfactory', color: 'text-yellow-600' },
  { value: 'D', label: 'D - Needs Improvement', color: 'text-red-600' }
];

export default function TeacherCoScholasticPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedTerm, setSelectedTerm] = useState<'Term1' | 'Term2'>('Term1');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [assessmentData, setAssessmentData] = useState<CoScholasticAssessment>({
    student_id: '',
    term: 'Term1',
    academic_year: '2024-25',
    status: 'draft'
  });

  // Fetch school details to ensure CBSE board
  const { data: school } = useQuery({
    queryKey: ['school-details', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, board_type, academic_year')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Fetch sections where this teacher is the class teacher
  const { data: classTeacherSections = [] } = useQuery({
    queryKey: ['class-teacher-sections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('sections')
        .select('id, grade, section')
        .eq('class_teacher', user.id)
        .eq('school_id', user?.school_id!)
        .order('grade, section');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch students for class teacher's sections
  const { data: students = [] } = useQuery({
    queryKey: ['class-students', classTeacherSections],
    queryFn: async () => {
      if (classTeacherSections.length === 0) return [];
      
      const sectionIds = classTeacherSections.map(s => s.id);
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section')
        .in('section_id', sectionIds)
        .order('full_name');
      
      if (error) throw error;
      return data as Student[];
    },
    enabled: classTeacherSections.length > 0,
  });

  // Fetch existing assessments for current selection
  const { data: existingAssessments = [] } = useQuery({
    queryKey: ['co-scholastic-assessments', selectedTerm, user?.school_id],
    queryFn: async () => {
      if (students.length === 0) return [];
      
      const studentIds = students.map(s => s.id);
      const { data, error } = await supabase
        .from('co_scholastic_assessments')
        .select('*')
        .in('student_id', studentIds)
        .eq('term', selectedTerm)
        .eq('academic_year', school?.academic_year)
        .eq('school_id', user?.school_id!);
      
      if (error) throw error;
      return data as CoScholasticAssessment[];
    },
    enabled: students.length > 0 && !!school?.academic_year,
  });

  // Save assessment mutation
  const saveAssessmentMutation = useMutation({
    mutationFn: async (data: CoScholasticAssessment) => {
      // Transform the data to match database schema
      const transformedData: CoScholasticAssessment = {
        ...data,
        school_id: user?.school_id || '',
        academic_year: school?.academic_year || '2024-25',
        updated_by: user?.id,
        teacher_id: user?.id,
        updated_at: new Date().toISOString()
      };

      // Extract just the grade value (A, B, C, D) from the full grade text
      const gradeFields = [
        'oral_expression', 'handwriting', 'general_knowledge', 'activity_sports',
        'towards_teachers', 'towards_students', 'towards_school',
        'punctuality', 'initiative', 'confidence', 'neatness'
      ];

      gradeFields.forEach(field => {
        if (transformedData[field]) {
          transformedData[field] = transformedData[field]?.split(' - ')[0];
        }
      });

      const { error } = await supabase
        .from('co_scholastic_assessments')
        .upsert(transformedData, {
          onConflict: 'student_id,term,academic_year'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-scholastic-assessments'] });
      toast.success('Assessment saved successfully');
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save assessment: ${error.message}`);
    },
  });

  const handleOpenDialog = (student: Student) => {
    setSelectedStudent(student);
    
    // Load existing assessment if available
    const existing = existingAssessments.find(a => a.student_id === student.id && a.term === selectedTerm);
    
    setAssessmentData({
      ...existing,
      student_id: student.id,
      term: selectedTerm,
      academic_year: school?.academic_year || '2024-25',
      status: existing?.status || 'draft'
    } as CoScholasticAssessment);
    
    setIsDialogOpen(true);
  };

  const handleSaveAssessment = (asDraft: boolean = true) => {
    if (!selectedStudent) return;
    
    // Validate all fields are filled if not saving as draft
    if (!asDraft) {
      const requiredFields = [
        'oral_expression', 'handwriting', 'general_knowledge', 'activity_sports',
        'towards_teachers', 'towards_students', 'towards_school',
        'punctuality', 'initiative', 'confidence', 'neatness'
      ];
      
      const missingFields = requiredFields.filter(field => 
        !assessmentData[field as keyof CoScholasticAssessment]
      );
      
      if (missingFields.length > 0) {
        toast.error('Please fill in all assessment fields before completing');
        return;
      }
    }
    
    saveAssessmentMutation.mutate({
      ...assessmentData,
      status: asDraft ? 'draft' : 'completed'
    });
  };

  const getAssessmentStatus = (studentId: string) => {
    const assessment = existingAssessments.find(a => a.student_id === studentId && a.term === selectedTerm);
    return assessment?.status || 'pending';
  };

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Only show for CBSE schools
  if (school && school.board_type !== 'CBSE') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              CBSE Schools Only
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Co-Scholastic assessments are only available for CBSE schools.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if not a class teacher
  if (classTeacherSections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Class Teachers Only
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Co-Scholastic assessments can only be entered by class teachers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="h-8 w-8 text-purple-600" />
            Co-Scholastic Assessments
          </h1>
          <p className="text-gray-600 mt-2">
            Evaluate students' attitude, values, and personal qualities for CBSE report cards
          </p>
        </div>
        <Badge className="bg-purple-100 text-purple-800 text-lg px-4 py-2">
          CBSE Assessment Portal
        </Badge>
      </div>

      {/* Status Alerts */}
      {existingAssessments.length > 0 && (
        <div className="space-y-4 mb-6">
          <Alert variant="default" className="bg-primary/10 border-primary/20">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-primary" />
              <AlertDescription className="text-primary">
                {existingAssessments.filter(a => a.status === 'completed').length} assessments completed
              </AlertDescription>
            </div>
          </Alert>
          <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/20">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
              <AlertDescription className="text-yellow-600">
                {existingAssessments.filter(a => a.status === 'draft').length} assessments in draft
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      {/* Term Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Term</CardTitle>
          <CardDescription>
            Choose the term to assess students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTerm} onValueChange={(value) => setSelectedTerm(value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Term1">Term 1</SelectItem>
              <SelectItem value="Term2">Term 2</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                My Class Students
              </CardTitle>
              <CardDescription>
                Click on a student to enter {selectedTerm} co-scholastic assessment
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => {
              const status = getAssessmentStatus(student.id);
              return (
                <div
                  key={student.id}
                  className="p-4 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                  onClick={() => handleOpenDialog(student)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{student.full_name}</h3>
                    {status === 'completed' ? (
                      <Badge variant="default" className="bg-green-500 text-white">
                        Completed
                      </Badge>
                    ) : status === 'draft' ? (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/20">
                        Draft
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Admission No: {student.admission_no}
                  </p>
                  <p className="text-sm text-gray-600">
                    Grade {student.grade} - Section {student.section}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Co-Scholastic Assessment - {selectedStudent?.full_name}
            </DialogTitle>
            <DialogDescription>
              Evaluate the student's co-scholastic activities, attitude, and personal qualities for {selectedTerm}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Co-Scholastic Activities */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Co-Scholastic Activities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'oral_expression', label: 'Oral Expression' },
                  { key: 'handwriting', label: 'Handwriting' },
                  { key: 'general_knowledge', label: 'General Knowledge' },
                  { key: 'activity_sports', label: 'Activity/Sports' }
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Select 
                      value={assessmentData[key as keyof CoScholasticAssessment] || ''} 
                      onValueChange={(value) => setAssessmentData(prev => ({ ...prev, [key]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Attitude and Values */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                Attitude and Values
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'towards_teachers', label: 'Towards Teachers' },
                  { key: 'towards_students', label: 'Towards Students' },
                  { key: 'towards_school', label: 'Towards School' }
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Select 
                      value={assessmentData[key as keyof CoScholasticAssessment] || ''} 
                      onValueChange={(value) => setAssessmentData(prev => ({ ...prev, [key]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Personal Qualities */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5" />
                Personal Qualities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'punctuality', label: 'Punctuality' },
                  { key: 'initiative', label: 'Initiative' },
                  { key: 'confidence', label: 'Confidence' },
                  { key: 'neatness', label: 'Neatness' }
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Select 
                      value={assessmentData[key as keyof CoScholasticAssessment] || ''} 
                      onValueChange={(value) => setAssessmentData(prev => ({ ...prev, [key]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Remarks */}
            <div className="space-y-2">
              <Label>Teacher's Remarks</Label>
              <Textarea
                placeholder="Enter overall remarks about the student's performance and behavior..."
                value={assessmentData.teacher_remarks || ''}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, teacher_remarks: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSaveAssessment(true)}
                className="text-foreground"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                variant="default"
                onClick={() => handleSaveAssessment(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Assessment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 