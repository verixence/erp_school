'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Users, Video, Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  useTeacherOnlineClasses, 
  useCreateOnlineClass, 
  useUpdateOnlineClass, 
  useDeleteOnlineClass,
  CreateOnlineClassData,
  OnlineClass,
  processNotifications
} from '@erp/common';

interface Section {
  id: string;
  grade: number;
  section: string;
  class_teacher?: string;
}

export default function TeacherOnlineClassesPage() {
  const { user } = useAuth();
  
  // Get school data
  const { data: school } = useQuery({
    queryKey: ['brand'],
    queryFn: async () => {
      if (!user?.school_id) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user.school_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<OnlineClass | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  // Form state for creating/editing online classes
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    meeting_link: '',
    meeting_password: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: 0
  });

  // Fetch teacher's online classes
  const { 
    data: onlineClasses = [], 
    isLoading: classesLoading,
    refetch: refetchClasses 
  } = useTeacherOnlineClasses(user?.id || '');

  // Fetch available sections
  const { data: sections = [] } = useQuery({
    queryKey: ['sections', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      
      const { data, error } = await supabase
        .from('sections')
        .select('id, grade, grade_text, section, class_teacher')
        .eq('school_id', school.id)
        .order('grade')
        .order('section');

      if (error) throw error;
      return data as (Section & { grade_text?: string })[];
    },
    enabled: !!school?.id,
  });

  // Helper function to get display grade
  const getDisplayGrade = (section: Section & { grade_text?: string }) => {
    if (section.grade_text) {
      return section.grade_text.toUpperCase(); // Convert 'lkg' to 'LKG'
    }
    if (section.grade !== null && section.grade !== undefined) {
      return section.grade.toString();
    }
    return 'No Grade';
  };

  // Get unique grades and sections for selected grade
  const availableGrades = [...new Set(sections
    .map(s => getDisplayGrade(s))
  )].sort((a, b) => {
    // Handle special grades like LKG, UKG, Nursery
    const specialGrades = ['NURSERY', 'LKG', 'UKG'];
    const aIndex = specialGrades.indexOf(a.toUpperCase());
    const bIndex = specialGrades.indexOf(b.toUpperCase());
    
    // If both are special grades, sort by their predefined order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only a is special, it comes first
    if (aIndex !== -1) return -1;
    
    // If only b is special, it comes first  
    if (bIndex !== -1) return 1;
    
    // Both are numeric, sort numerically
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    // Fallback to string comparison
    return a.localeCompare(b);
  });
  
  const availableSections = sections
    .filter(s => getDisplayGrade(s) === selectedGrade)
    .sort((a, b) => a.section.localeCompare(b.section));

  // Mutations
  const createOnlineClassMutation = useCreateOnlineClass();
  const updateOnlineClassMutation = useUpdateOnlineClass();
  const deleteOnlineClassMutation = useDeleteOnlineClass();

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject: '',
      meeting_link: '',
      meeting_password: '',
      scheduled_date: '',
      start_time: '',
      end_time: '',
      duration_minutes: 60
    });
    setSelectedSections([]);
    setSelectedGrade('');
    setSelectedSection('');
    setEditingClass(null);
  };

  const addSection = () => {
    if (selectedGrade && selectedSection) {
      const sectionToAdd = availableSections.find(s => s.section === selectedSection);
      if (sectionToAdd && !selectedSections.includes(sectionToAdd.id)) {
        setSelectedSections(prev => [...prev, sectionToAdd.id]);
        setSelectedSection(''); // Reset section selection
      }
    }
  };

  const removeSection = (sectionId: string) => {
    setSelectedSections(prev => prev.filter(id => id !== sectionId));
  };

  const getSectionDisplayName = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return 'Unknown Section';
    
    const gradeDisplay = getDisplayGrade(section);
    const prefix = gradeDisplay === 'No Grade' ? gradeDisplay : `Grade ${gradeDisplay}`;
    
    return `${prefix} - Section ${section.section}`;
  };

  // Calculate duration when start/end time changes
  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return Math.max(0, endMinutes - startMinutes);
  };

  // Update duration when start/end time changes
  useEffect(() => {
    const duration = calculateDuration(formData.start_time, formData.end_time);
    if (duration > 0 && duration !== formData.duration_minutes) {
      setFormData(prev => ({ ...prev, duration_minutes: duration }));
    }
  }, [formData.start_time, formData.end_time]);

  const handleCreateClass = async () => {
    if (!formData.title || !formData.meeting_link || !formData.scheduled_date || 
        !formData.start_time || !formData.end_time || selectedSections.length === 0) {
      toast.error("Missing Information", {
        description: "Please fill in all required fields and select at least one section.",
      });
      return;
    }

    const classData: CreateOnlineClassData = {
      ...formData,
      section_ids: selectedSections
    };

    try {
      await createOnlineClassMutation.mutateAsync(classData);
      toast.success("Online class scheduled successfully!");
      setIsCreateDialogOpen(false);
      resetForm();
      refetchClasses();
      
      // Process notifications immediately
      try {
        await processNotifications();
      } catch (notificationError) {
        console.warn('Failed to process notifications:', notificationError);
        // Don't show error to user as the class was created successfully
      }
    } catch (error) {
      console.error('Error creating online class:', error);
      toast.error("Failed to schedule online class. Please try again.");
    }
  };

  const handleEditClass = (onlineClass: OnlineClass) => {
    setEditingClass(onlineClass);
    setFormData({
      title: onlineClass.title,
      description: onlineClass.description || '',
      subject: onlineClass.subject || '',
      meeting_link: onlineClass.meeting_link,
      meeting_password: onlineClass.meeting_password || '',
      scheduled_date: onlineClass.scheduled_date,
      start_time: onlineClass.start_time,
      end_time: onlineClass.end_time,
      duration_minutes: onlineClass.duration_minutes
    });
    setSelectedSections(onlineClass.sections?.map(s => s.section_id) || []);
    setIsCreateDialogOpen(true);
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    try {
      await updateOnlineClassMutation.mutateAsync({
        classId: editingClass.id,
        updates: formData
      });
      toast.success("Online class updated successfully!");
      setIsCreateDialogOpen(false);
      resetForm();
      refetchClasses();
    } catch (error) {
      console.error('Error updating online class:', error);
      toast.error("Failed to update online class. Please try again.");
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this online class?')) return;

    try {
      await deleteOnlineClassMutation.mutateAsync(classId);
      toast.success("Online class deleted successfully!");
      refetchClasses();
    } catch (error) {
      console.error('Error deleting online class:', error);
      toast.error("Failed to delete online class. Please try again.");
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Online Classes</h1>
          <p className="text-gray-600">Schedule and manage virtual classes for your students</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Schedule Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'Edit Online Class' : 'Schedule New Online Class'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Class Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mathematics Class - Chapter 5"
                />
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the class content..."
                  rows={3}
                />
              </div>

              {/* Meeting Link */}
              <div>
                <Label htmlFor="meeting_link">Meeting Link *</Label>
                <Input
                  id="meeting_link"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  placeholder="https://zoom.us/j/123456789 or Google Meet link"
                />
              </div>

              {/* Meeting Password */}
              <div>
                <Label htmlFor="meeting_password">Meeting Password</Label>
                <Input
                  id="meeting_password"
                  value={formData.meeting_password}
                  onChange={(e) => setFormData({ ...formData, meeting_password: e.target.value })}
                  placeholder="Optional meeting password"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="scheduled_date">Date *</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Section Selection */}
              <div>
                <Label>Select Sections *</Label>
                
                {/* Grade and Section Dropdowns */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGrades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          Grade {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={selectedSection} 
                    onValueChange={setSelectedSection}
                    disabled={!selectedGrade}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem key={section.id} value={section.section}>
                          Section {section.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSection}
                    disabled={!selectedGrade || !selectedSection}
                  >
                    Add
                  </Button>
                </div>

                {/* Selected Sections Display */}
                <div className="border rounded-lg p-3 min-h-[60px]">
                  <p className="text-sm font-medium mb-2">Selected Sections:</p>
                  {selectedSections.length === 0 ? (
                    <p className="text-sm text-gray-500">No sections selected</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedSections.map((sectionId) => (
                        <Badge
                          key={sectionId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {getSectionDisplayName(sectionId)}
                          <button
                            type="button"
                            onClick={() => removeSection(sectionId)}
                            className="ml-1 hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedSections.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">Please select at least one section</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingClass ? handleUpdateClass : handleCreateClass}
                  disabled={createOnlineClassMutation.isPending || updateOnlineClassMutation.isPending}
                >
                  {editingClass ? 'Update Class' : 'Schedule Class'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Online Classes List */}
      <div className="grid gap-6">
        {onlineClasses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Video className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No online classes scheduled</h3>
              <p className="text-gray-600 text-center mb-4">
                Schedule your first online class to get started with virtual teaching.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Schedule Your First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          onlineClasses.map((onlineClass) => (
            <Card key={onlineClass.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{onlineClass.title}</CardTitle>
                      <Badge className={getStatusColor(onlineClass.status)}>
                        {onlineClass.status.charAt(0).toUpperCase() + onlineClass.status.slice(1)}
                      </Badge>
                    </div>
                    {onlineClass.subject && (
                      <CardDescription className="text-base font-medium">
                        Subject: {onlineClass.subject}
                      </CardDescription>
                    )}
                    {onlineClass.description && (
                      <CardDescription className="mt-1">
                        {onlineClass.description}
                      </CardDescription>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClass(onlineClass)}
                      disabled={onlineClass.status === 'completed'}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClass(onlineClass.id)}
                      disabled={onlineClass.status === 'ongoing'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date and Time */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(onlineClass.scheduled_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {onlineClass.start_time} - {onlineClass.end_time}
                      </p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">{onlineClass.duration_minutes} minutes</p>
                      <p className="text-sm text-gray-600">Duration</p>
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium">
                        {onlineClass.sections?.length || 0} section(s)
                      </p>
                                             <p className="text-sm text-gray-600">
                         {onlineClass.sections?.map((s: any) => 
                           `${s.section?.grade}-${s.section?.section}`
                         ).join(', ')}
                       </p>
                    </div>
                  </div>
                </div>

                {/* Meeting Link */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Meeting Link</p>
                      <p className="text-sm text-gray-600 truncate max-w-md">
                        {onlineClass.meeting_link}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(onlineClass.meeting_link, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  {onlineClass.meeting_password && (
                    <p className="text-sm text-gray-600 mt-1">
                      Password: {onlineClass.meeting_password}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 