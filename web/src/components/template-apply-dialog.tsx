'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { toast } from 'sonner';

interface TemplateApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  onTemplateCloned?: (templateId: string) => void;
}

export function TemplateApplyDialog({
  open,
  onOpenChange,
  template,
  onTemplateCloned
}: TemplateApplyDialogProps) {
  const [templateName, setTemplateName] = useState(template?.name ? `${template.name} (Copy)` : '');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/report-templates/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // <-- Add this line
        body: JSON.stringify({
          templateId: template.id,
          // schoolId will be auto-detected from user
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone template');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Template cloned successfully!');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      onTemplateCloned?.(data.template.id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone template');
    },
  });

  const handleClone = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    cloneMutation.mutate();
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

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Use Template</DialogTitle>
          <DialogDescription>
            Clone this template to your school and customize it as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getBoardColor(template.board)}>
                    {template.board}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Classes {template.class_range}
                  </span>
                </div>
              </div>
              {template.preview_image_url && (
                <img
                  src={template.preview_image_url}
                  alt="Template preview"
                  className="w-16 h-20 object-cover rounded border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>

          {/* Template Name Input */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name in Your School</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter a name for this template"
            />
          </div>

          {/* Features Info */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>What you can customize:</strong>
              <ul className="list-disc list-inside mt-1 text-sm">
                <li>School logo and colors</li>
                <li>Grade rules and scoring</li>
                <li>Language translations (i18n)</li>
                <li>Template name and settings</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Usage Info */}
          <div className="text-sm text-gray-600">
            <p>
              This template has been used by <strong>{template.usage_count || 0}</strong> schools.
              Once cloned, it will appear in your school's template library where you can customize
              it further and generate report cards.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={cloneMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              className="flex-1"
              disabled={cloneMutation.isPending || !templateName.trim()}
            >
              {cloneMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                'Clone Template'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 