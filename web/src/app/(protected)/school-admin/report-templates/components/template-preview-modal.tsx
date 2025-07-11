'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Eye,
  FileText,
  Printer,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  usePreviewReportTemplate,
  type ReportTemplate 
} from '@erp/common';
import { toast } from 'sonner';

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate | null;
}

export function TemplatePreviewModal({ open, onOpenChange, template }: TemplatePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [previewData, setPreviewData] = useState<any>(null);
  
  const previewMutation = usePreviewReportTemplate();

  useEffect(() => {
    if (template && open) {
      // Generate preview with sample data
      generatePreview();
    }
  }, [template, open, selectedLanguage]);

  const generatePreview = async () => {
    if (!template) return;

    try {
      const sampleData = {
        student: {
          id: 'sample-student',
          full_name: 'John Doe',
          admission_no: 'ADM001',
          section: 'Class 10-A',
          roll_no: '15',
          date_of_birth: '2008-05-15',
        },
        school: {
          name: 'Green Valley High School',
          address: '123 Education Street, Learning City',
          logo_url: '/api/placeholder/80/80',
          phone: '+1-234-567-8900',
          website: 'www.greenvalley.edu',
        },
        exam: {
          name: 'First Term Examination',
          academic_year: '2024-25',
          exam_date: '2024-12-15',
        },
        subjects: [
          { name: 'Mathematics', total_marks: 100, obtained_marks: 85, grade: 'A' },
          { name: 'Science', total_marks: 100, obtained_marks: 92, grade: 'A+' },
          { name: 'English', total_marks: 100, obtained_marks: 78, grade: 'B+' },
          { name: 'Social Studies', total_marks: 100, obtained_marks: 82, grade: 'A' },
          { name: 'Hindi', total_marks: 100, obtained_marks: 75, grade: 'B+' },
        ],
        overall: {
          total_marks: 500,
          obtained_marks: 412,
          percentage: 82.4,
          grade: 'A',
          rank: 5,
        },
      };

      const result = await previewMutation.mutateAsync({
        templateId: template.id,
        sampleData,
        language: selectedLanguage,
      });
      
      setPreviewData(result);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    }
  };

  const downloadPdf = () => {
    if (!previewData) return;
    
    // Create a blob with the HTML content and trigger download
    const blob = new Blob([previewData.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template?.name}-preview.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printPreview = () => {
    if (!previewData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(previewData.html);
    printWindow.document.close();
    printWindow.print();
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setZoom(1);

  if (!template) return null;

  const availableLanguages = Object.keys(template.i18n_bundle || {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <div>
                <DialogTitle className="text-xl">Template Preview</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">{template.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={`${
                template.board === 'CBSE' ? 'bg-blue-100 text-blue-800' :
                template.board === 'ICSE' ? 'bg-green-100 text-green-800' :
                template.board === 'State' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {template.board}
              </Badge>
              <Badge variant="outline">{template.class_range}</Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Controls */}
        <div className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              {availableLanguages.length > 1 && (
                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Language:</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map(lang => (
                        <SelectItem key={lang} value={lang}>
                          {lang.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center space-x-2">
                <Label className="text-sm">Zoom:</Label>
                <Button variant="outline" size="sm" onClick={zoomOut}>
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <span className="text-sm min-w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={zoomIn}>
                  <ZoomIn className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetZoom}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={printPreview}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPdf}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {previewMutation.isPending ? (
            <div className="flex items-center justify-center h-full">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating preview...</p>
              </motion.div>
            </div>
          ) : previewData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-none"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: `${100 / zoom}%`,
              }}
            >
              <Card className="bg-white shadow-lg mx-auto" style={{ width: '8.5in', minHeight: '11in' }}>
                <CardContent className="p-0">
                  <div 
                    dangerouslySetInnerHTML={{ __html: previewData.html }}
                    className="report-preview"
                  />
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Preview Available</h3>
                <p className="text-gray-500">Unable to generate preview for this template.</p>
              </motion.div>
            </div>
          )}
        </div>

        {/* Template Info Footer */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Paper Size</Label>
              <p className="font-medium">{template.meta?.paperSize || 'A4'}</p>
            </div>
            <div>
              <Label className="text-gray-600">Orientation</Label>
              <p className="font-medium capitalize">{template.meta?.orientation || 'Portrait'}</p>
            </div>
            <div>
              <Label className="text-gray-600">Grade Bands</Label>
              <p className="font-medium">{template.grade_rules?.gradeBands?.length || 0}</p>
            </div>
            <div>
              <Label className="text-gray-600">Languages</Label>
              <p className="font-medium">{availableLanguages.length}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 