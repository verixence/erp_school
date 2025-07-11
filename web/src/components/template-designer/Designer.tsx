'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Eye, 
  Code, 
  Save, 
  Undo, 
  Redo, 
  Monitor, 
  Tablet, 
  Smartphone,
  Download,
  Upload,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { reportBlocks, themePresets } from '@/config/reportBlocks';
import { tokenCategories } from '@/lib/reportTokens';
import { toast } from 'sonner';
import sampleData from '@/fixtures/sampleStudent.json';
import Handlebars from 'handlebars';

// Dynamic import for GrapesJS to avoid SSR issues
let grapesjs: any = null;
let gjsTailwind: any = null;

interface TemplateDesignerProps {
  htmlValue: string;
  cssValue: string;
  onHtmlChange: (html: string) => void;
  onCssChange: (css: string) => void;
  onSave: () => void;
  builderMode?: 'no-code' | 'code';
  onBuilderModeChange?: (mode: 'no-code' | 'code') => void;
}

// Register Handlebars helpers
if (typeof window !== 'undefined') {
  Handlebars.registerHelper('calculatePercentage', function(obtained: number, total: number) {
    return total > 0 ? ((obtained / total) * 100).toFixed(1) : '0.0';
  });

  Handlebars.registerHelper('getGradeColor', function(grade: string) {
    const gradeColors: Record<string, string> = {
      'A+': '#22c55e',
      'A': '#3b82f6',
      'B+': '#8b5cf6',
      'B': '#f59e0b',
      'C': '#ef4444',
      'F': '#dc2626'
    };
    return gradeColors[grade] || '#6b7280';
  });

  Handlebars.registerHelper('formatDate', function(date: string, format: string) {
    return new Date(date).toLocaleDateString();
  });

  Handlebars.registerHelper('toUpperCase', function(text: string) {
    return text?.toUpperCase() || '';
  });

  Handlebars.registerHelper('toLowerCase', function(text: string) {
    return text?.toLowerCase() || '';
  });
}

export function TemplateDesigner({
  htmlValue,
  cssValue,
  onHtmlChange,
  onCssChange,
  onSave,
  builderMode = 'no-code',
  onBuilderModeChange
}: TemplateDesignerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewHtml, setPreviewHtml] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('cbse-classic');
  const [showTokenPanel, setShowTokenPanel] = useState(false);

  // Load GrapesJS dynamically
  useEffect(() => {
    const loadGrapesJS = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        if (!grapesjs) {
          grapesjs = (await import('grapesjs')).default;
          gjsTailwind = (await import('grapesjs-tailwind')).default;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load GrapesJS:', error);
        toast.error('Failed to load template designer');
        setIsLoading(false);
      }
    };

    loadGrapesJS();
  }, []);

  // Initialize GrapesJS editor
  useEffect(() => {
    if (!grapesjs || !editorRef.current || isLoading || builderMode === 'code') return;

    const editorInstance = grapesjs.init({
      container: editorRef.current,
      width: 'auto',
      height: '600px',
      storageManager: false,
      blockManager: {
        appendTo: '.blocks-container',
        blocks: reportBlocks.map(block => ({
          id: block.id,
          label: block.label,
          category: block.category,
          media: block.media,
          content: block.content
        }))
      },
      layerManager: {
        appendTo: '.layers-container'
      },
      styleManager: {
        appendTo: '.styles-container',
        sectors: [
          {
            name: 'Typography',
            properties: [
              'font-family',
              'font-size',
              'font-weight',
              'line-height',
              'text-align',
              'color'
            ]
          },
          {
            name: 'Layout',
            properties: [
              'display',
              'width',
              'height',
              'margin',
              'padding',
              'position',
              'top',
              'right',
              'bottom',
              'left'
            ]
          },
          {
            name: 'Background',
            properties: [
              'background-color',
              'background-image',
              'background-repeat',
              'background-position',
              'background-size'
            ]
          },
          {
            name: 'Border',
            properties: [
              'border',
              'border-radius',
              'box-shadow'
            ]
          }
        ]
      },
      selectorManager: {
        appendTo: '.selectors-container'
      },
      traitManager: {
        appendTo: '.traits-container'
      },
      plugins: [gjsTailwind],
      pluginsOpts: {
        [gjsTailwind]: {
          // Tailwind plugin options
        }
      },
      canvas: {
        styles: [
          'https://cdn.tailwindcss.com/3.3.0/tailwind.min.css'
        ]
      }
    });

    // Add custom token trait type
    editorInstance.TraitManager.addType('token', {
      createInput({ trait }: any) {
        const input = document.createElement('select');
        input.className = 'w-full p-2 border rounded';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Select a token...';
        input.appendChild(emptyOption);

        // Add token options by category
        tokenCategories.forEach(category => {
          const optgroup = document.createElement('optgroup');
          optgroup.label = category.label;
          
          category.tokens.forEach(token => {
            const option = document.createElement('option');
            option.value = token.token;
            option.textContent = `${token.label} (${token.example})`;
            optgroup.appendChild(option);
          });
          
          input.appendChild(optgroup);
        });

        return input;
      },
      onUpdate({ elInput, component }: any) {
        const selected = elInput.value;
        if (selected) {
          const currentContent = component.get('content') || '';
          component.set('content', currentContent + selected);
        }
      }
    });

    // Set initial content if provided
    if (htmlValue) {
      editorInstance.setComponents(htmlValue);
    }
    if (cssValue) {
      editorInstance.setStyle(cssValue);
    }

    // Listen for changes
    editorInstance.on('change:changesCount', () => {
      const html = editorInstance.getHtml();
      const css = editorInstance.getCss();
      onHtmlChange(html);
      onCssChange(css);
      generatePreview(html, css);
    });

    setEditor(editorInstance);

    return () => {
      if (editorInstance) {
        editorInstance.destroy();
      }
    };
  }, [grapesjs, isLoading, builderMode, htmlValue, cssValue]);

  // Generate preview with sample data
  const generatePreview = (html: string, css: string) => {
    try {
      // Compile template with Handlebars
      const template = Handlebars.compile(html);
      const rendered = template(sampleData);
      
      // Create complete HTML with CSS
      const completeHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>${css}</style>
          </head>
          <body>
            ${rendered}
          </body>
        </html>
      `;
      
      setPreviewHtml(completeHtml);
    } catch (error) {
      console.error('Preview generation failed:', error);
      setPreviewHtml(`
        <div class="p-8 text-center text-red-600">
          <h3 class="text-lg font-semibold mb-2">Preview Error</h3>
          <p>Unable to generate preview. Please check your template syntax.</p>
        </div>
      `);
    }
  };

  // Apply theme preset
  const applyTheme = (themeKey: string) => {
    if (!editor) return;
    
    const theme = themePresets[themeKey as keyof typeof themePresets];
    if (!theme) return;

    // Apply theme styles
    const css = `
      :root {
        --primary-color: ${theme.primaryColor};
        --secondary-color: ${theme.secondaryColor};
        --accent-color: ${theme.accentColor};
        --font-family: ${theme.fontFamily};
        --border-radius: ${theme.borderRadius};
      }
      
      .header {
        border-color: var(--primary-color);
      }
      
      .school-name {
        color: var(--primary-color);
        font-family: var(--font-family);
      }
      
      .marks-table th {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      }
      
      .performance {
        background: linear-gradient(135deg, var(--accent-color), var(--accent-color));
        border-color: var(--primary-color);
      }
      
      * {
        font-family: var(--font-family);
      }
      
      .rounded-lg {
        border-radius: var(--border-radius);
      }
    `;

    editor.setStyle(editor.getCss() + '\n' + css);
    setSelectedTheme(themeKey);
    toast.success(`Applied ${theme.name} theme`);
  };

  // Device responsive preview
  const setDevice = (device: 'desktop' | 'tablet' | 'mobile') => {
    if (!editor) return;
    
    const deviceCommands = {
      desktop: 'set-device-desktop',
      tablet: 'set-device-tablet', 
      mobile: 'set-device-mobile'
    };

    editor.runCommand(deviceCommands[device]);
    setActiveDevice(device);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Template Designer...</p>
        </div>
      </div>
    );
  }

  if (builderMode === 'code') {
    return (
      <div className="text-center py-8">
        <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Switch to No-Code mode to use the visual designer</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>No-Code Template Designer</span>
            <Badge variant="secondary">Beta</Badge>
          </h3>
          <p className="text-sm text-gray-600">
            Drag and drop blocks to design your report card template
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Theme Presets */}
          <select
            value={selectedTheme}
            onChange={(e) => applyTheme(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Select Theme...</option>
            {Object.entries(themePresets).map(([key, theme]) => (
              <option key={key} value={key}>
                {theme.name}
              </option>
            ))}
          </select>

          {/* Device Preview */}
          <div className="flex border rounded-md">
            {(['desktop', 'tablet', 'mobile'] as const).map((device) => {
              const icons = {
                desktop: Monitor,
                tablet: Tablet,
                mobile: Smartphone
              };
              const Icon = icons[device];
              
              return (
                <Button
                  key={device}
                  variant={activeDevice === device ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDevice(device)}
                  className="rounded-none first:rounded-l-md last:rounded-r-md"
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>

          <Button
            onClick={() => setShowTokenPanel(!showTokenPanel)}
            variant="outline"
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            Tokens
          </Button>

          <Button onClick={onSave} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Designer Layout */}
      <div className="grid grid-cols-4 gap-6 h-[800px]">
        {/* Left Panel - Blocks and Settings */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Design Tools</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="blocks" className="h-full">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                <TabsTrigger value="blocks" className="text-xs">Blocks</TabsTrigger>
                <TabsTrigger value="styles" className="text-xs">Styles</TabsTrigger>
                <TabsTrigger value="layers" className="text-xs">Layers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="blocks" className="mt-0">
                <div className="blocks-container h-[650px] overflow-y-auto p-3"></div>
              </TabsContent>
              
              <TabsContent value="styles" className="mt-0">
                <div className="p-3 space-y-4">
                  <div className="selectors-container"></div>
                  <div className="traits-container"></div>
                  <div className="styles-container"></div>
                </div>
              </TabsContent>
              
              <TabsContent value="layers" className="mt-0">
                <div className="layers-container h-[650px] overflow-y-auto p-3"></div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Main Canvas */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Visual Editor</span>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => editor?.runCommand('core:undo')}>
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => editor?.runCommand('core:redo')}>
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={editorRef} className="w-full h-[700px]"></div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Preview and Tokens */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="preview" className="h-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                <TabsTrigger value="tokens" className="text-xs">Tokens</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="mt-0">
                <div className="h-[650px] overflow-auto bg-gray-50">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0 bg-white"
                    title="Template Preview"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="tokens" className="mt-0">
                <div className="h-[650px] overflow-y-auto p-3 space-y-4">
                  {tokenCategories.map(category => (
                    <div key={category.id}>
                      <h4 className="font-medium text-sm text-gray-900 mb-2">
                        {category.label}
                      </h4>
                      <div className="space-y-1">
                        {category.tokens.map(token => (
                          <button
                            key={token.id}
                            onClick={() => {
                              navigator.clipboard.writeText(token.token);
                              toast.success('Token copied to clipboard');
                            }}
                            className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border group"
                          >
                            <div className="font-mono text-blue-600 mb-1">
                              {token.token}
                            </div>
                            <div className="text-gray-600">{token.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 