'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Download,
  BookOpen,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Eye,
  TrendingUp
} from 'lucide-react';
import { 
  useExamGroups,
  useExamPapers,
  useStudentReportCard,
  useSchoolInfo,
  type ExamGroup,
  type ExamPaper
} from '@erp/common';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const examTypeLabels = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half Yearly',
  annual: 'Annual',
  unit_test: 'Unit Test',
  other: 'Other',
  cbse_fa1: 'FA1',
  cbse_fa2: 'FA2',
  cbse_fa3: 'FA3',
  cbse_fa4: 'FA4',
  cbse_sa1: 'SA1',
  cbse_sa2: 'SA2',
  state_fa1: 'FA1',
  state_fa2: 'FA2',
  state_fa3: 'FA3',
  state_fa4: 'FA4',
  state_sa1: 'SA1',
  state_sa2: 'SA2',
  state_sa3: 'SA3'
} as const;

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-blue-100 text-blue-800',
  distributed: 'bg-green-100 text-green-800'
};

const gradeColors = {
  'A+': 'bg-green-100 text-green-800',
  'A': 'bg-green-100 text-green-700',
  'B+': 'bg-blue-100 text-blue-800',
  'B': 'bg-blue-100 text-blue-700',
  'C+': 'bg-yellow-100 text-yellow-800',
  'C': 'bg-yellow-100 text-yellow-700',
  'D': 'bg-orange-100 text-orange-800',
  'F': 'bg-red-100 text-red-800'
};

export default function StudentExamsPage() {
  const { user } = useAuth();
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>('');
  
  const { data: examGroups = [], isLoading: examGroupsLoading } = useExamGroups(user?.school_id || undefined);
  const { data: schoolInfo } = useSchoolInfo(user?.school_id || undefined);
  
  // Get exam papers for selected exam group
  const { data: examPapers = [] } = useExamPapers(selectedExamGroup || undefined);
  const relevantExamPapers = examPapers;

  // Get report card for selected exam group
  const { data: reportCard } = useStudentReportCard(
    user?.id || '',
    selectedExamGroup || ''
  );

  const formatDate = (dateString: string) => {
    // Parse the date as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Not scheduled';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeStatus = (examDate: string, examTime: string) => {
    if (!examDate || !examTime) return 'pending';
    
    const now = new Date();
    const examDateTime = new Date(`${examDate}T${examTime}`);
    
    if (examDateTime > now) return 'upcoming';
    if (examDateTime < now) return 'completed';
    return 'ongoing';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleDownloadReport = () => {
    if (!reportCard || !user) return;
    
    const reportHTML = generateReportCardHTML(reportCard, user, schoolInfo);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const generateReportCardHTML = (report: any, student: any, school: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Card - ${student.full_name || student.first_name + ' ' + student.last_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: white; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { width: 80px; height: 80px; margin: 0 auto 10px; }
            .school-name { font-size: 24px; font-weight: bold; margin: 10px 0; }
            .report-title { font-size: 18px; color: #666; margin: 5px 0; }
            .student-info { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .info-section { flex: 1; }
            .info-label { font-weight: bold; color: #666; font-size: 12px; }
            .info-value { font-size: 14px; margin-bottom: 10px; }
            .grade-info { text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; }
            .grade { font-size: 48px; font-weight: bold; margin: 0; }
            .percentage { font-size: 24px; margin: 10px 0; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            ${school?.logo_url ? `<img src="${school.logo_url}" alt="School Logo" class="logo">` : ''}
            <div class="school-name">${school?.name || 'School Name'}</div>
            <div class="report-title">Academic Report Card</div>
          </div>
          
          <div class="student-info">
            <div class="info-section">
              <div class="info-label">Student Name</div>
              <div class="info-value">${student.full_name || student.first_name + ' ' + student.last_name}</div>
              <div class="info-label">Section</div>
              <div class="info-value">${student.section || 'N/A'}</div>
            </div>
          </div>
          
          <div class="grade-info">
            <div class="grade">${report.grade}</div>
            <div class="percentage">${report.percentage}%</div>
            <div>Overall Performance</div>
          </div>
          
          <div class="footer">
            <div class="signature">
              <div style="border-top: 1px solid #000; margin-top: 50px; padding-top: 5px;">Principal</div>
            </div>
            <div class="signature">
              <div style="border-top: 1px solid #000; margin-top: 50px; padding-top: 5px;">Class Teacher</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  if (examGroupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Get upcoming exams
  const upcomingExams = relevantExamPapers.filter(paper => {
    if (!paper.exam_date || !paper.exam_time) return false;
    const examDateTime = new Date(`${paper.exam_date}T${paper.exam_time}`);
    return examDateTime > new Date();
  }).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Exams & Reports</h1>
        <p className="text-gray-600 mt-2">
          View your exam schedules and download your report cards.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{examGroups.length}</div>
            <p className="text-xs text-muted-foreground">This academic year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingExams.length}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Available</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {examGroups.filter(eg => eg.is_published).length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for download</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingExams.map((paper: ExamPaper) => (
                <motion.div
                  key={paper.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-medium">{paper.subject}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(paper.exam_date!)} at {formatTime(paper.exam_time!)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">Max: {paper.max_marks}</div>
                    <div className="text-gray-600">{paper.duration_minutes} min</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Exams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {examGroups.length > 0 ? (
            <div className="space-y-4">
              {examGroups.map((examGroup: ExamGroup) => (
                <motion.div
                  key={examGroup.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{examGroup.name}</h3>
                      <p className="text-gray-600 text-sm">{examGroup.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {examTypeLabels[examGroup.exam_type]}
                      </Badge>
                      {examGroup.is_published && (
                        <Badge className="bg-green-100 text-green-800">Published</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>{formatDate(examGroup.start_date)} - {formatDate(examGroup.end_date)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedExamGroup(examGroup.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View Schedule
                    </Button>
                    
                    {reportCard && selectedExamGroup === examGroup.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadReport}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exams Scheduled</h3>
              <p className="text-gray-600">No exams have been scheduled yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Schedule Details */}
      {selectedExamGroup && relevantExamPapers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Exam Schedule - {examGroups.find(eg => eg.id === selectedExamGroup)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relevantExamPapers.map((paper: ExamPaper) => {
                const status = getTimeStatus(paper.exam_date!, paper.exam_time!);
                
                return (
                  <div key={paper.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{paper.subject}</div>
                        <div className="text-sm text-gray-600">
                          {paper.exam_date ? formatDate(paper.exam_date) : 'Date not set'} • 
                          {paper.exam_time ? formatTime(paper.exam_time) : 'Time not set'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(status)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      <div className="text-right text-sm">
                        <div>Max: {paper.max_marks}</div>
                        <div>{paper.duration_minutes} min</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Card Section */}
      {selectedExamGroup && reportCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Report Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Grade: {reportCard.grade}</h3>
                  <p className="text-gray-600">Percentage: {reportCard.percentage}%</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={gradeColors[reportCard.grade as keyof typeof gradeColors]}>
                    {reportCard.grade}
                  </Badge>
                                  <Badge className={statusColors[reportCard.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                  {reportCard.status.charAt(0).toUpperCase() + reportCard.status.slice(1)}
                </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{reportCard.obtained_marks}</div>
                  <div className="text-sm text-gray-600">Marks Obtained</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{reportCard.total_marks}</div>
                  <div className="text-sm text-gray-600">Total Marks</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-600">#{reportCard.rank}</div>
                  <div className="text-sm text-gray-600">Class Rank</div>
                </div>
              </div>
              
              <Button onClick={handleDownloadReport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download My Report Card
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 