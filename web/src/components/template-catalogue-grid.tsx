'use client';

import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Eye, Download, Calendar, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPublicTemplates } from '../../../common/src/api/report-templates';
import { TemplateApplyDialog } from './template-apply-dialog';
import { TemplateDetailsDrawer } from './template-details-drawer';

interface TemplateCatalogueGridProps {
  onTemplateCloned?: (templateId: string) => void;
}

interface Template {
  id: string;
  name: string;
  board: string;
  class_range: string;
  preview_image_url?: string;
  usage_count?: number;
  last_used_at?: string;
  created_at: string;
  meta?: any;
  grade_rules?: any[];
}

export function TemplateCatalogueGrid({ onTemplateCloned }: TemplateCatalogueGridProps) {
  const [search, setSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const { data: templates, isLoading, error, refetch } = useQuery({
    queryKey: ['public-templates', { search, board: boardFilter }],
    queryFn: () => getPublicTemplates({
      search: search || undefined,
      board: boardFilter || undefined,
      limit: 50
    }),
  });

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowApplyDialog(true);
  };

  const handleViewDetails = (template: Template) => {
    setSelectedTemplate(template);
    setShowDetailsDrawer(true);
  };

  const handleTemplateCloned = (templateId: string) => {
    refetch();
    onTemplateCloned?.(templateId);
  };

  const getBoardColor = (board: string) => {
    const colors: Record<string, string> = {
      'CBSE': 'bg-blue-100 text-blue-800',
      'ICSE': 'bg-green-100 text-green-800',
      'State': 'bg-red-100 text-red-800',
      'IB': 'bg-purple-100 text-purple-800',
      'IGCSE': 'bg-orange-100 text-orange-800'
    };
    return colors[board] || 'bg-gray-100 text-gray-800';
  };

  const getPreviewImage = (template: Template) => {
    // Return preview image URL or fallback to inline SVG placeholder
    if (template.preview_image_url) {
      return template.preview_image_url;
    }
    
    // Create inline SVG placeholder
    const svg = `
      <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="400" fill="#f3f4f6"/>
        <rect x="20" y="20" width="260" height="40" fill="#e5e7eb" rx="4"/>
        <rect x="20" y="80" width="200" height="20" fill="#e5e7eb" rx="4"/>
        <rect x="20" y="120" width="260" height="240" fill="#e5e7eb" rx="8"/>
        <text x="150" y="250" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">
          Report Template
        </text>
        <text x="150" y="270" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="12">
          Preview
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load template catalogue</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={boardFilter || "all"} onValueChange={(value) => setBoardFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by Board" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Boards</SelectItem>
            <SelectItem value="CBSE">CBSE</SelectItem>
            <SelectItem value="ICSE">ICSE</SelectItem>
            <SelectItem value="State">State Board</SelectItem>
            <SelectItem value="IB">IB</SelectItem>
            <SelectItem value="IGCSE">IGCSE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <Card key={template.id} className="group hover:shadow-lg transition-shadow duration-200">
            {/* Preview Image */}
            <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
              <img
                src={getPreviewImage(template)}
                alt={`${template.name} preview`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getPreviewImage(template);
                }}
              />
              <div className="absolute top-2 right-2">
                <Badge className={getBoardColor(template.board)}>
                  {template.board}
                </Badge>
              </div>
            </div>

            <CardHeader>
              <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Classes {template.class_range}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {template.usage_count || 0} uses
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(template)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
                <Button
                  onClick={() => handleUseTemplate(template)}
                  size="sm"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {templates?.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-16 w-16 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">
            {search || boardFilter 
              ? 'Try adjusting your search or filter criteria'
              : 'No public templates are available yet'
            }
          </p>
        </div>
      )}

      {/* Dialogs */}
      {selectedTemplate && (
        <>
          <TemplateApplyDialog
            open={showApplyDialog}
            onOpenChange={setShowApplyDialog}
            template={selectedTemplate}
            onTemplateCloned={handleTemplateCloned}
          />
          <TemplateDetailsDrawer
            open={showDetailsDrawer}
            onOpenChange={setShowDetailsDrawer}
            template={selectedTemplate}
            onUseTemplate={() => {
              setShowDetailsDrawer(false);
              setShowApplyDialog(true);
            }}
          />
        </>
      )}
    </div>
  );
} 