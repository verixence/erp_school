'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  BookOpen, 
  Calendar,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  Edit,
  Trash2,
  Eye,
  Settings,
  Download,
  PrinterIcon,
  MapPin,
  UserCheck,
  CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { 
  useExamGroups, 
  useCreateExamGroup, 
  useUpdateExamGroup,
  useDeleteExamGroup, 
  useExamPapers,
  useSchoolExamPapers,
  useCreateExamPaper,
  useUpdateExamPaper,
  useDeleteExamPaper,
  useSchoolSections,
  useSchoolInfo,
  useTeachers,
  type ExamType, 
  type Section,
  type CreateExamGroupData,
  type CreateExamPaperData,
  type ExamPaper 
} from '@erp/common';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';

const examTypeOptions: { value: ExamType; label: string; category?: string }[] = [
  // Traditional Exam Types
  { value: 'monthly', label: 'Monthly Test', category: 'Traditional' },
  { value: 'quarterly', label: 'Quarterly Exam', category: 'Traditional' },
  { value: 'half_yearly', label: 'Half Yearly Exam', category: 'Traditional' },
  { value: 'annual', label: 'Annual Exam', category: 'Traditional' },
  { value: 'unit_test', label: 'Unit Test', category: 'Traditional' },
  { value: 'other', label: 'Other', category: 'Traditional' },
  
  // CBSE Exam Types
  { value: 'cbse_fa1', label: 'FA1 - Formative Assessment 1', category: 'CBSE' },
  { value: 'cbse_fa2', label: 'FA2 - Formative Assessment 2', category: 'CBSE' },
  { value: 'cbse_sa1', label: 'SA1 - Summative Assessment 1 (Mid Term)', category: 'CBSE' },
  { value: 'cbse_fa3', label: 'FA3 - Formative Assessment 3', category: 'CBSE' },
  { value: 'cbse_fa4', label: 'FA4 - Formative Assessment 4', category: 'CBSE' },
  { value: 'cbse_sa2', label: 'SA2 - Summative Assessment 2 (Final)', category: 'CBSE' },
  
  // State Board (Telangana) Exam Types
  { value: 'state_fa1', label: 'FA1 - Formative Assessment 1 (20 marks)', category: 'State Board' },
  { value: 'state_fa2', label: 'FA2 - Formative Assessment 2 (20 marks)', category: 'State Board' },
  { value: 'state_fa3', label: 'FA3 - Formative Assessment 3 (20 marks)', category: 'State Board' },
  { value: 'state_fa4', label: 'FA4 - Formative Assessment 4 (20 marks)', category: 'State Board' },
  { value: 'state_sa1', label: 'SA1 - Summative Assessment 1 (100 marks)', category: 'State Board' },
  { value: 'state_sa2', label: 'SA2 - Summative Assessment 2 (100 marks)', category: 'State Board' },
  { value: 'state_sa3', label: 'SA3 - Summative Assessment 3 (100 marks)', category: 'State Board' },
];

// Helper function to determine CBSE term and exam type
const getCBSEDetails = (examType: ExamType) => {
  const cbseMapping = {
    'cbse_fa1': { term: 'Term1' as const, examType: 'FA1' as const },
    'cbse_fa2': { term: 'Term1' as const, examType: 'FA2' as const },
    'cbse_sa1': { term: 'Term1' as const, examType: 'SA1' as const },
    'cbse_fa3': { term: 'Term2' as const, examType: 'FA3' as const },
    'cbse_fa4': { term: 'Term2' as const, examType: 'FA4' as const },
    'cbse_sa2': { term: 'Term2' as const, examType: 'SA2' as const },
  };
  
  return cbseMapping[examType as keyof typeof cbseMapping] || null;
};

// Helper function to determine State Board assessment details
const getStateBoardDetails = (examType: ExamType) => {
  const stateBoardMapping = {
    'state_fa1': { assessmentType: 'FA' as const, assessmentNumber: 1, defaultMarks: 20, term: 'Term1' as const },
    'state_fa2': { assessmentType: 'FA' as const, assessmentNumber: 2, defaultMarks: 20, term: 'Term1' as const },
    'state_fa3': { assessmentType: 'FA' as const, assessmentNumber: 3, defaultMarks: 20, term: 'Term2' as const },
    'state_fa4': { assessmentType: 'FA' as const, assessmentNumber: 4, defaultMarks: 20, term: 'Term2' as const },
    'state_sa1': { assessmentType: 'SA' as const, assessmentNumber: 1, defaultMarks: 100, term: 'Term1' as const },
    'state_sa2': { assessmentType: 'SA' as const, assessmentNumber: 2, defaultMarks: 100, term: 'Term2' as const },
    'state_sa3': { assessmentType: 'SA' as const, assessmentNumber: 3, defaultMarks: 100, term: 'Annual' as const },
  };
  
  return stateBoardMapping[examType as keyof typeof stateBoardMapping] || null;
};

// Helper function to format date as dd/mm/yyyy for display
const formatDateForDisplay = (date: string) => {
  if (!date) return '';
  try {
    const parsedDate = new Date(date);
    return format(parsedDate, 'dd/MM/yyyy');
  } catch {
    return date;
  }
};

// Helper function to ensure date is in yyyy-mm-dd format for database
const ensureDateFormat = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    // If it's already in yyyy-mm-dd format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    // Parse other formats and convert to yyyy-mm-dd
    const parsedDate = new Date(dateStr);
    return format(parsedDate, 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
};

export default function ExamsPage() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedExamGroup, setSelectedExamGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);
  const [editingExamGroup, setEditingExamGroup] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'paper' | 'group' } | null>(null);

  // API hooks
  const { data: examGroups = [], isLoading, error } = useExamGroups(user?.school_id || undefined);
  const { data: sections = [] } = useSchoolSections(user?.school_id || undefined);
  const { data: teachers = [] } = useTeachers(user?.school_id || undefined);
  const { data: schoolInfo } = useSchoolInfo(user?.school_id || undefined);
  const { data: allExamPapers = [] } = useSchoolExamPapers(user?.school_id || undefined);
  const { data: examPapers = [] } = useExamPapers(selectedExamGroup ?? undefined);

  // Fetch school details to determine board type
  const { data: school } = useQuery({
    queryKey: ['school-details', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, board_type, state_board_type, assessment_pattern, board_affiliation')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Determine if this is a State Board school
  const isStateBoardSchool = React.useMemo(() => {
    const isStateBoard = school?.state_board_type === 'Telangana' || 
           school?.assessment_pattern === 'State_FA_SA' ||
           school?.board_type === 'State Board' ||
           school?.board_affiliation === 'State Board';
    
    // Debug logging to help troubleshoot
    console.log('School board detection:', {
      school_name: school?.name,
      state_board_type: school?.state_board_type,
      assessment_pattern: school?.assessment_pattern,
      board_type: school?.board_type,
      board_affiliation: school?.board_affiliation,
      isStateBoardSchool: isStateBoard
    });
    
    return isStateBoard;
  }, [school]);

  // Filter exam types based on board type
  const filteredExamTypeOptions = React.useMemo(() => {
    if (isStateBoardSchool) {
      // Show only Traditional and State Board exam types
      return examTypeOptions.filter(option => 
        option.category === 'Traditional' || option.category === 'State Board'
      );
    } else {
      // Show Traditional and CBSE exam types
      return examTypeOptions.filter(option => 
        option.category === 'Traditional' || option.category === 'CBSE'
      );
    }
  }, [isStateBoardSchool]);

  const createExamGroupMutation = useCreateExamGroup();
  const updateExamGroupMutation = useUpdateExamGroup();
  const deleteExamGroupMutation = useDeleteExamGroup();
  const createExamPaperMutation = useCreateExamPaper();
  const updateExamPaperMutation = useUpdateExamPaper();
  const deleteExamPaperMutation = useDeleteExamPaper();

  const [formData, setFormData] = useState<CreateExamGroupData>({
    name: '',
    description: '',
    exam_type: 'monthly',
    start_date: '',
    end_date: '',
    is_published: false,
    cbse_term: undefined,
    cbse_exam_type: undefined,
    sync_to_calendar: false,
  });

  const [paperFormData, setPaperFormData] = useState<CreateExamPaperData>({
    exam_group_id: '',
    section: '',
    subject: '',
    exam_date: '',
    exam_time: '',
    duration_minutes: 180,
    max_marks: 100,
    pass_marks: 40,
    instructions: '',
    teacher_id: '',
    venue: '',
  });

  // Compute available subjects from teachers
  const availableSubjects = React.useMemo(() => {
    const subjectSet = new Set<string>();
    teachers.forEach(teacher => {
      teacher.subjects?.forEach(subject => subjectSet.add(subject));
    });
    return Array.from(subjectSet).sort();
  }, [teachers]);

  // Get selected exam group details for date restrictions
  const selectedExamGroupData = examGroups.find(eg => eg.id === selectedExamGroup);

  // Auto-set marks based on State Board exam type when exam group changes
  React.useEffect(() => {
    if (selectedExamGroupData && selectedExamGroupData.exam_type.startsWith('state_')) {
      const stateBoardDetails = getStateBoardDetails(selectedExamGroupData.exam_type);
      if (stateBoardDetails) {
        setPaperFormData(prev => ({
          ...prev,
          max_marks: stateBoardDetails.defaultMarks,
          pass_marks: stateBoardDetails.assessmentType === 'FA' ? 8 : 35, // 40% of max marks for FA, 35% for SA
        }));
      }
    }
  }, [selectedExamGroup, selectedExamGroupData]);

  // Filter teachers based on selected subject
  const availableTeachers = React.useMemo(() => {
    if (!paperFormData.subject) return teachers;
    return teachers.filter(teacher => 
      teacher.subjects?.includes(paperFormData.subject)
    );
  }, [teachers, paperFormData.subject]);

  // Check for datetime conflicts
  const checkDateTimeConflict = (
    section: string, 
    examDate: string, 
    examTime: string, 
    duration: number,
    excludePaperId?: string
  ) => {
    if (!examDate || !examTime) return null;

    const newExamStart = new Date(`${examDate}T${examTime}`);
    const newExamEnd = new Date(newExamStart.getTime() + duration * 60000);

    for (const paper of allExamPapers) {
      if (excludePaperId && paper.id === excludePaperId) continue;
      if (paper.section !== section) continue;
      if (!paper.exam_date || !paper.exam_time) continue;

      const existingStart = new Date(`${paper.exam_date}T${paper.exam_time}`);
      const existingEnd = new Date(existingStart.getTime() + paper.duration_minutes * 60000);

      // Check for overlap
      if (newExamStart < existingEnd && newExamEnd > existingStart) {
        return {
          subject: paper.subject,
          date: paper.exam_date,
          time: paper.exam_time,
          duration: paper.duration_minutes
        };
      }
    }

    return null;
  };

  const handleCreateExamGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.school_id) {
      toast.error('School ID not found');
      return;
    }

    try {
      // Get CBSE details if it's a CBSE exam type
      const cbseDetails = getCBSEDetails(formData.exam_type);
      
      // Get State Board details if it's a State Board exam type
      const stateBoardDetails = getStateBoardDetails(formData.exam_type);
      
      const examGroupData: CreateExamGroupData = {
        ...formData,
        cbse_term: cbseDetails?.term,
        cbse_exam_type: cbseDetails?.examType,
        // Add State Board specific fields if available
        assessment_type: stateBoardDetails?.assessmentType,
        assessment_number: stateBoardDetails?.assessmentNumber,
        total_marks: stateBoardDetails?.defaultMarks,
        state_board_term: stateBoardDetails?.term,
      };

      if (editingExamGroup) {
        // Update existing exam group
        await updateExamGroupMutation.mutateAsync({
          id: editingExamGroup.id,
          ...examGroupData
        });
        toast.success('Exam group updated successfully!');
      } else {
        // Create new exam group
        await createExamGroupMutation.mutateAsync(examGroupData);
        toast.success('Exam group created successfully!');
        
        if (formData.sync_to_calendar) {
          toast.success('📅 Exam dates synced to academic calendar!');
        }
      }
      
      setShowCreateModal(false);
      setEditingExamGroup(null);
      setFormData({
        name: '',
        description: '',
        exam_type: 'monthly',
        start_date: '',
        end_date: '',
        is_published: false,
        cbse_term: undefined,
        cbse_exam_type: undefined,
        sync_to_calendar: false,
      });
    } catch (error) {
      console.error('Error saving exam group:', error);
      toast.error(`Failed to ${editingExamGroup ? 'update' : 'create'} exam group. Please try again.`);
    }
  };

  const handleEditExamGroup = (examGroup: any) => {
    setEditingExamGroup(examGroup);
    setFormData({
      name: examGroup.name,
      description: examGroup.description || '',
      exam_type: examGroup.exam_type,
      start_date: examGroup.start_date,
      end_date: examGroup.end_date,
      is_published: examGroup.is_published,
      cbse_term: examGroup.cbse_term,
      cbse_exam_type: examGroup.cbse_exam_type,
      sync_to_calendar: examGroup.sync_to_calendar,
    });
    setShowCreateModal(true);
  };

  const handleDeleteExamGroup = async (id: string) => {
    setDeleteTarget({ id, type: 'group' });
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteExamPaper = async (id: string) => {
    setDeleteTarget({ id, type: 'paper' });
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'group') {
        await deleteExamGroupMutation.mutateAsync(deleteTarget.id);
        toast.success('Exam group deleted successfully!');
        if (selectedExamGroup === deleteTarget.id) {
          setSelectedExamGroup(null);
          setActiveTab('overview');
        }
      } else {
        await deleteExamPaperMutation.mutateAsync(deleteTarget.id);
        toast.success('Exam paper deleted successfully!');
      }
      
      setShowDeleteConfirmModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(`Failed to delete exam ${deleteTarget.type}. Please try again.`);
    }
  };

  const handleEditPaper = (paper: ExamPaper) => {
    setEditingPaper(paper);
    setPaperFormData({
      exam_group_id: paper.exam_group_id,
      section: paper.section,
      subject: paper.subject,
      exam_date: paper.exam_date || '',
      exam_time: paper.exam_time || '',
      duration_minutes: paper.duration_minutes,
      max_marks: paper.max_marks,
      pass_marks: paper.pass_marks,
      instructions: paper.instructions || '',
      teacher_id: paper.teacher_id || '',
      venue: paper.venue || '',
    });
    setShowScheduleModal(true);
  };

  const handleCreateExamPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExamGroup) {
      toast.error('No exam group selected');
      return;
    }

    // Validate required fields
    if (!paperFormData.section || !paperFormData.subject) {
      toast.error('Please fill in section and subject fields');
      return;
    }

    // Validate exam date is within exam group range
    if (paperFormData.exam_date && selectedExamGroupData) {
      const examDate = new Date(paperFormData.exam_date);
      const startDate = new Date(selectedExamGroupData.start_date);
      const endDate = new Date(selectedExamGroupData.end_date);
      
      if (examDate < startDate || examDate > endDate) {
        toast.error(
          `Exam date must be between ${formatDateForDisplay(selectedExamGroupData.start_date)} and ${formatDateForDisplay(selectedExamGroupData.end_date)}`
        );
        return;
      }
    }

    // Check for datetime conflicts
    if (paperFormData.exam_date && paperFormData.exam_time) {
      const conflict = checkDateTimeConflict(
        paperFormData.section,
        paperFormData.exam_date,
        paperFormData.exam_time,
        paperFormData.duration_minutes || 180,
        editingPaper?.id
      );

      if (conflict) {
        toast.error(
          `Schedule conflict! ${conflict.subject} exam is already scheduled for ${paperFormData.section} on ${new Date(conflict.date).toLocaleDateString()} at ${conflict.time} (${conflict.duration} minutes).`
        );
        return;
      }
    }

    try {
      const formDataToSubmit = {
        ...paperFormData,
        exam_group_id: selectedExamGroup,
        // Ensure we send proper values for optional fields
        teacher_id: paperFormData.teacher_id || undefined,
        venue: paperFormData.venue || undefined,
      };

      if (editingPaper) {
        // Update existing paper
        await updateExamPaperMutation.mutateAsync({
          id: editingPaper.id,
          ...formDataToSubmit
        });
        toast.success('Exam paper updated successfully!');
      } else {
        // Create new paper
        await createExamPaperMutation.mutateAsync(formDataToSubmit);
        toast.success('Exam paper created successfully!');
      }
      
      setShowScheduleModal(false);
      setEditingPaper(null);
      setPaperFormData({
        exam_group_id: '',
        section: '',
        subject: '',
        exam_date: '',
        exam_time: '',
        duration_minutes: 180,
        max_marks: 100,
        pass_marks: 40,
        instructions: '',
        teacher_id: '',
        venue: '',
      });
    } catch (error) {
      console.error('Error saving exam paper:', error);
      
      // Better error handling
      let errorMessage = `Failed to ${editingPaper ? 'update' : 'create'} exam paper. Please try again.`;
      
      if (error && typeof error === 'object') {
        if ('message' in error && error.message) {
          errorMessage = `Error: ${error.message}`;
        } else if ('details' in error && error.details) {
          errorMessage = `Error: ${error.details}`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handlePrintTimetable = () => {
    if (!selectedExamGroup || !examPapers.length) return;
    
    const examGroup = examGroups.find(eg => eg.id === selectedExamGroup);
    
    // Create printable timetable
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const timetableHTML = generateTimetableHTML(examGroup, examPapers, schoolInfo);
    printWindow.document.write(timetableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const generateTimetableHTML = (examGroup: any, papers: ExamPaper[], school: any) => {
    // Sort papers by section, then by date, then by time
    const sortedPapers = [...papers].sort((a, b) => {
      // First sort by section
      if (a.section !== b.section) {
        return a.section.localeCompare(b.section);
      }
      // Then by date
      if (a.exam_date && b.exam_date) {
        const dateCompare = new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime();
        if (dateCompare !== 0) return dateCompare;
      }
      // Finally by time
      if (a.exam_time && b.exam_time) {
        return a.exam_time.localeCompare(b.exam_time);
      }
      return 0;
    });

    // Group papers by section for better organization
    const papersBySection = sortedPapers.reduce((acc, paper) => {
      if (!acc[paper.section]) {
        acc[paper.section] = [];
      }
      acc[paper.section].push(paper);
      return acc;
    }, {} as Record<string, ExamPaper[]>);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Exam Timetable - ${examGroup?.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #1F2937;
              background-color: #FFFFFF;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 3px solid #3B82F6; 
              padding-bottom: 20px; 
              background: linear-gradient(135deg, #3B82F610, #1E40AF10);
              padding: 20px;
              border-radius: 10px;
            }
            .logo { 
              width: 80px; 
              height: 80px; 
              margin: 0 auto 15px; 
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .school-name { 
              font-size: 28px; 
              font-weight: bold; 
              margin: 15px 0; 
              color: #3B82F6;
            }
            .exam-title { 
              font-size: 20px; 
              color: #1E40AF; 
              margin: 8px 0; 
              font-weight: 600;
            }
            .date-range {
              font-size: 14px;
              color: #1F2937;
              margin-top: 10px;
            }
            .section-header { 
              background: linear-gradient(135deg, #3B82F6, #1E40AF);
              color: white;
              font-weight: bold; 
              font-size: 18px; 
              padding: 12px; 
              margin-top: 25px; 
              border-radius: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px; 
              margin-bottom: 25px; 
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            th, td { 
              border: 1px solid #3B82F630; 
              padding: 12px; 
              text-align: left; 
              font-size: 14px;
            }
            th { 
              background: linear-gradient(135deg, #3B82F620, #1E40AF20);
              font-weight: bold; 
              color: #1F2937;
            }
            tr:nth-child(even) {
              background-color: #F9FAFB;
            }
            tr:hover {
              background-color: #3B82F610;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #6B7280;
              border-top: 2px solid #3B82F6;
              padding-top: 20px;
            }
            .school-info {
              margin: 5px 0;
            }
            @media print {
              body { margin: 0; }
              .header { break-inside: avoid; }
              .section-header { break-inside: avoid; }
              table { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${school?.logo_url ? `<img src="${school?.logo_url}" alt="School Logo" class="logo">` : ''}
            <div class="school-name">${school?.name || 'School Name'}</div>
            <div class="exam-title">${examGroup?.name} - Examination Timetable</div>
            <div class="date-range">Date Range: ${new Date(examGroup?.start_date).toLocaleDateString()} - ${new Date(examGroup?.end_date).toLocaleDateString()}</div>
          </div>
          
          ${Object.entries(papersBySection).map(([section, sectionPapers]) => `
            <div class="section-header">Section: ${section}</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Duration</th>
                  <th>Max Marks</th>
                  <th>Venue</th>
                  <th>Invigilator</th>
                </tr>
              </thead>
              <tbody>
                ${sectionPapers.map(paper => `
                  <tr>
                    <td>${paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : 'TBD'}</td>
                    <td>${paper.exam_time || 'TBD'}</td>
                    <td>${paper.subject}</td>
                    <td>${paper.duration_minutes} min</td>
                    <td>${paper.max_marks}</td>
                    <td>${paper.venue || 'TBD'}</td>
                    <td>${paper.teacher ? `${paper.teacher.first_name} ${paper.teacher.last_name}` : 'TBD'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `).join('')}
          
          <div class="footer">
            <div class="school-info">
              <strong>Principal:</strong> ${school?.principal_name || 'Principal Name'}
            </div>
            <div class="school-info">
              <strong>Address:</strong> ${school?.address || 'School Address'}
            </div>
            <div class="school-info">
              <strong>Contact:</strong> ${school?.phone || 'Phone'} | ${school?.email || 'Email'}
            </div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #3B82F630;">
              <em>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</em>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const formatDate = (dateString: string) => {
    // Parse the date as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getExamGroupStats = (examGroupId: string) => {
    const papers = allExamPapers.filter(p => p.exam_group_id === examGroupId);
    const sections = [...new Set(papers.map(p => p.section))];
    return {
      papers: papers.length,
      sections: sections.length,
      subjects: [...new Set(papers.map(p => p.subject))].length,
    };
  };

  const handlePublishExamGroup = async (examGroupId: string, isPublished: boolean) => {
    try {
      await updateExamGroupMutation.mutateAsync({
        id: examGroupId,
        is_published: !isPublished
      });
      
      toast.success(`Exam group ${!isPublished ? 'published' : 'unpublished'} successfully!`);
    } catch (error) {
      console.error('Error updating exam group:', error);
      toast.error('Failed to update exam group status.');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading exam groups</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Exam Management</h1>
            {school && (
              <Badge 
                className={
                  isStateBoardSchool 
                    ? "bg-green-100 text-green-800 border-green-200" 
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }
              >
                {isStateBoardSchool ? '🏫 State Board' : '🎓 CBSE Board'}
              </Badge>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            Create and manage exam groups, papers, and schedules for {school?.name || 'your school'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          {selectedExamGroup && (
            <>
              <Button
                variant="outline"
                onClick={handlePrintTimetable}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print Timetable
              </Button>
              <Button
                onClick={() => setShowScheduleModal(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Paper
              </Button>
            </>
          )}
          
          {!selectedExamGroup && (
            <Dialog open={showCreateModal} onOpenChange={(open) => {
              setShowCreateModal(open);
              if (!open) {
                setEditingExamGroup(null);
                setFormData({
                  name: '',
                  description: '',
                  exam_type: 'monthly',
                  start_date: '',
                  end_date: '',
                  is_published: false,
                  cbse_term: undefined,
                  cbse_exam_type: undefined,
                  sync_to_calendar: false,
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Exam Group
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingExamGroup ? 'Edit Exam Group' : 'Create New Exam Group'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateExamGroup} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Exam Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., First Term Exam 2024"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Exam description..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="examType">Exam Type</Label>
                    <Select 
                      value={formData.exam_type} 
                      onValueChange={(value: ExamType) => setFormData({ ...formData, exam_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Traditional Exams Section */}
                        <div className="p-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Traditional Exams</div>
                        {filteredExamTypeOptions.filter(option => option.category === 'Traditional').map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        
                        {/* CBSE Board Exams Section (only for CBSE schools) */}
                        {!isStateBoardSchool && (
                          <>
                            <div className="p-2 text-xs font-medium text-blue-600 uppercase tracking-wide border-t mt-2 pt-2">
                              🎓 CBSE Board Exams
                            </div>
                            {filteredExamTypeOptions.filter(option => option.category === 'CBSE').map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {getCBSEDetails(option.value)?.term} • Max Marks: {
                                      option.value.includes('fa') ? '20' : '80'
                                    }
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        
                        {/* State Board Exams Section (only for State Board schools) */}
                        {isStateBoardSchool && (
                          <>
                            <div className="p-2 text-xs font-medium text-green-600 uppercase tracking-wide border-t mt-2 pt-2">
                              🏫 State Board Exams
                            </div>
                            {filteredExamTypeOptions.filter(option => option.category === 'State Board').map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {getStateBoardDetails(option.value)?.term} • Max Marks: {
                                      getStateBoardDetails(option.value)?.defaultMarks
                                    }
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    
                    {/* Show CBSE Term info if CBSE exam type is selected */}
                    {formData.exam_type.startsWith('cbse_') && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-blue-800">
                            CBSE {getCBSEDetails(formData.exam_type)?.term} - {getCBSEDetails(formData.exam_type)?.examType}
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          This exam will be automatically categorized for CBSE report card generation.
                        </p>
                      </div>
                    )}

                    {/* Show State Board info if State Board exam type is selected */}
                    {formData.exam_type.startsWith('state_') && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-800">
                            State Board {getStateBoardDetails(formData.exam_type)?.assessmentType}-{getStateBoardDetails(formData.exam_type)?.assessmentNumber} ({getStateBoardDetails(formData.exam_type)?.term})
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          This exam will be automatically categorized for State Board SSC report card generation.
                          Max marks will be set to {getStateBoardDetails(formData.exam_type)?.defaultMarks} for all papers.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: ensureDateFormat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: ensureDateFormat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublished"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="isPublished">Publish immediately</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="syncToCalendar"
                      checked={formData.sync_to_calendar}
                      onChange={(e) => setFormData({ ...formData, sync_to_calendar: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="syncToCalendar">Sync to Academic Calendar</Label>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingExamGroup(null);
                        setFormData({
                          name: '',
                          description: '',
                          exam_type: 'monthly',
                          start_date: '',
                          end_date: '',
                          is_published: false,
                          cbse_term: undefined,
                          cbse_exam_type: undefined,
                          sync_to_calendar: false,
                        });
                      }}
                      disabled={createExamGroupMutation.isPending || updateExamGroupMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                      disabled={createExamGroupMutation.isPending || updateExamGroupMutation.isPending}
                    >
                      {(createExamGroupMutation.isPending || updateExamGroupMutation.isPending) 
                        ? (editingExamGroup ? 'Updating...' : 'Creating...') 
                        : (editingExamGroup ? 'Update Exam Group' : 'Create Exam Group')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      {selectedExamGroup ? (
        <ExamGroupDetails 
          examGroupId={selectedExamGroup}
          examGroups={examGroups}
          examPapers={examPapers}
          sections={sections}
          onBack={() => {
            setSelectedExamGroup(null);
            setActiveTab('overview');
          }}
          onDeletePaper={handleDeleteExamPaper}
          onDeleteGroup={handleDeleteExamGroup}
          onEditPaper={handleEditPaper}
        />
      ) : (
        <>
          {/* Exam Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examGroups.map((examGroup, index) => {
              const stats = getExamGroupStats(examGroup.id);
              
              return (
                <motion.div
                  key={examGroup.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-morphism hover:shadow-xl transition-all duration-300 border-0 group cursor-pointer overflow-hidden">
                    <div className="p-6 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {examGroup.name}
                            </h3>
                            <p className="text-sm text-gray-500 capitalize">
                              {examGroup.exam_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {examGroup.is_published ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Published
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {examGroup.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {examGroup.description}
                        </p>
                      )}

                      {/* Date Range */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(examGroup.start_date)}</span>
                        </div>
                        <span>-</span>
                        <span>{formatDate(examGroup.end_date)}</span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{stats.papers}</div>
                          <div className="text-xs text-gray-500">Papers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{stats.sections}</div>
                          <div className="text-xs text-gray-500">Sections</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{stats.subjects}</div>
                          <div className="text-xs text-gray-500">Subjects</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedExamGroup(examGroup.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                          
                          <Button
                            variant={examGroup.is_published ? "outline" : "default"}
                            size="sm"
                            onClick={() => handlePublishExamGroup(examGroup.id, examGroup.is_published)}
                            disabled={updateExamGroupMutation.isPending}
                            className={examGroup.is_published 
                              ? "text-orange-600 hover:text-orange-700 border-orange-200" 
                              : "bg-green-600 hover:bg-green-700 text-white"
                            }
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {examGroup.is_published ? 'Unpublish' : 'Activate'}
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExamGroup(examGroup)}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExamGroup(examGroup.id)}
                            disabled={deleteExamGroupMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Empty State */}
          {!examGroups.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No exam groups yet</h3>
              <p className="text-gray-500 mb-6">Create your first exam group to get started with exam management.</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Exam Group
              </Button>
            </motion.div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete this exam {deleteTarget?.type}? 
              {deleteTarget?.type === 'group' && ' This will delete all associated papers and marks.'}
              {deleteTarget?.type === 'paper' && ' This will delete all associated marks.'}
            </p>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteExamGroupMutation.isPending || deleteExamPaperMutation.isPending}
            >
              {(deleteExamGroupMutation.isPending || deleteExamPaperMutation.isPending) ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Paper Modal */}
      <Dialog open={showScheduleModal} onOpenChange={(open) => {
        setShowScheduleModal(open);
        if (!open) {
          setEditingPaper(null);
          setPaperFormData({
            exam_group_id: '',
            section: '',
            subject: '',
            exam_date: '',
            exam_time: '',
            duration_minutes: 180,
            max_marks: 100,
            pass_marks: 40,
            instructions: '',
            teacher_id: '',
            venue: '',
          });
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPaper ? 'Edit Exam Paper' : 'Schedule Exam Paper'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateExamPaper} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section">Section *</Label>
                <Select 
                  value={paperFormData.section} 
                  onValueChange={(value) => setPaperFormData({ ...paperFormData, section: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={`Grade ${section.grade} ${section.section}`}>
                        Grade {section.grade} {section.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select 
                  value={paperFormData.subject} 
                  onValueChange={(value) => setPaperFormData({ ...paperFormData, subject: value, teacher_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="examDate">Exam Date</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={paperFormData.exam_date}
                  onChange={(e) => setPaperFormData({ ...paperFormData, exam_date: ensureDateFormat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="examTime">Exam Time</Label>
                <Input
                  id="examTime"
                  type="time"
                  value={paperFormData.exam_time}
                  onChange={(e) => setPaperFormData({ ...paperFormData, exam_time: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={paperFormData.venue}
                  onChange={(e) => setPaperFormData({ ...paperFormData, venue: e.target.value })}
                  placeholder="e.g., Room 101, Main Hall"
                />
              </div>
              <div>
                <Label htmlFor="teacher">Assign Teacher</Label>
                <Select 
                  value={paperFormData.teacher_id} 
                  onValueChange={(value) => setPaperFormData({ ...paperFormData, teacher_id: value })}
                  disabled={!paperFormData.subject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={paperFormData.subject ? "Select teacher" : "Select subject first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {paperFormData.subject && availableTeachers.length === 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    No teachers found who can teach {paperFormData.subject}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={paperFormData.duration_minutes}
                  onChange={(e) => setPaperFormData({ ...paperFormData, duration_minutes: parseInt(e.target.value) || 0 })}
                  min="30"
                  max="300"
                />
              </div>
              <div>
                <Label htmlFor="maxMarks">Max Marks</Label>
                <Input
                  id="maxMarks"
                  type="number"
                  value={paperFormData.max_marks}
                  onChange={(e) => setPaperFormData({ ...paperFormData, max_marks: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="passMarks">Pass Marks</Label>
                <Input
                  id="passMarks"
                  type="number"
                  value={paperFormData.pass_marks}
                  onChange={(e) => setPaperFormData({ ...paperFormData, pass_marks: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={paperFormData.instructions}
                onChange={(e) => setPaperFormData({ ...paperFormData, instructions: e.target.value })}
                placeholder="Special instructions for this exam..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
                disabled={createExamPaperMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-green-600 to-emerald-600"
                disabled={createExamPaperMutation.isPending || updateExamPaperMutation.isPending}
              >
                {(createExamPaperMutation.isPending || updateExamPaperMutation.isPending) 
                  ? (editingPaper ? 'Updating...' : 'Creating...') 
                  : (editingPaper ? 'Update Paper' : 'Schedule Paper')
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Exam Group Details Component
interface ExamGroupDetailsProps {
  examGroupId: string;
  examGroups: any[];
  examPapers: ExamPaper[];
  sections: Section[];
  onBack: () => void;
  onDeletePaper: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onEditPaper: (paper: ExamPaper) => void;
}

function ExamGroupDetails({ 
  examGroupId, 
  examGroups, 
  examPapers, 
  sections, 
  onBack, 
  onDeletePaper, 
  onDeleteGroup,
  onEditPaper
}: ExamGroupDetailsProps) {
  const examGroup = examGroups.find(eg => eg.id === examGroupId);
  
  if (!examGroup) return null;

  const formatDate = (dateString: string) => {
    // Parse the date as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ←
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{examGroup.name}</h1>
            <p className="text-gray-600">
              {formatDate(examGroup.start_date)} - {formatDate(examGroup.end_date)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={examGroup.is_published ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
            {examGroup.is_published ? 'Published' : 'Draft'}
          </Badge>
          <Button
            variant="outline"
            onClick={() => onDeleteGroup(examGroup.id)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Group
          </Button>
        </div>
      </div>

      {/* Exam Papers List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Scheduled Papers</h2>
        
        {examPapers.length > 0 ? (
          <div className="grid gap-4">
            {examPapers.map((paper, index) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-morphism border-0 hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{paper.subject}</h3>
                          <p className="text-sm text-gray-500">Section: {paper.section}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditPaper(paper)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeletePaper(paper.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {paper.exam_date ? formatDate(paper.exam_date) : 'TBD'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatTime(paper.exam_time || '')}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm font-medium text-gray-900">
                          {paper.duration_minutes} min
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Marks</p>
                        <p className="text-sm font-medium text-gray-900">
                          {paper.max_marks} (Pass: {paper.pass_marks})
                        </p>
                      </div>
                    </div>
                    
                    {paper.instructions && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Instructions</p>
                        <p className="text-sm text-gray-700">{paper.instructions}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No papers scheduled</h3>
            <p className="text-gray-500 mb-6">Start by scheduling exam papers for different sections and subjects.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
} 