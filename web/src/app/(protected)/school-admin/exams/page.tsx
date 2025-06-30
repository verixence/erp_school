'use client';

import { useState } from 'react';
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
  Eye
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
import { useAuth } from '@/hooks/use-auth';

export type ExamType = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'unit_test' | 'other';

export interface ExamGroup {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  is_published: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExamGroupData {
  name: string;
  description?: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  is_published: boolean;
}

const mockExamGroups: ExamGroup[] = [
  {
    id: '1',
    school_id: 'school1',
    name: 'First Term Exam 2024',
    description: 'First term examination for all classes',
    exam_type: 'quarterly',
    start_date: '2024-03-01',
    end_date: '2024-03-15',
    is_published: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2', 
    school_id: 'school1',
    name: 'Monthly Test October',
    description: 'Monthly assessment for October',
    exam_type: 'monthly',
    start_date: '2024-10-20',
    end_date: '2024-10-25',
    is_published: false,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-10T09:00:00Z'
  }
];

const examTypeOptions: { value: ExamType; label: string }[] = [
  { value: 'monthly', label: 'Monthly Test' },
  { value: 'quarterly', label: 'Quarterly Exam' },
  { value: 'half_yearly', label: 'Half Yearly Exam' },
  { value: 'annual', label: 'Annual Exam' },
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'other', label: 'Other' },
];

export default function ExamsPage() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [examGroups] = useState<ExamGroup[]>(mockExamGroups);
  const [isLoading] = useState(false);

  const [formData, setFormData] = useState<CreateExamGroupData>({
    name: '',
    description: '',
    exam_type: 'monthly',
    start_date: '',
    end_date: '',
    is_published: false,
  });

  const handleCreateExamGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating exam group:', formData);
    setShowCreateModal(false);
    setFormData({
      name: '',
      description: '',
      exam_type: 'monthly',
      start_date: '',
      end_date: '',
      is_published: false,
    });
  };

  const handleDeleteExamGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam group? This will delete all associated papers and marks.')) {
      return;
    }
    console.log('Deleting exam group:', id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-600 mt-1">Create and manage exam groups, papers, and marks</p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Exam Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Exam Group</DialogTitle>
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
                    {examTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
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
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  Create Exam Group
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Exam Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examGroups.map((examGroup, index) => (
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
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <FileText className="w-4 h-4" />
                    <span>0 Papers</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>0 Students</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExamGroup(examGroup.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
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
    </div>
  );
} 