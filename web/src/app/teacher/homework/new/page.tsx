'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, ArrowLeft, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface Section {
  id: string;
  grade: string;
  section: string;
}

export default function NewHomework() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    section: '',
    subject: '',
    title: '',
    description: '',
    due_date: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Get teacher's sections
  const { data: sections = [] } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get sections via section_teachers junction table
      const { data, error } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (error) throw error;
      
      // Transform the data to match the expected Section interface
      const sectionsData = data?.map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section
      })) || [];

      return sectionsData as Section[];
    },
    enabled: !!user?.id,
  });

  const createHomeworkMutation = useMutation({
    mutationFn: async (homework: any) => {
      let fileUrl = null;
      
      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `homework/${user?.school_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        
        fileUrl = publicUrl;
        setUploading(false);
      }

      const { data, error } = await supabase
        .from('homeworks')
        .insert({
          ...homework,
          file_url: fileUrl
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
      toast.success('Homework created successfully!');
      router.push('/teacher/homework');
    },
    onError: (error: any) => {
      setUploading(false);
      toast.error(error.message || 'Failed to create homework');
    },
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.replace('/not-authorized');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.school_id || !formData.title || !formData.section || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    await createHomeworkMutation.mutateAsync({
      school_id: user.school_id,
      section: formData.section,
      subject: formData.subject,
      title: formData.title,
      description: formData.description,
      due_date: formData.due_date,
      created_by: user.id,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      // Check file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, DOC, DOCX, and image files are allowed');
        return;
      }
      
      setSelectedFile(file);
      toast.success('File selected successfully');
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Create Homework</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section Selection */}
              <div>
                <Label htmlFor="section">Section *</Label>
                <Select 
                  value={formData.section} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, section: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(section => (
                      <SelectItem 
                        key={section.id} 
                        value={`${section.grade} ${section.section}`}
                      >
                        {section.grade} {section.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Enter subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  required
                />
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter homework title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter homework description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                />
              </div>

              {/* File Upload */}
              <div>
                <Label>Attachment</Label>
                {!selectedFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Click to upload file</p>
                      <p className="text-sm text-gray-500">PDF, DOC, DOCX, or image files (max 10MB)</p>
                    </label>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Upload className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeFile}
                      >
                        Remove
                      </Button>
                                         </div>
                   </div>
                 )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createHomeworkMutation.isPending || uploading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                  {uploading ? 'Uploading file...' : createHomeworkMutation.isPending ? 'Creating...' : 'Create Homework'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 