'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Filter,
  Search,
  GraduationCap,
  Calendar,
  Award,
  TrendingUp,
  Users,
  BarChart3,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  Send,
  PrinterIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { 
  useReportCards,
  useGenerateReportCards,
  useUpdateReportCardStatus,
  useExamGroups,
  useSchoolSections,
  useSchoolInfo,
  type ReportCard
} from '@erp/common';
import { toast } from 'sonner';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
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

export default function ReportsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedExamGroup, setSelectedExamGroup] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  // API hooks
  const { data: reportCards = [], isLoading, error } = useReportCards(user?.school_id || undefined);
  const { data: examGroups = [] } = useExamGroups(user?.school_id || undefined);
  const { data: sections = [] } = useSchoolSections(user?.school_id || undefined);
  const { data: schoolInfo } = useSchoolInfo(user?.school_id || undefined);
  
  const generateReportCardsMutation = useGenerateReportCards();
  const updateReportCardStatusMutation = useUpdateReportCardStatus();

  const filteredReports = reportCards.filter(report => {
    const matchesSearch = 
      report.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.student?.admission_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'all' || report.student?.section === selectedSection;
    const matchesExam = selectedExam === 'all' || report.exam_group?.name === selectedExam;
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    
    return matchesSearch && matchesSection && matchesExam && matchesStatus;
  });

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleGenerateReports = async () => {
    if (!selectedExamGroup) {
      toast.error('Please select an exam group');
      return;
    }

    try {
      await generateReportCardsMutation.mutateAsync({
        examGroupId: selectedExamGroup,
        sectionIds: selectedSections.length > 0 ? selectedSections : undefined
      });
      
      toast.success('Report cards generated successfully!');
      setShowGenerateModal(false);
      setSelectedExamGroup('');
      setSelectedSections([]);
    } catch (error) {
      console.error('Error generating report cards:', error);
      toast.error('Failed to generate report cards. Please try again.');
    }
  };

  const handleUpdateStatus = async (reportId: string, status: 'draft' | 'published' | 'distributed') => {
    try {
      await updateReportCardStatusMutation.mutateAsync({ id: reportId, status });
      toast.success(`Report card ${status} successfully!`);
    } catch (error) {
      console.error('Error updating report card status:', error);
      toast.error('Failed to update report card status. Please try again.');
    }
  };

  const handleDownloadReport = (report: ReportCard) => {
    // Create downloadable report card
    const reportHTML = generateReportCardHTML(report, schoolInfo);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const generateReportCardHTML = (report: ReportCard, school: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Card - ${report.student?.full_name}</title>
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
            .marks-summary { display: flex; justify-content: space-around; margin: 20px 0; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 20px; font-weight: bold; color: #333; }
            .summary-label { font-size: 12px; color: #666; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #ddd; }
            .signature { text-align: center; width: 200px; }
            .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${school?.logo_url ? `<img src="${school.logo_url}" alt="School Logo" class="logo">` : ''}
            <div class="school-name">${school?.name || 'School Name'}</div>
            <div class="report-title">Academic Report Card</div>
            <div>${report.exam_group?.name} - ${report.exam_group?.exam_type?.replace('_', ' ').toUpperCase()}</div>
          </div>
          
          <div class="student-info">
            <div class="info-section">
              <div class="info-label">Student Name</div>
              <div class="info-value">${report.student?.full_name}</div>
              <div class="info-label">Admission No.</div>
              <div class="info-value">${report.student?.admission_no || 'N/A'}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Class/Section</div>
              <div class="info-value">${report.student?.section || 'N/A'}</div>
              <div class="info-label">Roll No.</div>
              <div class="info-value">${report.rank}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Academic Year</div>
              <div class="info-value">2024-25</div>
              <div class="info-label">Report Generated</div>
              <div class="info-value">${formatDate(report.generated_at)}</div>
            </div>
          </div>
          
          <div class="grade-info">
            <div class="grade">${report.grade}</div>
            <div class="percentage">${report.percentage}%</div>
            <div>Overall Performance</div>
          </div>
          
          <div class="marks-summary">
            <div class="summary-item">
              <div class="summary-value">${report.total_marks}</div>
              <div class="summary-label">Total Marks</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${report.obtained_marks}</div>
              <div class="summary-label">Marks Obtained</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${report.rank}</div>
              <div class="summary-label">Class Rank</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-line">Class Teacher</div>
            </div>
            <div class="signature">
              <div class="signature-line">Principal</div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
            <p>${school?.address || 'School Address'} | ${school?.phone || 'Phone'} | ${school?.email || 'Email'}</p>
          </div>
        </body>
      </html>
    `;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSection('all');
    setSelectedExam('all');
    setSelectedStatus('all');
  };

  // Calculate statistics
  const totalReports = reportCards.length;
  const avgPerformance = reportCards.length > 0 
    ? Math.round(reportCards.reduce((sum, report) => sum + report.percentage, 0) / reportCards.length * 10) / 10 
    : 0;
  const topPerformers = reportCards.filter(report => report.percentage >= 90).length;
  const distributedCount = reportCards.filter(report => report.status === 'distributed').length;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading report cards</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Cards</h1>
          <p className="text-gray-600 mt-1">Generate and manage student report cards</p>
        </div>
        
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Generate Reports
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Report Cards</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Exam Group *</Label>
                <Select value={selectedExamGroup} onValueChange={setSelectedExamGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose exam group" />
                  </SelectTrigger>
                  <SelectContent>
                    {examGroups.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} - {exam.exam_type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Select Sections (Optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All sections (leave empty for all)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={`${section.grade}-${section.section}`}>
                        Grade {section.grade} - {section.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateReports}
                  disabled={generateReportCardsMutation.isPending}
                >
                  {generateReportCardsMutation.isPending ? 'Generating...' : 'Generate Reports'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-morphism border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{totalReports}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-morphism border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Performance</p>
                <p className="text-2xl font-bold text-gray-900">{avgPerformance}%</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-morphism border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Top Performers</p>
                <p className="text-2xl font-bold text-gray-900">{topPerformers}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-morphism border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Distributed</p>
                <p className="text-2xl font-bold text-gray-900">{distributedCount}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass-morphism border-0 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Student name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={`${section.grade}-${section.section}`}>
                        Grade {section.grade} - {section.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Exam</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {examGroups.map(exam => (
                    <SelectItem key={exam.id} value={exam.name}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="distributed">Distributed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={clearFilters}>
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Report Cards List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <Card className="glass-morphism border-0 hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{report.student?.full_name}</h3>
                        <p className="text-sm text-gray-500">
                          ID: {report.student?.admission_no || 'N/A'} • {report.student?.section || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                                      <Badge className={statusColors[report.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </Badge>
                      
                      <div className="flex items-center space-x-2">
                        {report.status === 'draft' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateStatus(report.id, 'published')}
                            disabled={updateReportCardStatusMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Publish
                          </Button>
                        )}
                        {report.status === 'published' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateStatus(report.id, 'distributed')}
                            disabled={updateReportCardStatusMutation.isPending}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Distribute
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Exam</p>
                      <p className="text-sm font-medium text-gray-900">{report.exam_group?.name || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Marks</p>
                      <p className="text-sm font-medium text-gray-900">
                        {report.obtained_marks}/{report.total_marks}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Percentage</p>
                      <p className={`text-sm font-medium ${getPerformanceColor(report.percentage)}`}>
                        {report.percentage}%
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Grade</p>
                      <Badge className={gradeColors[report.grade as keyof typeof gradeColors] || 'bg-gray-100 text-gray-800'}>
                        {report.grade}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Rank</p>
                      <p className="text-sm font-medium text-gray-900">#{report.rank}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Generated: {formatDate(report.generated_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredReports.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No report cards found</h3>
          <p className="text-gray-500 mb-6">
            {reportCards.length === 0 
              ? 'Generate your first report cards to get started.' 
              : 'Try adjusting your filters or generate new report cards.'
            }
          </p>
          {reportCards.length === 0 && (
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate First Report Cards
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
} 