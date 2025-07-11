'use client';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Calendar, Users, Download, Eye, Palette, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TemplateDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  onUseTemplate?: () => void;
}

export function TemplateDetailsDrawer({
  open,
  onOpenChange,
  template,
  onUseTemplate
}: TemplateDetailsDrawerProps) {
  if (!template) return null;

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

  const getThemeName = (meta: any) => {
    const theme = meta?.theme;
    const themeNames: Record<string, string> = {
      'cbse-classic': 'CBSE Classic',
      'ssc-bold': 'SSC Bold',
      'modern-minimal': 'Modern Minimal',
      'elegant-formal': 'Elegant Formal'
    };
    return themeNames[theme] || 'Custom Theme';
  };

  const getCustomizableFeatures = (meta: any) => {
    const customizable = meta?.customizable || [];
    const featureNames: Record<string, string> = {
      'colors': 'Colors & Branding',
      'logo': 'School Logo',
      'grade_rules': 'Grade Rules',
      'layout': 'Layout Options',
      'fonts': 'Typography'
    };
    return customizable.map((feature: string) => featureNames[feature] || feature);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{template.name}</SheetTitle>
          <SheetDescription className="text-left">
            Detailed information about this template
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Preview Image */}
          {template.preview_image_url && (
            <div className="relative">
              <img
                src={template.preview_image_url}
                alt={`${template.name} preview`}
                className="w-full h-64 object-cover rounded-lg border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute top-3 right-3">
                <Badge className={getBoardColor(template.board)}>
                  {template.board}
                </Badge>
              </div>
            </div>
          )}

          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Board</p>
                  <Badge className={getBoardColor(template.board)}>
                    {template.board}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Class Range</p>
                  <p className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {template.class_range}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Theme</p>
                <p className="flex items-center gap-1">
                  <Palette className="h-4 w-4" />
                  {getThemeName(template.meta)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Times Used</span>
                </div>
                <span className="font-medium">{template.usage_count || 0}</span>
              </div>
              {template.last_used_at && (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Last Used</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(template.last_used_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customization Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customization Options</CardTitle>
              <CardDescription>
                What you can modify after cloning this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getCustomizableFeatures(template.meta).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
                {getCustomizableFeatures(template.meta).length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    Basic customization options available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grade Rules Preview */}
          {template.grade_rules && Array.isArray(template.grade_rules) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grade Rules</CardTitle>
                <CardDescription>
                  Grading system used in this template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {template.grade_rules.slice(0, 6).map((rule: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: rule.color }}
                      >
                        {rule.grade}
                      </span>
                      <span className="text-xs text-gray-600">
                        {rule.min}-{rule.max}%
                      </span>
                    </div>
                  ))}
                </div>
                {template.grade_rules.length > 6 && (
                  <p className="text-xs text-gray-500 mt-2">
                    +{template.grade_rules.length - 6} more grades
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onUseTemplate}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Use This Template
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 