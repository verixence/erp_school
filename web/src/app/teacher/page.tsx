'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  Calendar,
  ClipboardList,
  MessageSquare,
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  PenTool,
  Eye,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { 
  useExamGroups,
  useExamPapers,
  useMarks,
  useReportCards,
  useTeacherSections,
  useSectionStudents,
  type ExamGroup,
  type ExamPaper 
} from '@erp/common';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

import Link from 'next/link';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [selectedExamGroup, setSelectedExamGroup] = useState<string | null>(null);

  // Fetch teacher's assigned sections
  const { data: teacherSections = [] } = useTeacherSections(user?.id);

  // Get total students count across all sections
  const { data: totalStudentsData } = useQuery({
    queryKey: ['teacher-total-students', user?.id],
    queryFn: async () => {
      if (!user?.id || teacherSections.length === 0) return 0;
      
      const sectionIds = teacherSections.map(s => s.id);
      const { data, error } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .in('section_id', sectionIds);
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id && teacherSections.length > 0,
  });

  // Get class teacher sections (sections where this teacher is the class teacher)
  const classTeacherSections = teacherSections.filter(section => section.class_teacher === user?.id);

  // API hooks
  const { data: examGroups = [] } = useExamGroups(user?.school_id || undefined);
  const { data: examPapers = [] } = useExamPapers(selectedExamGroup || undefined);
  const { data: reportCards = [] } = useReportCards(user?.school_id || undefined);

  // Get recent exam groups (published ones)
  const recentExamGroups = examGroups
    .filter(group => group.is_published)
    .slice(0, 3);

  // Get pending marks entry (exam papers that need marks)
  const pendingMarksPapers = examPapers.filter(paper => {
    // This would need to be enhanced to check if marks are actually entered
    return paper.exam_date && new Date(paper.exam_date) <= new Date();
  }).slice(0, 5);

  // Calculate statistics
  const totalStudents = totalStudentsData || 0;
  const completedExams = examPapers.filter(paper => 
    paper.exam_date && new Date(paper.exam_date) <= new Date()
  ).length;
  const pendingReports = reportCards.filter(report => report.status === 'draft').length;

  const stats = [
    {
      title: "My Students",
      value: totalStudents,
      description: `Students across ${teacherSections.length} sections`,
      icon: Users,
      color: "bg-blue-500",
      trend: "+12%"
    },
    {
      title: "Assigned Sections",
      value: teacherSections.length,
      description: `${classTeacherSections.length} as class teacher`,
      icon: GraduationCap,
      color: "bg-emerald-500",
      trend: "Active"
    },
    {
      title: "Completed Exams",
      value: completedExams,
      description: "Exams conducted this term",
      icon: Award,
      color: "bg-green-500",
      trend: "+8%"
    },
    {
      title: "Pending Reports",
      value: pendingReports,
      description: "Reports awaiting completion",
      icon: FileText,
      color: "bg-orange-500",
      trend: "-3%"
    },
  ];

  const quickActions = [
    {
      title: "Enter Marks",
      description: "Update exam marks for your subjects",
      icon: PenTool,
      href: "/teacher/marks",
      color: "bg-gradient-to-r from-blue-600 to-blue-700",
      badge: pendingMarksPapers.length > 0 ? pendingMarksPapers.length : null
    },
    {
      title: "View Timetable",
      description: "Check your class schedule",
      icon: Calendar,
      href: "/teacher/timetable",
      color: "bg-gradient-to-r from-green-600 to-green-700"
    },
    {
      title: "Create Homework",
      description: "Assign new homework to students",
      icon: ClipboardList,
      href: "/teacher/homework/new",
      color: "bg-gradient-to-r from-purple-600 to-purple-700"
    },
    {
      title: "Announcements",
      description: "Share updates with students",
      icon: MessageSquare,
      href: "/teacher/announcements",
      color: "bg-gradient-to-r from-orange-600 to-orange-700"
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-8 text-white bg-gradient-to-r from-blue-600 to-purple-600"
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.first_name || 'Teacher'}!
        </h1>
        <p className="text-blue-100 mb-6">
          Manage your classes, exams, and student progress from your dashboard
        </p>
        <div className="flex flex-wrap gap-4">
          <Button 
            variant="secondary" 
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 font-medium"
            style={{ color: 'white' }}
          >
            <Eye className="w-4 h-4 mr-2" />
            <span className="text-white">View My Profile</span>
          </Button>
          <Button 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10 font-medium"
            style={{ color: 'white' }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            <span className="text-white">Today's Schedule</span>
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass-morphism border-0 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">{stat.trend}</span>
                  <span className="text-sm text-gray-500 ml-1">this term</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Assigned Sections */}
      {teacherSections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                My Assigned Sections
              </CardTitle>
              <CardDescription>
                Sections where you teach or serve as class teacher
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherSections.map((section) => (
                  <div
                    key={section.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">
                        Grade {section.grade} - Section {section.section}
                      </h3>
                      {section.class_teacher === user?.id && (
                        <Badge variant="secondary" className="text-xs">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Class Teacher
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {section.class_teacher === user?.id 
                        ? 'You are the class teacher for this section'
                        : 'You teach subjects in this section'
                      }
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link href="/teacher/attendance">
                        <Button size="sm" variant="outline" className="text-xs">
                          Take Attendance
                        </Button>
                      </Link>
                      <Link href={`/teacher/timetable?section=${section.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          View Schedule
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <Link href={action.href}>
                <Card className="glass-morphism border-0 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </div>
                      {action.badge && (
                        <Badge className="bg-red-100 text-red-800">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Exam Groups */}
      {recentExamGroups.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Exam Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentExamGroups.map((examGroup, index) => (
              <motion.div
                key={examGroup.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Card className="glass-morphism border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{examGroup.name}</CardTitle>
                          <CardDescription className="capitalize">
                            {examGroup.exam_type.replace('_', ' ')}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Published
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Start Date:</span>
                        <span className="font-medium">
                          {new Date(examGroup.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">End Date:</span>
                        <span className="font-medium">
                          {new Date(examGroup.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => setSelectedExamGroup(examGroup.id)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pending Marks Entry */}
      {pendingMarksPapers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Marks Entry</h2>
          <Card className="glass-morphism border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <span>Exams Requiring Marks Entry</span>
              </CardTitle>
              <CardDescription>
                Complete marks entry for these recently conducted exams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingMarksPapers.map((paper, index) => (
                  <motion.div
                    key={paper.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <PenTool className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{paper.subject}</h4>
                        <p className="text-sm text-gray-600">
                          Section: {paper.section} • {paper.max_marks} marks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        {paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : 'TBD'}
                      </span>
                      <Link href={`/teacher/marks/${paper.id}`}>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          Enter Marks
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
} 