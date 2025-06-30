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
  Eye
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

interface ReportCard {
  id: string;
  student_name: string;
  student_id: string;
  exam_name: string;
  section: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
  rank: number;
  attendance: number;
  generated_at: string;
  status: 'draft' | 'published' | 'distributed';
}

// Mock data for report cards
const mockReportCards: ReportCard[] = [
  {
    id: '1',
    student_name: 'Alice Johnson',
    student_id: 'STU001',
    exam_name: 'First Term Exam 2024',
    section: 'Class 10-A',
    total_marks: 500,
    obtained_marks: 425,
    percentage: 85,
    grade: 'A',
    rank: 3,
    attendance: 95,
    generated_at: '2024-01-15',
    status: 'published'
  },
  {
    id: '2',
    student_name: 'Bob Smith',
    student_id: 'STU002',
    exam_name: 'First Term Exam 2024',
    section: 'Class 10-A',
    total_marks: 500,
    obtained_marks: 380,
    percentage: 76,
    grade: 'B+',
    rank: 8,
    attendance: 92,
    generated_at: '2024-01-15',
    status: 'published'
  },
  {
    id: '3',
    student_name: 'Carol Davis',
    student_id: 'STU003',
    exam_name: 'Monthly Test October',
    section: 'Class 9-B',
    total_marks: 300,
    obtained_marks: 285,
    percentage: 95,
    grade: 'A+',
    rank: 1,
    attendance: 98,
    generated_at: '2024-01-10',
    status: 'distributed'
  }
];

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

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-blue-100 text-blue-800',
  distributed: 'bg-green-100 text-green-800'
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const filteredReports = mockReportCards.filter(report => {
    const matchesSearch = report.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'all' || report.section === selectedSection;
    const matchesExam = selectedExam === 'all' || report.exam_name === selectedExam;
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
    // Implementation for generating report cards
    console.log('Generating report cards...');
    setShowGenerateModal(false);
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
                <Label>Select Exam</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam1">First Term Exam 2024</SelectItem>
                    <SelectItem value="exam2">Monthly Test October</SelectItem>
                    <SelectItem value="exam3">Half Yearly Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Select Section(s)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="10a">Class 10-A</SelectItem>
                    <SelectItem value="10b">Class 10-B</SelectItem>
                    <SelectItem value="9a">Class 9-A</SelectItem>
                    <SelectItem value="9b">Class 9-B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateReports}>
                  Generate Reports
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
                <p className="text-2xl font-bold text-gray-900">{mockReportCards.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">85.3%</p>
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
                <p className="text-2xl font-bold text-gray-900">12</p>
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
                <p className="text-2xl font-bold text-gray-900">{mockReportCards.filter(r => r.status === 'distributed').length}</p>
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
                  <SelectItem value="Class 10-A">Class 10-A</SelectItem>
                  <SelectItem value="Class 10-B">Class 10-B</SelectItem>
                  <SelectItem value="Class 9-A">Class 9-A</SelectItem>
                  <SelectItem value="Class 9-B">Class 9-B</SelectItem>
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
                  <SelectItem value="First Term Exam 2024">First Term Exam 2024</SelectItem>
                  <SelectItem value="Monthly Test October">Monthly Test October</SelectItem>
                  <SelectItem value="Half Yearly Exam">Half Yearly Exam</SelectItem>
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
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Report Cards List */}
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
                      <h3 className="text-lg font-semibold text-gray-900">{report.student_name}</h3>
                      <p className="text-sm text-gray-500">ID: {report.student_id} • {report.section}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge className={statusColors[report.status]}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </Badge>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Exam</p>
                    <p className="text-sm font-medium text-gray-900">{report.exam_name}</p>
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
                    <Badge className={gradeColors[report.grade as keyof typeof gradeColors]}>
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
                    <span>Attendance: {report.attendance}%</span>
                    <span>Generated: {formatDate(report.generated_at)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No report cards found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your filters or generate new report cards.</p>
        </motion.div>
      )}
    </div>
  );
} 