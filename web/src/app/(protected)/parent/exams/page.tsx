'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useChildren, useChildExams, useChildExamGroups } from '@/hooks/use-parent';
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
  const { data: examGroups = [], isLoading: examGroupsLoading } = useChildExamGroups(selectedChild);
  const { data: examPapers = [] } = useChildExams(selectedChild);
  
  // Set default selected child when children load
  if (children && children.length > 0 && !selectedChild) {
    setSelectedChild(children[0].id);
  }

  const currentChild = children?.find(child => child.id === selectedChild);
  const currentSection = currentChild?.sections?.section;
  const currentGrade = currentChild?.sections?.grade;
  
  // Filter exams by selected exam group if one is selected
  const relevantExamPapers = selectedExamGroup 
    ? examPapers.filter(paper => paper.exam_groups?.id === selectedExamGroup)
    : examPapers;

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
              {examGroups.map((examGroup: any) => (
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
                        {examGroup.exam_type || 'Exam Group'}
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
      {relevantExamPapers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Exam Schedule {selectedExamGroup ? `- ${examGroups.find(eg => eg.id === selectedExamGroup)?.name}` : '(All Exams)'}
              </CardTitle>
              {selectedExamGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedExamGroup('')}
                  className="flex items-center gap-1"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relevantExamPapers.map((paper: any) => (
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