'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Download, Palette, Settings, Sparkles, Edit, Eye, Copy, Trash2 } from 'lucide-react';
import { useReportTemplates } from '../../../../../../common/src/api/report-templates';
import { useAuth } from '@/hooks/use-auth';
import { TemplateCatalogueGrid } from '@/components/template-catalogue-grid';
import { TemplateCustomizationModal } from './components/template-customization-modal';
import { MigrationGuard } from '@/components/migration-guard';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Template {
  id: string;
  name: string;
  board: string;
  class_range: string;
  is_default: boolean;
  origin_template_id?: string;
  created_at: string;
  updated_at: string;
  meta?: any;
  preview_image_url?: string;
}

export default function ReportTemplatesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('catalogue');
  const [customizationModalOpen, setCustomizationModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading } = useReportTemplates(user?.school_id || undefined);

  const handleTemplateCloned = (templateId: string) => {
    toast.success('Template added to your library!');
    setActiveTab('my-templates');
  };

  const handleCustomizeTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCustomizationModalOpen(true);
  };

  const handleCustomizationSuccess = () => {
    toast.success('Template customized successfully!');
    setCustomizationModalOpen(false);
    setSelectedTemplate(null);
  };

  const customTemplates = templates?.filter((t: Template) => !t.origin_template_id) || [];
  const clonedTemplates = templates?.filter((t: Template) => t.origin_template_id) || [];

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <MigrationGuard />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Templates</h1>
          <p className="text-gray-600 mt-1">
            Choose from our curated template catalogue or create custom report card designs
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total templates in library
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Catalogue</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clonedTemplates.length}</div>
            <p className="text-xs text-muted-foreground">
              Cloned from public templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Made</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customTemplates.length}</div>
            <p className="text-xs text-muted-foreground">
              Created from scratch
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customized</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates?.filter((t: Template) => t.meta?.customization).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              With custom branding
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="catalogue" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Template Catalogue
          </TabsTrigger>
          <TabsTrigger value="my-templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Templates ({templates?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Create Custom
          </TabsTrigger>
        </TabsList>

        {/* Template Catalogue Tab */}
        <TabsContent value="catalogue" className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Professional Templates</h3>
                <p className="text-gray-600">
                  Ready-to-use report card templates designed by education experts
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">CBSE Compliant</Badge>
              <Badge variant="secondary">State Board Ready</Badge>
              <Badge variant="secondary">Customizable</Badge>
              <Badge variant="secondary">Professional Design</Badge>
            </div>
          </div>

          <TemplateCatalogueGrid onTemplateCloned={handleTemplateCloned} />
        </TabsContent>

        {/* My Templates Tab */}
        <TabsContent value="my-templates" className="space-y-6">
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
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-8">
              {/* Cloned Templates */}
              {clonedTemplates.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">From Template Catalogue</h3>
                    <Badge variant="outline">{clonedTemplates.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clonedTemplates.map((template: Template) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg line-clamp-2">{template.name}</CardTitle>
                                <CardDescription className="mt-1">
                                  Classes {template.class_range}
                                  {template.is_default && (
                                    <Badge variant="default" className="ml-2">Default</Badge>
                                  )}
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

                            {/* Customization Status */}
                            {template.meta?.customization && (
                              <div className="mb-3">
                                <Badge variant="secondary" className="text-xs">
                                  <Settings className="h-3 w-3 mr-1" />
                                  Customized
                                </Badge>
                              </div>
                            )}

                            {/* Template Info */}
                            <div className="text-xs text-gray-500 mb-4">
                              <p>Updated {formatDate(template.updated_at)}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleCustomizeTemplate(template)}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Customize
                              </Button>
                              <Button size="sm" className="flex-1">
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                              <Button variant="outline" size="sm" className="px-2">
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Templates */}
              {customTemplates.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold">Custom Templates</h3>
                    <Badge variant="outline">{customTemplates.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customTemplates.map((template: Template) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg line-clamp-2">{template.name}</CardTitle>
                                <CardDescription className="mt-1">
                                  Classes {template.class_range}
                                  {template.is_default && (
                                    <Badge variant="default" className="ml-2">Default</Badge>
                                  )}
                                </CardDescription>
                              </div>
                              <Badge className={getBoardColor(template.board)}>
                                {template.board}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" className="flex-1">
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
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
                </div>
              )}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start by browsing our template catalogue to find the perfect design for your school.
                </p>
                <Button onClick={() => setActiveTab('catalogue')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Browse Catalogue
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Create Custom Tab */}
        <TabsContent value="custom" className="space-y-6">
          <Card className="text-center py-12">
            <CardContent>
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Create Custom Template</h3>
              <p className="text-gray-600 mb-4">
                Build a completely custom report card template from scratch.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Start Creating
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Customization Modal */}
      <TemplateCustomizationModal
        open={customizationModalOpen}
        onOpenChange={setCustomizationModalOpen}
        template={selectedTemplate}
        onSuccess={handleCustomizationSuccess}
      />
    </div>
  );
} 