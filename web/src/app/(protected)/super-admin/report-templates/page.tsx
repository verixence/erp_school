'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Download, 
  Upload, 
  Copy,
  Settings,
  Users,
  Star,
  MoreHorizontal,
  ArrowLeft,
  Save,
  X,
  Check,
  Code,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';

interface BoardReportTemplate {
  id: string;
  name: string;
  board_type: string;
  template_html: string;
  template_css: string;
  preview_image_url?: string;
  description?: string;
  fields_config: any;
  grade_rules: any;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  name: string;
  board_type: string;
  template_html: string;
  template_css: string;
  description: string;
  fields_config: any;
  grade_rules: any;
  is_default: boolean;
  is_active: boolean;
}

const boardTypes = [
  { value: 'CBSE', label: 'CBSE', color: 'bg-blue-100 text-blue-800' },
  { value: 'ICSE', label: 'ICSE', color: 'bg-green-100 text-green-800' },
  { value: 'SSC', label: 'SSC (State)', color: 'bg-orange-100 text-orange-800' },
  { value: 'IB', label: 'IB', color: 'bg-purple-100 text-purple-800' },
  { value: 'IGCSE', label: 'IGCSE', color: 'bg-pink-100 text-pink-800' },
  { value: 'State', label: 'State Board', color: 'bg-gray-100 text-gray-800' },
];

const defaultFieldsConfig = {
  show_logo: true,
  show_student_photo: true,
  show_grades: true,
  show_percentage: true,
  show_attendance: true,
  show_signatures: true,
  grading_system: 'TRADITIONAL'
};

const defaultGradeRules = {
  'A+': { min: 90, max: 100, description: 'Outstanding' },
  'A': { min: 80, max: 89, description: 'Excellent' },
  'B+': { min: 70, max: 79, description: 'Very Good' },
  'B': { min: 60, max: 69, description: 'Good' },
  'C': { min: 50, max: 59, description: 'Average' },
  'D': { min: 40, max: 49, description: 'Below Average' },
  'F': { min: 0, max: 39, description: 'Fail' }
};

export default function ReportTemplatesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedTemplate, setSelectedTemplate] = useState<BoardReportTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('html');
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    board_type: 'CBSE',
    template_html: '',
    template_css: '',
    description: '',
    fields_config: defaultFieldsConfig,
    grade_rules: defaultGradeRules,
    is_default: false,
    is_active: true,
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['board-report-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('board_report_templates')
        .select('*')
        .order('board_type', { ascending: true })
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as BoardReportTemplate[];
    },
    enabled: user?.role === 'super_admin',
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const { data: newTemplate, error } = await supabase
        .from('board_report_templates')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-report-templates'] });
      setIsCreateModalOpen(false);
      toast.success('Template created successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      const { data: updatedTemplate, error } = await supabase
        .from('board_report_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updatedTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-report-templates'] });
      setIsEditModalOpen(false);
      toast.success('Template updated successfully');
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('board_report_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-report-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('board_report_templates')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-report-templates'] });
      toast.success('Template status updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      board_type: 'CBSE',
      template_html: '',
      template_css: '',
      description: '',
      fields_config: defaultFieldsConfig,
      grade_rules: defaultGradeRules,
      is_default: false,
      is_active: true,
    });
  };

  const openEditModal = (template: BoardReportTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      board_type: template.board_type,
      template_html: template.template_html,
      template_css: template.template_css,
      description: template.description || '',
      fields_config: template.fields_config,
      grade_rules: template.grade_rules,
      is_default: template.is_default,
      is_active: template.is_active,
    });
    setIsEditModalOpen(true);
  };

  const getBoardColor = (boardType: string) => {
    const board = boardTypes.find(b => b.value === boardType);
    return board?.color || 'bg-gray-100 text-gray-800';
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
          <AlertDescription>
            Access denied. Only Super Admins can manage report templates.
          </AlertDescription>
        </Alert>
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
                href="/super-admin"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Board Report Templates</h1>
            <p className="text-muted-foreground mt-2">
              Manage report card templates for different education boards
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.filter(t => t.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for use
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
                {templates.reduce((sum, t) => sum + t.usage_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Schools using templates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boards Covered</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(templates.map(t => t.board_type)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Education boards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getBoardColor(template.board_type)}>
                          {template.board_type}
                        </Badge>
                        {template.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(template)}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsPreviewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => toggleActiveMutation.mutate({
                            id: template.id,
                            is_active: !template.is_active
                          })}
                        >
                          {template.is_active ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usage Count:</span>
                      <span className="font-medium">{template.usage_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{formatDate(template.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-medium">{formatDate(template.updated_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {templates.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first report template to get started.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Report Template</DialogTitle>
            <DialogDescription>
              Create a new board-specific report card template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., CBSE Standard Report Card"
                />
              </div>
              <div>
                <Label htmlFor="board_type">Board Type</Label>
                <Select 
                  value={formData.board_type} 
                  onValueChange={(value) => setFormData({ ...formData, board_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {boardTypes.map((board) => (
                      <SelectItem key={board.value} value={board.value}>
                        {board.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this template..."
                rows={3}
              />
            </div>

            {/* Template Code */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="html" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  HTML Template
                </TabsTrigger>
                <TabsTrigger value="css" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  CSS Styles
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="html" className="space-y-4">
                <Label htmlFor="template_html">HTML Template</Label>
                <Textarea
                  id="template_html"
                  value={formData.template_html}
                  onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
                  placeholder="Enter HTML template with placeholders like {{student_name}}, {{school_name}}, etc."
                  rows={20}
                  className="font-mono text-sm"
                />
              </TabsContent>
              
              <TabsContent value="css" className="space-y-4">
                <Label htmlFor="template_css">CSS Styles</Label>
                <Textarea
                  id="template_css"
                  value={formData.template_css}
                  onChange={(e) => setFormData({ ...formData, template_css: e.target.value })}
                  placeholder="Enter CSS styles for the template..."
                  rows={20}
                  className="font-mono text-sm"
                />
              </TabsContent>
            </Tabs>

            {/* Checkboxes */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_default">Set as default template for this board</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active">Active (available for use)</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => createTemplateMutation.mutate(formData)}
                disabled={!formData.name || !formData.template_html || createTemplateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the report card template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Template Name</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_board_type">Board Type</Label>
                <Select 
                  value={formData.board_type} 
                  onValueChange={(value) => setFormData({ ...formData, board_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {boardTypes.map((board) => (
                      <SelectItem key={board.value} value={board.value}>
                        {board.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Template Code */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="html" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  HTML Template
                </TabsTrigger>
                <TabsTrigger value="css" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  CSS Styles
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="html" className="space-y-4">
                <Label htmlFor="edit_template_html">HTML Template</Label>
                <Textarea
                  id="edit_template_html"
                  value={formData.template_html}
                  onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
                  rows={20}
                  className="font-mono text-sm"
                />
              </TabsContent>
              
              <TabsContent value="css" className="space-y-4">
                <Label htmlFor="edit_template_css">CSS Styles</Label>
                <Textarea
                  id="edit_template_css"
                  value={formData.template_css}
                  onChange={(e) => setFormData({ ...formData, template_css: e.target.value })}
                  rows={20}
                  className="font-mono text-sm"
                />
              </TabsContent>
            </Tabs>

            {/* Checkboxes */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit_is_default">Set as default template for this board</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit_is_active">Active (available for use)</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedTemplate) {
                    updateTemplateMutation.mutate({
                      id: selectedTemplate.id,
                      data: formData
                    });
                  }
                }}
                disabled={!formData.name || !formData.template_html || updateTemplateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateTemplateMutation.isPending ? 'Updating...' : 'Update Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview of {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="border rounded-lg p-4 bg-white">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: `<style>${selectedTemplate.template_css}</style>${selectedTemplate.template_html}` 
                }}
                className="max-w-full overflow-x-auto"
                style={{ fontSize: '12px', transform: 'scale(0.8)', transformOrigin: 'top left' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 