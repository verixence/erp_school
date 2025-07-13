'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Calendar, 
  Clock, 
  Users, 
  ArrowLeft,
  Plus,
  Eye,
  Edit,
  FileText,
  CheckCircle,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface Exam {
  id: string;
  exam_name: string;
  subject: string;
  section: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  venue: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  max_marks: number;
  instructions?: string;
  created_at: string;
}

// Helper function to determine exam status
const getExamStatus = (exam: any): 'scheduled' | 'ongoing' | 'completed' | 'cancelled' => {
  const examDate = new Date(exam.exam_date);
  const today = new Date();
  const examGroup = exam.exam_groups;
  
  if (!examGroup?.is_published) return 'scheduled';
  
  if (examDate < today) return 'completed';
  if (examDate.toDateString() === today.toDateString()) return 'ongoing';
  return 'scheduled';
};

export default function TeacherExamsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch exams for this teacher
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['teacher-exams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch all exams for the school (we'll filter based on teacher assignment later)
      const { data: examData, error } = await supabase
        .from('exam_papers')
        .select(`
          id,
          subject,
          section,
          exam_date,
          exam_time,
          duration_minutes,
          venue,
          max_marks,
          instructions,
          created_at,
          teacher_id,
          teachers!inner(
            id,
            user_id
          ),
          exam_groups(
            name,
            exam_type,
            start_date,
            end_date,
            is_published
          )
        `)
        .eq('school_id', user.school_id)
        .eq('teachers.user_id', user.id)
        .order('exam_date', { ascending: true });

      if (error) throw error;

      // Transform exam data (already filtered by the query)
      const filteredExams = examData?.map((exam: any) => ({
        id: exam.id,
        exam_name: exam.exam_groups?.name || exam.subject,
        subject: exam.subject,
        section: exam.section,
        date: exam.exam_date,
        start_time: exam.exam_time,
        duration_minutes: exam.duration_minutes,
        venue: exam.venue || 'TBA',
        status: getExamStatus(exam),
        max_marks: exam.max_marks,
        instructions: exam.instructions,
        created_at: exam.created_at
      })) || [];

      return filteredExams as Exam[];
    },
    enabled: !!user?.id,
  });

  const filteredExams = exams.filter(exam => {
    if (statusFilter === 'all') return true;
    return exam.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ongoing': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'ongoing': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getExamStats = () => {
    const total = exams.length;
    const scheduled = exams.filter(e => e.status === 'scheduled').length;
    const completed = exams.filter(e => e.status === 'completed').length;
    const ongoing = exams.filter(e => e.status === 'ongoing').length;

    return { total, scheduled, completed, ongoing };
  };

  const stats = getExamStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/teacher"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <GraduationCap className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Exam Management</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Total Exams</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold">{stats.scheduled}</div>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold">{stats.ongoing}</div>
                    <p className="text-xs text-muted-foreground">Ongoing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold">{stats.completed}</div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Exams List */}
        {filteredExams.length > 0 ? (
          <div className="space-y-4">
            {filteredExams.map((exam, index) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium">{exam.exam_name}</h3>
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(exam.status)}
                          >
                            {getStatusIcon(exam.status)}
                            <span className="ml-1 capitalize">{exam.status}</span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {exam.subject} • {exam.section}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {format(new Date(exam.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {exam.start_time ? format(new Date(`2000-01-01T${exam.start_time}`), 'hh:mm a') : 'TBA'} ({exam.duration_minutes} mins)
                          </div>
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            {exam.max_marks} marks
                          </div>
                        </div>

                        {exam.venue && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Venue:</strong> {exam.venue}
                          </p>
                        )}

                        {exam.instructions && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Instructions:</strong> {exam.instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        
                        {exam.status === 'completed' && (
                          <Link href={`/teacher/marks/${exam.id}`}>
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4 mr-2" />
                              Enter Marks
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {statusFilter === 'all' ? 'No Exams Found' : `No ${statusFilter} Exams`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'No exams are scheduled for your sections yet.'
                    : `There are no ${statusFilter} exams for your sections.`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 