'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Upload, 
  Settings, 
  Eye, 
  Save, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Type,
  Layout,
  Zap
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
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface TemplateCustomizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  onSuccess: () => void;
}

interface CustomizationForm {
  name: string;
  logo_position: 'top-left' | 'top-center' | 'top-right';
  logo_size: number;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  font_family: string;
  font_size: number;
  header_background: string;
  show_watermark: boolean;
  watermark_text: string;
  grade_rules: any;
  address_format: string;
  signature_layout: 'horizontal' | 'vertical';
  paper_margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

const defaultCustomization: CustomizationForm = {
  name: '',
  logo_position: 'top-left',
  logo_size: 80,
  primary_color: '#2563eb',
  secondary_color: '#64748b',
  text_color: '#1f2937',
  font_family: 'Inter',
  font_size: 14,
  header_background: '#ffffff',
  show_watermark: false,
  watermark_text: 'CONFIDENTIAL',
  grade_rules: null,
  address_format: 'single-line',
  signature_layout: 'horizontal',
  paper_margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
};

const steps = [
  { id: 'branding', title: 'Branding', icon: Palette },
  { id: 'layout', title: 'Layout', icon: Layout },
  { id: 'typography', title: 'Typography', icon: Type },
  { id: 'grading', title: 'Grading', icon: Zap },
];

export function TemplateCustomizationModal({ 
  open, 
  onOpenChange, 
  template, 
  onSuccess 
}: TemplateCustomizationModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<CustomizationForm>(defaultCustomization);
  const [previewMode, setPreviewMode] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const queryClient = useQueryClient();

  useEffect(() => {
    if (template && open) {
      setFormData({
        ...defaultCustomization,
        name: template.name || '',
        grade_rules: template.grade_rules || defaultCustomization.grade_rules,
        // Extract existing customizations from meta if available
        ...(template.meta?.customization || {}),
      });
    }
  }, [template, open]);

  const updateCustomizationMutation = useMutation({
    mutationFn: async (data: CustomizationForm) => {
      const formDataToSend = new FormData();
      
      // Prepare the update payload
      const updatePayload = {
        id: template.id,
        name: data.name,
        meta: {
          ...template.meta,
          customization: data,
          last_customized: new Date().toISOString(),
        },
        grade_rules: data.grade_rules,
      };

      // Add logo file if provided
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }

      formDataToSend.append('template_data', JSON.stringify(updatePayload));

      const response = await fetch('/api/report-templates/customize', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to customize template');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Template customized successfully!');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateFormData = (field: keyof CustomizationForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file size must be less than 5MB');
        return;
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Logo must be PNG, JPG, JPEG, or SVG');
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    updateCustomizationMutation.mutate(formData);
  };

  const currentStepData = steps[currentStep];

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <currentStepData.icon className="w-5 h-5" />
            <span>Customize Template: {template.name}</span>
          </DialogTitle>
          <DialogDescription>
            Customize this template to match your school's branding and requirements
          </DialogDescription>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Customization Panel */}
            <div className="lg:col-span-2 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentStep === 0 && (
                    <BrandingStep 
                      formData={formData} 
                      updateFormData={updateFormData}
                      logoPreview={logoPreview}
                      onLogoChange={handleLogoChange}
                    />
                  )}
                  
                  {currentStep === 1 && (
                    <LayoutStep 
                      formData={formData} 
                      updateFormData={updateFormData} 
                    />
                  )}
                  
                  {currentStep === 2 && (
                    <TypographyStep 
                      formData={formData} 
                      updateFormData={updateFormData} 
                    />
                  )}
                  
                  {currentStep === 3 && (
                    <GradingStep 
                      formData={formData} 
                      updateFormData={updateFormData} 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Live Preview Panel */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 rounded-lg p-4 min-h-96">
                    <div 
                      className="bg-white rounded shadow-sm p-4 text-xs"
                      style={{
                        fontFamily: formData.font_family,
                        fontSize: `${formData.font_size}px`,
                        color: formData.text_color,
                      }}
                    >
                      {/* Header Preview */}
                      <div 
                        className="flex items-center gap-3 p-3 rounded mb-4"
                        style={{ backgroundColor: formData.header_background }}
                      >
                        {logoPreview && (
                          <img 
                            src={logoPreview} 
                            alt="Logo" 
                            className="rounded"
                            style={{ 
                              width: `${formData.logo_size * 0.5}px`,
                              height: `${formData.logo_size * 0.5}px`,
                              objectFit: 'contain'
                            }}
                          />
                        )}
                        <div>
                          <h3 
                            className="font-bold"
                            style={{ color: formData.primary_color }}
                          >
                            Your School Name
                          </h3>
                          <p 
                            className="text-xs"
                            style={{ color: formData.secondary_color }}
                          >
                            Academic Report Card
                          </p>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span style={{ color: formData.secondary_color }}>Student:</span>
                            <span className="ml-1">John Doe</span>
                          </div>
                          <div>
                            <span style={{ color: formData.secondary_color }}>Grade:</span>
                            <span className="ml-1">Class 5-A</span>
                          </div>
                        </div>

                        {/* Sample Grade */}
                        <div className="border rounded p-2">
                          <div className="flex justify-between items-center">
                            <span>Mathematics</span>
                            <div 
                              className="px-2 py-1 rounded text-white text-xs"
                              style={{ backgroundColor: formData.primary_color }}
                            >
                              A+
                            </div>
                          </div>
                        </div>

                        {/* Watermark Preview */}
                        {formData.show_watermark && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            style={{ 
                              color: formData.secondary_color + '20',
                              fontSize: '24px',
                              fontWeight: 'bold',
                              transform: 'rotate(-45deg)'
                            }}
                          >
                            {formData.watermark_text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500">
                    <p>Preview updates as you customize</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={nextStep}
              disabled={currentStep === steps.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateCustomizationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateCustomizationMutation.isPending || !formData.name.trim()}
            >
              {updateCustomizationMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Customization
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
function BrandingStep({ formData, updateFormData, logoPreview, onLogoChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>School Branding</CardTitle>
        <CardDescription>Customize colors, logo, and visual identity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Name */}
        <div>
          <Label htmlFor="template-name">Template Name *</Label>
          <Input
            id="template-name"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="Enter template name for your school"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <Label htmlFor="logo">School Logo</Label>
          <div className="flex items-center gap-4">
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={onLogoChange}
              className="flex-1"
            />
            {logoPreview && (
              <img 
                src={logoPreview} 
                alt="Logo preview" 
                className="w-12 h-12 object-contain border rounded"
              />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Upload PNG, JPG, or SVG (max 5MB)
          </p>
        </div>

        {/* Logo Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Logo Position</Label>
            <Select 
              value={formData.logo_position} 
              onValueChange={(value) => updateFormData('logo_position', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-left">Top Left</SelectItem>
                <SelectItem value="top-center">Top Center</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Logo Size: {formData.logo_size}px</Label>
            <Slider
              value={[formData.logo_size]}
              onValueChange={(value) => updateFormData('logo_size', value[0])}
              min={40}
              max={150}
              step={10}
              className="mt-2"
            />
          </div>
        </div>

        {/* Color Scheme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={formData.primary_color}
                onChange={(e) => updateFormData('primary_color', e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => updateFormData('primary_color', e.target.value)}
                placeholder="#2563eb"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={formData.secondary_color}
                onChange={(e) => updateFormData('secondary_color', e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.secondary_color}
                onChange={(e) => updateFormData('secondary_color', e.target.value)}
                placeholder="#64748b"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="header-bg">Header Background</Label>
            <div className="flex gap-2">
              <Input
                id="header-bg"
                type="color"
                value={formData.header_background}
                onChange={(e) => updateFormData('header_background', e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.header_background}
                onChange={(e) => updateFormData('header_background', e.target.value)}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="watermark">Show Watermark</Label>
            <Switch
              id="watermark"
              checked={formData.show_watermark}
              onCheckedChange={(checked) => updateFormData('show_watermark', checked)}
            />
          </div>
          
          {formData.show_watermark && (
            <Input
              value={formData.watermark_text}
              onChange={(e) => updateFormData('watermark_text', e.target.value)}
              placeholder="Watermark text"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LayoutStep({ formData, updateFormData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Layout Settings</CardTitle>
        <CardDescription>Configure page layout and spacing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Address Format */}
        <div>
          <Label>Address Format</Label>
          <Select 
            value={formData.address_format} 
            onValueChange={(value) => updateFormData('address_format', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single-line">Single Line</SelectItem>
              <SelectItem value="multi-line">Multi Line</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Signature Layout */}
        <div>
          <Label>Signature Layout</Label>
          <Select 
            value={formData.signature_layout} 
            onValueChange={(value) => updateFormData('signature_layout', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page Margins */}
        <div>
          <Label className="mb-3 block">Page Margins (mm)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Top: {formData.paper_margins.top}mm</Label>
              <Slider
                value={[formData.paper_margins.top]}
                onValueChange={(value) => updateFormData('paper_margins', {
                  ...formData.paper_margins,
                  top: value[0]
                })}
                min={10}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm">Right: {formData.paper_margins.right}mm</Label>
              <Slider
                value={[formData.paper_margins.right]}
                onValueChange={(value) => updateFormData('paper_margins', {
                  ...formData.paper_margins,
                  right: value[0]
                })}
                min={10}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm">Bottom: {formData.paper_margins.bottom}mm</Label>
              <Slider
                value={[formData.paper_margins.bottom]}
                onValueChange={(value) => updateFormData('paper_margins', {
                  ...formData.paper_margins,
                  bottom: value[0]
                })}
                min={10}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm">Left: {formData.paper_margins.left}mm</Label>
              <Slider
                value={[formData.paper_margins.left]}
                onValueChange={(value) => updateFormData('paper_margins', {
                  ...formData.paper_margins,
                  left: value[0]
                })}
                min={10}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TypographyStep({ formData, updateFormData }: any) {
  const fontFamilies = [
    'Inter', 'Arial', 'Times New Roman', 'Georgia', 'Helvetica',
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Typography</CardTitle>
        <CardDescription>Configure fonts and text styling</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Font Family */}
        <div>
          <Label>Font Family</Label>
          <Select 
            value={formData.font_family} 
            onValueChange={(value) => updateFormData('font_family', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map(font => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div>
          <Label>Base Font Size: {formData.font_size}px</Label>
          <Slider
            value={[formData.font_size]}
            onValueChange={(value) => updateFormData('font_size', value[0])}
            min={10}
            max={20}
            step={1}
            className="mt-2"
          />
        </div>

        {/* Text Color */}
        <div>
          <Label htmlFor="text-color">Text Color</Label>
          <div className="flex gap-2">
            <Input
              id="text-color"
              type="color"
              value={formData.text_color}
              onChange={(e) => updateFormData('text_color', e.target.value)}
              className="w-16 h-10 p-1"
            />
            <Input
              value={formData.text_color}
              onChange={(e) => updateFormData('text_color', e.target.value)}
              placeholder="#1f2937"
              className="flex-1"
            />
          </div>
        </div>

        {/* Typography Preview */}
        <div 
          className="p-4 border rounded-lg"
          style={{
            fontFamily: formData.font_family,
            fontSize: `${formData.font_size}px`,
            color: formData.text_color,
          }}
        >
          <h3 className="font-bold text-lg mb-2">Sample Report Card</h3>
          <p className="mb-2">Student Name: John Doe</p>
          <p className="text-sm">This is how your text will appear in the report card.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GradingStep({ formData, updateFormData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grading Rules</CardTitle>
        <CardDescription>Customize grade bands and scoring</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Grade customization will be available in the next update. 
            The template will use the default grading scheme for now.
          </AlertDescription>
        </Alert>
        
        {/* Preview of current grade rules */}
        {formData.grade_rules?.gradeBands && (
          <div className="mt-4 space-y-2">
            <Label>Current Grade Bands:</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {formData.grade_rules.gradeBands.map((band: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded border"
                  style={{ backgroundColor: band.color + '20' }}
                >
                  <span className="font-medium">{band.grade}</span>
                  <span className="text-sm">{band.min}-{band.max}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 