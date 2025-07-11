'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Plus, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Star, 
  Users, 
  Calendar,
  AlertCircle,
  CheckCircle,
  BookOpen,
  Palette,
  Settings,
  Globe,
  Zap,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

interface PublicTemplate {
  id: string;
  name: string;
  board: string;
  class_range: string;
  preview_image_url?: string;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  created_by: string;
  description?: string;
}

interface TemplateUploadForm {
  name: string;
  board: string;
  class_range: string;
  description: string;
  template_html: string;
  template_css: string;
  preview_image?: File;
  grade_rules: any;
  i18n_bundle: Record<string, Record<string, string>>;
  meta: any;
}

const defaultGradeRules = {
  gradeBands: [
    { min: 90, max: 100, grade: 'A+', gpa: 4.0, color: '#22c55e' },
    { min: 80, max: 89, grade: 'A', gpa: 3.7, color: '#3b82f6' },
    { min: 70, max: 79, grade: 'B+', gpa: 3.3, color: '#8b5cf6' },
    { min: 60, max: 69, grade: 'B', gpa: 3.0, color: '#f59e0b' },
    { min: 50, max: 59, grade: 'C', gpa: 2.0, color: '#ef4444' },
    { min: 0, max: 49, grade: 'F', gpa: 0.0, color: '#dc2626' },
  ],
  calculationType: 'percentage',
  weights: {},
  passMarks: 35,
};

const defaultI18nBundle = {
  en: {
    reportTitle: 'Academic Report Card',
    studentName: 'Student Name',
    grade: 'Grade',
    section: 'Section',
    rollNo: 'Roll Number',
    totalMarks: 'Total Marks',
    obtainedMarks: 'Obtained Marks',
    percentage: 'Percentage',
    rank: 'Rank',
    remarks: 'Remarks',
    principalSignature: 'Principal',
    classTeacherSignature: 'Class Teacher',
    parentSignature: 'Parent/Guardian',
  },
};

const defaultMeta = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  showWatermark: true,
  showSchoolLogo: true,
  version: '1.0',
};

export default function TemplateCataloguePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<TemplateUploadForm>({
    name: '',
    board: 'CBSE',
    class_range: '1-12',
    description: '',
    template_html: '',
    template_css: '',
    grade_rules: defaultGradeRules,
    i18n_bundle: defaultI18nBundle,
    meta: defaultMeta,
  });

  const queryClient = useQueryClient();

  // Fetch public templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['public-templates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/public-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  // Upload template mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: TemplateUploadForm) => {
      const formData = new FormData();
      
      // Append all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'preview_image' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value as string);
        }
      });

      const response = await fetch('/api/admin/upload-template', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload template');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Template uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['public-templates'] });
      setIsUploadOpen(false);
      setUploadForm({
        name: '',
        board: 'CBSE',
        class_range: '1-12',
        description: '',
        template_html: '',
        template_css: '',
        grade_rules: defaultGradeRules,
        i18n_bundle: defaultI18nBundle,
        meta: defaultMeta,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateUploadForm = (field: keyof TemplateUploadForm, value: any) => {
    setUploadForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      updateUploadForm('preview_image', file);
    }
  };

  const getBoardColor = (board: string) => {
    const colors: Record<string, string> = {
      'CBSE': 'bg-blue-100 text-blue-800 border-blue-200',
      'ICSE': 'bg-green-100 text-green-800 border-green-200',
      'State': 'bg-red-100 text-red-800 border-red-200',
      'IB': 'bg-purple-100 text-purple-800 border-purple-200',
      'IGCSE': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[board] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only Super Admins can manage the Template Catalogue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Template Catalogue</h1>
          <p className="text-gray-600 mt-1">
            Manage public report card templates for all schools
          </p>
        </div>
        <Button 
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Upload Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all boards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.reduce((sum: number, t: PublicTemplate) => sum + (t.usage_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Schools using templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...templates.map((t: PublicTemplate) => t.usage_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Highest usage count
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter((t: PublicTemplate) => {
                if (!t.last_used_at) return false;
                const lastUsed = new Date(t.last_used_at);
                const thisMonth = new Date();
                thisMonth.setDate(1);
                return lastUsed >= thisMonth;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Templates used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="guide">Upload Guide</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Board Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Board Distribution</CardTitle>
                <CardDescription>Templates by education board</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['CBSE', 'ICSE', 'State', 'IB', 'IGCSE'].map(board => {
                    const count = templates.filter((t: PublicTemplate) => t.board === board).length;
                    const percentage = templates.length > 0 ? (count / templates.length) * 100 : 0;
                    
                    return (
                      <div key={board} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getBoardColor(board)}>{board}</Badge>
                          <span className="text-sm text-gray-600">{count} templates</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest template usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates
                    .filter((t: PublicTemplate) => t.last_used_at)
                    .sort((a: PublicTemplate, b: PublicTemplate) => 
                      new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime()
                    )
                    .slice(0, 5)
                    .map((template: PublicTemplate) => (
                      <div key={template.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{template.name}</p>
                          <p className="text-xs text-gray-500">
                            Used {formatDate(template.last_used_at!)}
                          </p>
                        </div>
                        <Badge className={getBoardColor(template.board)}>
                          {template.board}
                        </Badge>
                      </div>
                    ))}
                  {templates.filter((t: PublicTemplate) => t.last_used_at).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template: PublicTemplate) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            Classes {template.class_range}
                          </CardDescription>
                        </div>
                        <Badge className={getBoardColor(template.board)}>
                          {template.board}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Preview Image */}
                      <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                        {template.preview_image_url ? (
                          <img
                            src={template.preview_image_url}
                            alt="Template preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjI2MCIgaGVpZ2h0PSIzNjAiIHJ4PSI4IiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSI0MCIgeT0iNDAiIHdpZHRoPSIyMjAiIGhlaWdodD0iMjAiIHJ4PSI0IiBmaWxsPSIjRTVFN0VCIi8+CjxyZWN0IHg9IjQwIiB5PSI4MCIgd2lkdGg9IjE4MCIgaGVpZ2h0PSIxNiIgcng9IjQiIGZpbGw9IiNFNUU3RUIiLz4KPHJlY3QgeD0iNDAiIHk9IjEyMCIgd2lkdGg9IjIyMCIgaGVpZ2h0PSIxNDAiIHJ4PSI0IiBmaWxsPSIjRjlGQUZCIiBzdHJva2U9IiNFNUU3RUIiLz4KPHR5cGUgeD0iMTUwIiB5PSIxOTUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZCNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UmVwb3J0IFRlbXBsYXRlPC90ZXh0Pgo8dGV4dCB4PSIxNTAiIHk9IjIxNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNkI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">No Preview</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Template Info */}
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      {/* Usage Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {template.usage_count || 0} schools
                        </span>
                        <span>
                          Created {formatDate(template.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="px-2">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {templates.length === 0 && !isLoading && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
                <p className="text-gray-600 mb-4">
                  Upload your first template to get started with the catalogue.
                </p>
                <Button onClick={() => setIsUploadOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Guide Tab */}
        <TabsContent value="guide" className="space-y-6">
          <TemplateUploadGuide />
        </TabsContent>
      </Tabs>

      {/* Upload Template Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload New Template</DialogTitle>
            <DialogDescription>
              Create a new public template that schools can use for their report cards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={uploadForm.name}
                  onChange={(e) => updateUploadForm('name', e.target.value)}
                  placeholder="e.g., CBSE Primary Report Card"
                />
              </div>

              <div>
                <Label htmlFor="board">Board *</Label>
                <Select 
                  value={uploadForm.board} 
                  onValueChange={(value) => updateUploadForm('board', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                    <SelectItem value="ICSE">ICSE</SelectItem>
                    <SelectItem value="State">State Board</SelectItem>
                    <SelectItem value="IB">IB</SelectItem>
                    <SelectItem value="IGCSE">IGCSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class-range">Class Range *</Label>
                <Input
                  id="class-range"
                  value={uploadForm.class_range}
                  onChange={(e) => updateUploadForm('class_range', e.target.value)}
                  placeholder="e.g., 1-5, 6-10, 11-12"
                />
              </div>

              <div>
                <Label htmlFor="preview-image">Preview Image</Label>
                <Input
                  id="preview-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a preview image (max 5MB, PNG/JPG)
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) => updateUploadForm('description', e.target.value)}
                placeholder="Describe this template and its features..."
                rows={3}
              />
            </div>

            {/* Template Code */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="html">HTML Template *</Label>
                <Textarea
                  id="html"
                  value={uploadForm.template_html}
                  onChange={(e) => updateUploadForm('template_html', e.target.value)}
                  className="font-mono text-sm"
                  rows={10}
                  placeholder="Enter HTML template code..."
                />
              </div>

              <div>
                <Label htmlFor="css">CSS Styles *</Label>
                <Textarea
                  id="css"
                  value={uploadForm.template_css}
                  onChange={(e) => updateUploadForm('template_css', e.target.value)}
                  className="font-mono text-sm"
                  rows={10}
                  placeholder="Enter CSS styles..."
                />
              </div>
            </div>

            {/* Requirements Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Template Requirements:</strong>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                  <li>Use Handlebars syntax for dynamic content (e.g., {'{{student.name}}'})</li>
                  <li>Include responsive CSS for different screen sizes</li>
                  <li>Support for school logo placement ({'{{school.logo_url}}'})</li>
                  <li>Customizable grade rules and color schemes</li>
                  <li>Multi-language support with i18n keys ({'{{t.reportTitle}}'})</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => uploadMutation.mutate(uploadForm)}
                disabled={uploadMutation.isPending || !uploadForm.name || !uploadForm.template_html}
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Upload Guide Component
function TemplateUploadGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Template Upload Guide
          </CardTitle>
          <CardDescription>
            Learn how to create and upload professional report card templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Requirements Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Template Requirements
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Technical Requirements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Valid HTML5 structure</li>
                    <li>• CSS for styling and layout</li>
                    <li>• Handlebars template syntax</li>
                    <li>• Responsive design (mobile-friendly)</li>
                    <li>• Print-optimized styles</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Content Requirements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Student information section</li>
                    <li>• Marks/grades table</li>
                    <li>• School branding area</li>
                    <li>• Signature sections</li>
                    <li>• Multi-language support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Available Variables */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Available Template Variables
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Student Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono">
                    <div>{'{{student.full_name}}'}</div>
                    <div>{'{{student.admission_no}}'}</div>
                    <div>{'{{student.section}}'}</div>
                    <div>{'{{student.roll_no}}'}</div>
                    <div>{'{{student.date_of_birth}}'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">School Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono">
                    <div>{'{{school.name}}'}</div>
                    <div>{'{{school.address}}'}</div>
                    <div>{'{{school.logo_url}}'}</div>
                    <div>{'{{school.principal_name}}'}</div>
                    <div>{'{{school.phone_number}}'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Exam & Grades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono">
                    <div>{'{{exam.name}}'}</div>
                    <div>{'{{exam.academic_year}}'}</div>
                    <div>{'{{overall.percentage}}'}</div>
                    <div>{'{{overall.grade}}'}</div>
                    <div>{'{{overall.rank}}'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Handlebars Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-600" />
              Handlebars Examples
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
{`<!-- Basic variable usage -->
<h1>{{school.name}}</h1>
<p>Student: {{student.full_name}}</p>

<!-- Conditional rendering -->
{{#if school.logo_url}}
  <img src="{{school.logo_url}}" alt="School Logo" />
{{/if}}

<!-- Loop through subjects -->
{{#each subjects}}
  <tr>
    <td>{{this.name}}</td>
    <td>{{this.marks}}</td>
    <td>{{this.grade}}</td>
  </tr>
{{/each}}

<!-- Internationalization -->
<h2>{{t.reportTitle}}</h2>
<span>{{t.studentName}}: {{student.full_name}}</span>`}
                </pre>
              </div>
            </div>
          </div>

          {/* Customization Features */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Palette className="h-5 w-5 text-orange-600" />
              Customization Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">School Customization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Logo placement and sizing</li>
                    <li>• Color scheme adaptation</li>
                    <li>• Font family selection</li>
                    <li>• Header/footer customization</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Grade Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Custom grade bands</li>
                    <li>• Color-coded grades</li>
                    <li>• GPA calculation methods</li>
                    <li>• Pass/fail criteria</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Best Practices */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Best Practices
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Use semantic HTML for better accessibility</li>
                <li>• Include print-specific CSS media queries</li>
                <li>• Test with different data scenarios</li>
                <li>• Ensure responsive design for mobile viewing</li>
                <li>• Use consistent spacing and typography</li>
                <li>• Include fallbacks for missing data</li>
                <li>• Optimize for A4 paper size by default</li>
              </ul>
            </div>
          </div>

          {/* Sample Template */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Sample Template
            </h3>
            <div className="flex gap-4">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download CBSE Template
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download ICSE Template
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download State Board Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 