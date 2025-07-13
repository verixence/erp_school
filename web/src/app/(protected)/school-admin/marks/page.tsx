'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Award, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  BarChart3,
  ChevronRight,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { 
  useSchoolMarks,
  useExamGroups,
  useSchoolExamPapers,
  useMarksSummary,
  useSchoolSections,
  type Mark,
  type ExamPaper
} from '@erp/common';
import { toast } from 'sonner';
import Link from 'next/link';

export default function MarksManagementPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamGroup, setSelectedExamGroup] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // API hooks
  const { data: examGroups = [] } = useExamGroups(user?.school_id || undefined);
  const { data: examPapers = [] } = useSchoolExamPapers(user?.school_id || undefined);
  const { data: marks = [] } = useSchoolMarks(user?.school_id || undefined, selectedExamGroup !== 'all' ? selectedExamGroup : undefined);
  const { data: sections = [] } = useSchoolSections(user?.school_id || undefined);
  const { data: marksSummary } = useMarksSummary(user?.school_id || undefined);

  // Filter marks based on search criteria
  const filteredMarks = useMemo(() => {
    return marks.filter(mark => {
      const matchesSearch = 
        mark.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mark.student?.admission_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mark.exam_paper?.subject?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSection = selectedSection === 'all' || mark.exam_paper?.section === selectedSection;
      const matchesSubject = selectedSubject === 'all' || mark.exam_paper?.subject === selectedSubject;
      
      return matchesSearch && matchesSection && matchesSubject;
    });
  }, [marks, searchTerm, selectedSection, selectedSubject]);

  // Get unique subjects
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(examPapers.map(paper => paper.subject))];
    return uniqueSubjects.sort();
  }, [examPapers]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMarks = filteredMarks.length;
    const absentStudents = filteredMarks.filter(mark => mark.is_absent).length;
    const marksEntered = filteredMarks.filter(mark => mark.marks_obtained !== null && mark.marks_obtained !== undefined).length;
    const pendingMarks = totalMarks - marksEntered - absentStudents;
    
    const validMarks = filteredMarks.filter(mark => 
      mark.marks_obtained !== null && 
      mark.marks_obtained !== undefined && 
      !mark.is_absent
    );
    
    const averageScore = validMarks.length > 0 
      ? validMarks.reduce((sum, mark) => sum + (mark.marks_obtained || 0), 0) / validMarks.length 
      : 0;

    return {
      totalMarks,
      marksEntered,
      pendingMarks,
      absentStudents,
      averageScore: Math.round(averageScore * 10) / 10,
      completionRate: totalMarks > 0 ? Math.round((marksEntered / totalMarks) * 100) : 0
    };
  }, [filteredMarks]);

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

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': 
      case 'A': return 'bg-green-100 text-green-800';
      case 'B+': 
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportMarks = () => {
    const csvData = filteredMarks.map(mark => ({
      'Student Name': mark.student?.full_name || '',
      'Admission No': mark.student?.admission_no || '',
      'Section': mark.exam_paper?.section || '',
      'Subject': mark.exam_paper?.subject || '',
      'Exam': mark.exam_paper?.exam_group?.name || '',
      'Max Marks': mark.exam_paper?.max_marks || '',
      'Marks Obtained': mark.is_absent ? 'AB' : mark.marks_obtained || '',
      'Grade': mark.marks_obtained && mark.exam_paper?.max_marks && !mark.is_absent 
        ? calculateGrade(mark.marks_obtained, mark.exam_paper.max_marks) 
        : (mark.is_absent ? 'AB' : ''),
      'Remarks': mark.remarks || ''
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedExamGroup('all');
    setSelectedSection('all');
    setSelectedSubject('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marks Management</h1>
          <p className="text-gray-600 mt-1">View and manage marks from all examinations</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportMarks}>
            <Download className="w-4 h-4 mr-2" />
            Export Marks
          </Button>

        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        <Card className="glass-morphism border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Marks Entries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMarks}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Marks Entered</p>
                <p className="text-2xl font-bold text-green-600">{stats.marksEntered}</p>
                <p className="text-xs text-gray-500">{stats.completionRate}% Complete</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Marks</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingMarks}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absent Students</p>
                <p className="text-2xl font-bold text-gray-600">{stats.absentStudents}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-purple-600">{stats.averageScore}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-morphism border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Student name, admission no, subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Exam Group</Label>
                <Select value={selectedExamGroup} onValueChange={setSelectedExamGroup}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exam Groups</SelectItem>
                    {examGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={`Grade ${section.grade} ${section.section}`}>
                        Grade {section.grade} {section.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Marks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-morphism border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Marks Overview</span>
                <Badge variant="outline">{filteredMarks.length} entries</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMarks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead className="text-center">Max Marks</TableHead>
                      <TableHead className="text-center">Marks Obtained</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMarks.map((mark, index) => {
                      const grade = mark.marks_obtained && mark.exam_paper?.max_marks && !mark.is_absent 
                        ? calculateGrade(mark.marks_obtained, mark.exam_paper.max_marks) 
                        : (mark.is_absent ? 'AB' : '');
                      
                      return (
                        <TableRow key={mark.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{mark.student?.full_name}</div>
                              <div className="text-sm text-gray-500">{mark.student?.admission_no}</div>
                            </div>
                          </TableCell>
                          <TableCell>{mark.exam_paper?.section}</TableCell>
                          <TableCell>{mark.exam_paper?.subject}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{mark.exam_paper?.exam_group?.name}</div>
                              <div className="text-sm text-gray-500 capitalize">
                                {mark.exam_paper?.exam_group?.exam_type?.replace('_', ' ')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{mark.exam_paper?.max_marks}</TableCell>
                          <TableCell className="text-center">
                            {mark.is_absent ? 'AB' : mark.marks_obtained || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {grade && (
                              <Badge className={getGradeColor(grade)}>
                                {grade}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {mark.is_absent ? (
                              <Badge className="bg-gray-100 text-gray-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Absent
                              </Badge>
                            ) : mark.marks_obtained !== null && mark.marks_obtained !== undefined ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Entered
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {mark.remarks || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No marks found</h3>
                <p className="text-gray-500">
                  No marks entries match your current filters. Try adjusting your search criteria.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 