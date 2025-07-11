'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  X, 
  FileText, 
  Palette, 
  Code, 
  Globe, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useTemplateCategories,
  type ReportTemplate,
  type CreateReportTemplateData,
  type UpdateReportTemplateData
} from '@erp/common';
import { toast } from 'sonner';
import { GradeRulesEditor } from './grade-rules-editor';
import { I18nEditor } from './i18n-editor';
import { TemplateEditor } from './template-editor';

interface TemplateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate | null;
  onSuccess: () => void;
}

type FormData = CreateReportTemplateData & {
  id?: string;
};

const defaultFormData: FormData = {
  name: '',
  board: 'CBSE',
  class_range: '1-12',
  is_default: false,
  grade_rules: {
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
  },
  i18n_bundle: {
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
  },
  template_html: '',
  template_css: '',
  meta: {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    showWatermark: true,
    showSchoolLogo: true,
    version: '1.0',
  },
};

const steps = [
  { id: 'basic', title: 'Basic Info', icon: FileText },
  { id: 'grading', title: 'Grade Rules', icon: Palette },
  { id: 'i18n', title: 'Languages', icon: Globe },
  { id: 'template', title: 'Template', icon: Code },
  { id: 'settings', title: 'Settings', icon: Settings },
];

export function TemplateFormModal({ open, onOpenChange, template, onSuccess }: TemplateFormModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [previewMode, setPreviewMode] = useState(false);

  const createMutation = useCreateReportTemplate();
  const updateMutation = useUpdateReportTemplate();
  const { data: categories = [] } = useTemplateCategories();

  const isEditing = !!template;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (template) {
      setFormData({
        id: template.id,
        name: template.name,
        board: template.board,
        class_range: template.class_range,
        is_default: template.is_default,
        grade_rules: template.grade_rules,
        i18n_bundle: template.i18n_bundle,
        template_html: template.template_html,
        template_css: template.template_css,
        meta: template.meta,
      });
    } else {
      setFormData(defaultFormData);
    }
    setCurrentStep(0);
  }, [template, open]);

  const handleSubmit = async () => {
    try {
      if (isEditing && formData.id) {
        await updateMutation.mutateAsync(formData as UpdateReportTemplateData);
        toast.success('Template updated successfully!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Template created successfully!');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template. Please try again.');
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <currentStepData.icon className="w-5 h-5" />
            <span>{isEditing ? 'Edit' : 'Create'} Report Template</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step Navigation */}
        <div className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center cursor-pointer transition-colors ${
                  index === currentStep
                    ? 'text-blue-600'
                    : index < currentStep
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
                onClick={() => setCurrentStep(index)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                  index === currentStep
                    ? 'border-blue-600 bg-blue-50'
                    : index < currentStep
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                }`}>
                  {index + 1}
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:inline">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {currentStep === 0 && (
                <BasicInfoStep 
                  formData={formData} 
                  updateFormData={updateFormData}
                  categories={categories}
                />
              )}
              
              {currentStep === 1 && (
                <GradeRulesStep 
                  formData={formData} 
                  updateFormData={updateFormData} 
                />
              )}
              
              {currentStep === 2 && (
                <I18nStep 
                  formData={formData} 
                  updateFormData={updateFormData} 
                />
              )}
              
              {currentStep === 3 && (
                <TemplateStep 
                  formData={formData} 
                  updateFormData={updateFormData}
                  onSave={handleSubmit}
                />
              )}
              
              {currentStep === 4 && (
                <SettingsStep 
                  formData={formData} 
                  updateFormData={updateFormData} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button onClick={nextStep}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Save className="w-4 h-4 mr-1" />
                {isLoading ? 'Saving...' : (isEditing ? 'Update' : 'Create') + ' Template'}
              </Button>
            )}
          </div>
          
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
function BasicInfoStep({ formData, updateFormData, categories }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="e.g., CBSE Grade 1-5 Report Card"
            />
          </div>
          
          <div>
            <Label htmlFor="board">Board *</Label>
            <Select 
              value={formData.board} 
              onValueChange={(value) => updateFormData('board', value)}
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="classRange">Class Range</Label>
            <Input
              id="classRange"
              value={formData.class_range}
              onChange={(e) => updateFormData('class_range', e.target.value)}
              placeholder="e.g., 1-5, 6-10, KG-2"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isDefault"
              checked={formData.is_default}
              onCheckedChange={(checked: boolean) => updateFormData('is_default', checked)}
            />
            <Label htmlFor="isDefault">Set as default template</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GradeRulesStep({ formData, updateFormData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grading System Configuration</CardTitle>
      </CardHeader>
      <CardContent>
                  <GradeRulesEditor
            value={formData.grade_rules}
            onChange={(rules: any) => updateFormData('grade_rules', rules)}
          />
      </CardContent>
    </Card>
  );
}

function I18nStep({ formData, updateFormData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-language Support</CardTitle>
      </CardHeader>
      <CardContent>
        <I18nEditor
          value={formData.i18n_bundle}
          onChange={(bundle: any) => updateFormData('i18n_bundle', bundle)}
        />
      </CardContent>
    </Card>
  );
}

function TemplateStep({ formData, updateFormData, onSave }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Design</CardTitle>
      </CardHeader>
      <CardContent>
        <TemplateEditor
          htmlValue={formData.template_html}
          cssValue={formData.template_css}
          onHtmlChange={(html: string) => updateFormData('template_html', html)}
          onCssChange={(css: string) => updateFormData('template_css', css)}
          onSave={onSave}
        />
      </CardContent>
    </Card>
  );
}

function SettingsStep({ formData, updateFormData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="paperSize">Paper Size</Label>
            <Select 
              value={formData.meta?.paperSize || 'A4'} 
              onValueChange={(value) => updateFormData('meta', { ...formData.meta, paperSize: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select paper size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="orientation">Orientation</Label>
            <Select 
              value={formData.meta?.orientation || 'portrait'} 
              onValueChange={(value) => updateFormData('meta', { ...formData.meta, orientation: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="showLogo"
              checked={formData.meta?.showSchoolLogo || false}
              onCheckedChange={(checked) => updateFormData('meta', { ...formData.meta, showSchoolLogo: checked })}
            />
            <Label htmlFor="showLogo">Show school logo</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="showWatermark"
              checked={formData.meta?.showWatermark || false}
              onCheckedChange={(checked) => updateFormData('meta', { ...formData.meta, showWatermark: checked })}
            />
            <Label htmlFor="showWatermark">Show watermark</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 