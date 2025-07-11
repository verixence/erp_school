'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Code,
  Eye,
  Palette,
  FileText,
  Download,
  Upload,
  RotateCcw,
  Save,
  Maximize,
  Minimize,
  Settings,
  Zap,
  Copy,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TemplateDesigner } from '@/components/template-designer/Designer';

interface TemplateEditorProps {
  htmlValue: string;
  cssValue: string;
  onHtmlChange: (html: string) => void;
  onCssChange: (css: string) => void;
  i18nBundle?: Record<string, Record<string, string>>;
  gradeRules?: any;
  onSave?: () => void;
}

const defaultHtmlTemplate = `<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{t.reportTitle}}</title>
    <style>{{{css}}}</style>
</head>
<body>
    <div class="report-card">
        <!-- Header Section -->
        <header class="header">
            {{#if school.logo_url}}
            <img src="{{school.logo_url}}" alt="School Logo" class="logo" />
            {{/if}}
            <div class="school-info">
                <h1 class="school-name">{{school.name}}</h1>
                <p class="school-address">{{school.address}}</p>
                <h2 class="report-title">{{t.reportTitle}}</h2>
            </div>
        </header>

        <!-- Student Information -->
        <section class="student-info">
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">{{t.studentName}}:</span>
                    <span class="value">{{student.full_name}}</span>
                </div>
                <div class="info-item">
                    <span class="label">{{t.admissionNo}}:</span>
                    <span class="value">{{student.admission_no}}</span>
                </div>
                <div class="info-item">
                    <span class="label">{{t.grade}}:</span>
                    <span class="value">{{student.section}}</span>
                </div>
                <div class="info-item">
                    <span class="label">{{t.rollNo}}:</span>
                    <span class="value">{{student.roll_no}}</span>
                </div>
            </div>
        </section>

        <!-- Exam Information -->
        <section class="exam-info">
            <h3>{{exam.name}} - {{exam.academic_year}}</h3>
        </section>

        <!-- Marks Table -->
        <section class="marks-section">
            <table class="marks-table">
                <thead>
                    <tr>
                        <th>{{t.subjects}}</th>
                        <th>{{t.totalMarks}}</th>
                        <th>{{t.obtainedMarks}}</th>
                        <th>{{t.percentage}}</th>
                        <th>{{t.grade_display}}</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each subjects}}
                    <tr>
                        <td>{{this.name}}</td>
                        <td>{{this.total_marks}}</td>
                        <td>{{this.obtained_marks}}</td>
                        <td>{{calculatePercentage this.obtained_marks this.total_marks}}%</td>
                        <td class="grade-cell" style="background-color: {{getGradeColor this.grade}}">
                            {{this.grade}}
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td><strong>Total</strong></td>
                        <td><strong>{{overall.total_marks}}</strong></td>
                        <td><strong>{{overall.obtained_marks}}</strong></td>
                        <td><strong>{{overall.percentage}}%</strong></td>
                        <td class="grade-cell" style="background-color: {{getGradeColor overall.grade}}">
                            <strong>{{overall.grade}}</strong>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </section>

        <!-- Overall Performance -->
        <section class="performance">
            <div class="performance-grid">
                <div class="performance-item">
                    <span class="label">{{t.percentage}}:</span>
                    <span class="value">{{overall.percentage}}%</span>
                </div>
                <div class="performance-item">
                    <span class="label">{{t.grade_display}}:</span>
                    <span class="value grade-display" style="color: {{getGradeColor overall.grade}}">
                        {{overall.grade}}
                    </span>
                </div>
                <div class="performance-item">
                    <span class="label">{{t.rank}}:</span>
                    <span class="value">{{overall.rank}}</span>
                </div>
            </div>
        </section>

        <!-- Signatures -->
        <footer class="signatures">
            <div class="signature">
                <div class="signature-line"></div>
                <p>{{t.classTeacherSignature}}</p>
            </div>
            <div class="signature">
                <div class="signature-line"></div>
                <p>{{t.principalSignature}}</p>
            </div>
            <div class="signature">
                <div class="signature-line"></div>
                <p>{{t.parentSignature}}</p>
            </div>
        </footer>
    </div>
</body>
</html>`;

const defaultCssTemplate = `/* Report Card Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
    background: white;
}

.report-card {
    max-width: 8.5in;
    min-height: 11in;
    margin: 0 auto;
    padding: 1in;
    background: white;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

/* Header */
.header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 3px solid #2563eb;
}

.logo {
    width: 80px;
    height: 80px;
    margin-bottom: 1rem;
    object-fit: contain;
}

.school-name {
    font-size: 2rem;
    font-weight: bold;
    color: #1e40af;
    margin-bottom: 0.5rem;
}

.school-address {
    color: #6b7280;
    margin-bottom: 1rem;
}

.report-title {
    font-size: 1.5rem;
    color: #374151;
    font-weight: 600;
}

/* Student Information */
.student-info {
    margin: 2rem 0;
    padding: 1.5rem;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-radius: 8px;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.info-item {
    display: flex;
    align-items: center;
}

.info-item .label {
    font-weight: 600;
    color: #374151;
    min-width: 120px;
}

.info-item .value {
    font-weight: 500;
    color: #1f2937;
}

/* Exam Information */
.exam-info {
    text-align: center;
    margin: 2rem 0;
}

.exam-info h3 {
    font-size: 1.25rem;
    color: #1e40af;
    padding: 0.75rem 1.5rem;
    background: #dbeafe;
    border-radius: 6px;
    display: inline-block;
}

/* Marks Table */
.marks-section {
    margin: 2rem 0;
}

.marks-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;
}

.marks-table th {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
}

.marks-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
}

.marks-table tbody tr:hover {
    background: #f9fafb;
}

.marks-table tbody tr:nth-child(even) {
    background: #f8fafc;
}

.grade-cell {
    text-align: center;
    font-weight: bold;
    color: white !important;
    border-radius: 4px;
}

.total-row {
    background: #f3f4f6 !important;
    font-size: 1.1rem;
}

.total-row td {
    border-top: 2px solid #2563eb;
}

/* Performance Section */
.performance {
    margin: 2rem 0;
    padding: 1.5rem;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border-radius: 8px;
    border-left: 4px solid #10b981;
}

.performance-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    text-align: center;
}

.performance-item .label {
    display: block;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
}

.performance-item .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
}

.grade-display {
    font-size: 2rem !important;
}

/* Signatures */
.signatures {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-top: 3rem;
    padding-top: 2rem;
}

.signature {
    text-align: center;
}

.signature-line {
    width: 100%;
    height: 2px;
    background: #374151;
    margin: 2rem 0 0.5rem 0;
}

.signature p {
    font-weight: 600;
    color: #374151;
}

/* Print Styles */
@media print {
    body {
        margin: 0;
        padding: 0;
    }
    
    .report-card {
        box-shadow: none;
        margin: 0;
        max-width: none;
    }
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
    .info-grid,
    .performance-grid {
        grid-template-columns: 1fr;
    }
    
    .signatures {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .marks-table {
        font-size: 0.875rem;
    }
    
    .marks-table th,
    .marks-table td {
        padding: 0.5rem;
    }
}`;

const sampleData = {
  language: 'en',
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
    address: '123 Education Street, Learning City - 123456',
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
  t: {
    reportTitle: 'Academic Report Card',
    studentName: 'Student Name',
    admissionNo: 'Admission No.',
    grade: 'Grade',
    section: 'Section',
    rollNo: 'Roll No.',
    academicYear: 'Academic Year',
    examName: 'Examination',
    subjects: 'Subjects',
    totalMarks: 'Total Marks',
    obtainedMarks: 'Marks Obtained',
    percentage: 'Percentage',
    grade_display: 'Grade',
    rank: 'Rank',
    attendance: 'Attendance',
    remarks: 'Remarks',
    principalSignature: 'Principal',
    classTeacherSignature: 'Class Teacher',
    parentSignature: 'Parent/Guardian',
  },
};

export function TemplateEditor({ 
  htmlValue, 
  cssValue, 
  onHtmlChange, 
  onCssChange,
  i18nBundle,
  gradeRules,
  onSave
}: TemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'preview'>('html');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [builderMode, setBuilderMode] = useState<'no-code' | 'code'>('no-code');

  useEffect(() => {
    generatePreview();
  }, [htmlValue, cssValue, i18nBundle]);

  const generatePreview = () => {
    // Simple template rendering (in production, this would use Handlebars)
    let html = htmlValue || defaultHtmlTemplate;
    let css = cssValue || defaultCssTemplate;

    // Replace CSS placeholder
    html = html.replace('{{{css}}}', css);

    // Simple variable replacement for preview
    const replaceVariables = (str: string, data: any, prefix = '') => {
      let result = str;
      
      Object.keys(data).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = data[key];
        
        if (typeof value === 'object' && value !== null) {
          result = replaceVariables(result, value, fullKey);
        } else {
          const regex = new RegExp(`{{${fullKey}}}`, 'g');
          result = result.replace(regex, String(value || ''));
        }
      });
      
      return result;
    };

    html = replaceVariables(html, sampleData);

    // Handle simple each loops for subjects
    const subjectsMatch = html.match(/{{#each subjects}}([\s\S]*?){{\/each}}/);
    if (subjectsMatch) {
      const template = subjectsMatch[1];
      const rendered = sampleData.subjects.map(subject => {
        return replaceVariables(template, subject, 'this');
      }).join('');
      html = html.replace(subjectsMatch[0], rendered);
    }

    // Handle conditional logic
    html = html.replace(/{{#if (.*?)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      // Simple condition check - just check if variable exists
      const value = condition.split('.').reduce((obj: any, key: string) => obj && obj[key], sampleData);
      return value ? content : '';
    });

    setPreviewHtml(html);
  };

  const loadTemplate = (type: 'cbse' | 'icse' | 'state') => {
    // Load predefined templates
    onHtmlChange(defaultHtmlTemplate);
    onCssChange(defaultCssTemplate);
    toast.success(`Loaded ${type.toUpperCase()} template`);
  };

  const exportTemplate = () => {
    const templateData = {
      html: htmlValue,
      css: cssValue,
      timestamp: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(templateData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'report-template.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.html) onHtmlChange(imported.html);
        if (imported.css) onCssChange(imported.css);
        toast.success('Template imported successfully');
      } catch (error) {
        toast.error('Invalid template file');
      }
    };
    reader.readAsText(file);
  };

  const resetToDefault = () => {
    onHtmlChange(defaultHtmlTemplate);
    onCssChange(defaultCssTemplate);
    toast.success('Reset to default template');
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            {builderMode === 'no-code' ? (
              <Wand2 className="w-5 h-5" />
            ) : (
              <Code className="w-5 h-5" />
            )}
            <span>Template Editor</span>
            <Badge variant={builderMode === 'no-code' ? 'default' : 'secondary'}>
              {builderMode === 'no-code' ? 'No-Code' : 'Code'}
            </Badge>
          </h3>
          <p className="text-sm text-gray-600">
            {builderMode === 'no-code' 
              ? 'Design your report card with drag-and-drop components'
              : 'Design your report card layout with HTML and CSS'
            }
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Builder Mode Toggle */}
          <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Wand2 className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">No-Code</span>
            </div>
            <Switch
              checked={builderMode === 'code'}
              onCheckedChange={(checked) => setBuilderMode(checked ? 'code' : 'no-code')}
            />
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Code</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".json"
              onChange={importTemplate}
              className="hidden"
              id="import-template"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-template')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => loadTemplate('cbse')}>
              <Zap className="w-4 h-4 mr-2" />
              CBSE Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadTemplate('icse')}>
              <Zap className="w-4 h-4 mr-2" />
              ICSE Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadTemplate('state')}>
              <Zap className="w-4 h-4 mr-2" />
              State Board Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {builderMode === 'no-code' ? (
        <TemplateDesigner
          htmlValue={htmlValue}
          cssValue={cssValue}
          onHtmlChange={onHtmlChange}
          onCssChange={onCssChange}
          onSave={onSave || (() => {})}
          builderMode={builderMode}
          onBuilderModeChange={setBuilderMode}
        />
      ) : (
        <>
          {/* Editor Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="html" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>HTML</span>
              </TabsTrigger>
              <TabsTrigger value="css" className="flex items-center space-x-2">
                <Palette className="w-4 h-4" />
                <span>CSS</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </TabsTrigger>
            </TabsList>

        <TabsContent value="html" className="space-y-4">
          <div>
            <Label className="text-sm font-medium">HTML Template</Label>
            <p className="text-xs text-gray-500 mb-2">
              Use Handlebars syntax for dynamic content. Available variables: student, school, exam, subjects, overall, t (translations)
            </p>
            <Textarea
              value={htmlValue || defaultHtmlTemplate}
              onChange={(e) => onHtmlChange(e.target.value)}
              className="font-mono text-sm min-h-96"
              placeholder="Enter HTML template..."
            />
          </div>
        </TabsContent>

        <TabsContent value="css" className="space-y-4">
          <div>
            <Label className="text-sm font-medium">CSS Styles</Label>
            <p className="text-xs text-gray-500 mb-2">
              Style your report card. Use print media queries for print-specific styles.
            </p>
            <Textarea
              value={cssValue || defaultCssTemplate}
              onChange={(e) => onCssChange(e.target.value)}
              className="font-mono text-sm min-h-96"
              placeholder="Enter CSS styles..."
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">Live Preview</span>
                <Badge variant="secondary">Sample Data</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(previewHtml);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Print Preview
              </Button>
            </div>
            <div 
              className="bg-white overflow-auto"
              style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
            >
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Template Preview"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Variable Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Available Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Student Data</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{'{{student.full_name}}'}</code></li>
                <li><code>{'{{student.admission_no}}'}</code></li>
                <li><code>{'{{student.section}}'}</code></li>
                <li><code>{'{{student.roll_no}}'}</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">School Data</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{'{{school.name}}'}</code></li>
                <li><code>{'{{school.address}}'}</code></li>
                <li><code>{'{{school.logo_url}}'}</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Exam Data</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{'{{exam.name}}'}</code></li>
                <li><code>{'{{exam.academic_year}}'}</code></li>
                <li><code>{'{{overall.percentage}}'}</code></li>
                <li><code>{'{{overall.grade}}'}</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
} 