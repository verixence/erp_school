'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useChildren } from '@/hooks/use-parent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Download,
  Users,
  BookOpen,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Eye
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
  monthly: 'Monthly Test',
  quarterly: 'Quarterly Exam',
  half_yearly: 'Half Yearly Exam',
  annual: 'Annual Exam',
  unit_test: 'Unit Test',
  other: 'Other'
};

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-blue-100 text-blue-800',
  distributed: 'bg-green-100 text-green-800'
};

export default function ParentExamsPage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>('');
  
  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);
  const { data: examGroups = [], isLoading: examGroupsLoading } = useExamGroups(user?.school_id || undefined);
  const { data: schoolInfo } = useSchoolInfo(user?.school_id || undefined);
  
  // Set default selected child when children load
  if (children && children.length > 0 && !selectedChild) {
    setSelectedChild(children[0].id);
  }

  const currentChild = children?.find(child => child.id === selectedChild);
  const currentSection = currentChild?.sections?.section;

  // Get exam papers for current child's section
  const { data: examPapers = [] } = useExamPapers(selectedExamGroup || undefined);
  const relevantExamPapers = examPapers.filter(paper => 
    currentSection && paper.section === currentSection
  );

  // Get report card for selected child and exam group
  const { data: reportCard } = useStudentReportCard(
    selectedChild || '',
    selectedExamGroup || ''
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const handleDownloadReport = () => {
    if (!reportCard || !currentChild) return;
    
    const reportHTML = generateReportCardHTML(reportCard, currentChild, schoolInfo);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const generateReportCardHTML = (report: any, child: any, school: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Card - ${child.full_name}</title>
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
              <div class="info-value">${child.full_name}</div>
              <div class="info-label">Admission No.</div>
              <div class="info-value">${child.admission_no || 'N/A'}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Class/Section</div>
              <div class="info-value">${child.sections?.grade} - ${child.sections?.section}</div>
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

  if (childrenLoading || examGroupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Schedules & Reports</h1>
          <p className="text-gray-600 mt-2">
            View exam schedules and download report cards for your children.
          </p>
        </div>
        
        {/* Child Selector */}
        {children && children.length > 0 && (
          <div className="min-w-48">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.full_name} - Grade {child.sections?.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Current Child Info */}
      {currentChild && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {currentChild.full_name} - Grade {currentChild.sections?.grade}, Section {currentChild.sections?.section}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Exam Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Available Exams
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
              {relevantExamPapers.map((paper: ExamPaper) => (
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
                  <div className="text-right text-sm">
                    <div>Max Marks: {paper.max_marks}</div>
                    <div>Duration: {paper.duration_minutes} min</div>
                  </div>
                </div>
              ))}
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
              Report Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Overall Grade: {reportCard.grade}</h3>
                  <p className="text-gray-600">Percentage: {reportCard.percentage}%</p>
                </div>
                <Badge className={statusColors[reportCard.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                  {reportCard.status.charAt(0).toUpperCase() + reportCard.status.slice(1)}
                </Badge>
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
                Download Report Card
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Children State */}
      {!childrenLoading && (!children || children.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-600">
              No children are currently linked to your account.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 