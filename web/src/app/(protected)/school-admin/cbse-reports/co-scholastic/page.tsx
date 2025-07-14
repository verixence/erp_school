'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Save, 
  Search, 
  BookOpen,
  Star,
  Award,
  Target,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';

interface CoScholasticAssessment {
  id?: string;
  student_id: string;
  term: 'Term1' | 'Term2';
  academic_year: string;
  
  // Co-Scholastic Activities
  oral_grade?: string;
  handwriting_grade?: string;
  general_knowledge_grade?: string;
  activity_grade?: string;
  
  // Attitude and Values
  attitude_teachers?: string;
  attitude_students?: string;
  attitude_school?: string;
  
  // Personal Qualities
  punctuality?: string;
  initiative?: string;
  confidence?: string;
  neatness?: string;
  
  teacher_remarks?: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  section: string;
  grade: string;
}

const GRADE_OPTIONS = [
  { value: 'A', label: 'A - Excellent', color: 'text-green-600' },
  { value: 'B', label: 'B - Good', color: 'text-blue-600' },
  { value: 'C', label: 'C - Satisfactory', color: 'text-yellow-600' },
  { value: 'D', label: 'D - Needs Improvement', color: 'text-red-600' }
];

export default function CoScholasticPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<'Term1' | 'Term2'>('Term1');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [assessmentData, setAssessmentData] = useState<CoScholasticAssessment>({
    student_id: '',
    term: 'Term1',
    academic_year: '2024-25'
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

  // Fetch sections
  const { data: sections = [] } = useQuery({
    queryKey: ['school-sections', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('grade, section')
        .eq('school_id', user?.school_id!)
        .order('grade, section');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Get unique grades and sections
  const grades = [...new Set(sections.map(s => s.grade))].sort();
  const sectionsForGrade = sections.filter(s => s.grade === selectedGrade).map(s => s.section);

  // Fetch students for selected grade and section
  const { data: students = [] } = useQuery({
    queryKey: ['students', selectedGrade, selectedSection, user?.school_id],
    queryFn: async () => {
      if (!selectedGrade || !selectedSection) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, full_name, admission_no, section, grade,
          sections!inner(school_id)
        `)
        .eq('grade', selectedGrade)
        .eq('section', selectedSection)
        .eq('sections.school_id', user?.school_id!)
        .order('full_name');
      
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedGrade && !!selectedSection && !!user?.school_id,
  });

  // Fetch existing assessments for current selection
  const { data: existingAssessments = [] } = useQuery({
    queryKey: ['co-scholastic-assessments', selectedGrade, selectedSection, selectedTerm, user?.school_id],
    queryFn: async () => {
      if (!selectedGrade || !selectedSection) return [];
      
      const studentIds = students.map(s => s.id);
      if (studentIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('student_coscholastic_assessments')
        .select('*')
        .in('student_id', studentIds)
        .eq('term', selectedTerm)
        .eq('school_id', user?.school_id!);
      
      if (error) {
        console.warn('Co-scholastic assessments table might not exist:', error);
        return [];
      }
      return data as CoScholasticAssessment[];
    },
    enabled: !!selectedGrade && !!selectedSection && students.length > 0,
  });

  // Save assessment mutation
  const saveAssessmentMutation = useMutation({
    mutationFn: async (data: CoScholasticAssessment) => {
      const { error } = await supabase
        .from('student_coscholastic_assessments')
        .upsert({
          ...data,
          school_id: user?.school_id,
          academic_year: school?.academic_year || '2024-25',
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        }, {
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
      academic_year: school?.academic_year || '2024-25'
    } as CoScholasticAssessment);
    
    setIsDialogOpen(true);
  };

  const handleSaveAssessment = () => {
    if (!selectedStudent) return;
    
    saveAssessmentMutation.mutate(assessmentData);
  };

  const getAssessmentStatus = (studentId: string) => {
    const assessment = existingAssessments.find(a => a.student_id === studentId && a.term === selectedTerm);
    return assessment ? 'completed' : 'pending';
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class & Term</CardTitle>
          <CardDescription>
            Choose the grade, section, and term to assess students
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Grade</Label>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Section</Label>
            <Select 
              value={selectedSection} 
              onValueChange={setSelectedSection}
              disabled={!selectedGrade}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sectionsForGrade.map((section) => (
                  <SelectItem key={section} value={section}>
                    Section {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={selectedTerm} onValueChange={(value) => setSelectedTerm(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term1">Term 1</SelectItem>
                <SelectItem value="Term2">Term 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      {selectedGrade && selectedSection && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  Students - Grade {selectedGrade} Section {selectedSection}
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
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground">
                  Select a grade and section to view students
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => {
                  const status = getAssessmentStatus(student.id);
                  return (
                    <Card 
                      key={student.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenDialog(student)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{student.full_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {student.admission_no}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === 'completed' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={status === 'completed' ? 'default' : 'secondary'}
                          className={status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {status === 'completed' ? 'Assessed' : 'Pending'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  { key: 'oral_grade', label: 'Oral Expression' },
                  { key: 'handwriting_grade', label: 'Handwriting' },
                  { key: 'general_knowledge_grade', label: 'General Knowledge' },
                  { key: 'activity_grade', label: 'Activity/Sports' }
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
                  { key: 'attitude_teachers', label: 'Towards Teachers' },
                  { key: 'attitude_students', label: 'Towards Students' },
                  { key: 'attitude_school', label: 'Towards School' }
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

            {/* Save Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAssessment}
                disabled={saveAssessmentMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saveAssessmentMutation.isPending ? 'Saving...' : 'Save Assessment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 