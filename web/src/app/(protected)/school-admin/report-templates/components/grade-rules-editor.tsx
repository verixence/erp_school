'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Trash2,
  GripVertical,
  Palette,
  Calculator,
  Settings,
  Info,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GradeBand {
  min: number;
  max: number;
  grade: string;
  gpa: number;
  color: string;
}

interface GradeRules {
  gradeBands: GradeBand[];
  calculationType: 'percentage' | 'weighted' | 'points';
  weights: Record<string, number>;
  passMarks: number;
  maxGPA?: number;
  showGPA?: boolean;
  showRank?: boolean;
}

interface GradeRulesEditorProps {
  value: GradeRules;
  onChange: (rules: GradeRules) => void;
}

const defaultGradeBand: GradeBand = {
  min: 0,
  max: 100,
  grade: 'A',
  gpa: 4.0,
  color: '#22c55e'
};

const gradeColors = [
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#ec4899', // Pink
  '#6b7280', // Gray
];

export function GradeRulesEditor({ value, onChange }: GradeRulesEditorProps) {
  const [activeTab, setActiveTab] = useState('bands');

  const addGradeBand = () => {
    const newBand: GradeBand = {
      ...defaultGradeBand,
      min: value.gradeBands.length > 0 ? Math.min(...value.gradeBands.map(b => b.min)) - 10 : 0,
      max: value.gradeBands.length > 0 ? Math.min(...value.gradeBands.map(b => b.min)) - 1 : 100,
      grade: `Grade ${value.gradeBands.length + 1}`,
      color: gradeColors[value.gradeBands.length % gradeColors.length],
    };

    onChange({
      ...value,
      gradeBands: [...value.gradeBands, newBand].sort((a, b) => b.min - a.min)
    });
  };

  const updateGradeBand = (index: number, field: keyof GradeBand, newValue: any) => {
    const updatedBands = [...value.gradeBands];
    updatedBands[index] = { ...updatedBands[index], [field]: newValue };
    
    onChange({
      ...value,
      gradeBands: updatedBands.sort((a, b) => b.min - a.min)
    });
  };

  const removeGradeBand = (index: number) => {
    const updatedBands = value.gradeBands.filter((_, i) => i !== index);
    onChange({
      ...value,
      gradeBands: updatedBands
    });
  };

  const validateGradeBands = () => {
    const errors: string[] = [];
    
    // Check for overlaps
    for (let i = 0; i < value.gradeBands.length; i++) {
      for (let j = i + 1; j < value.gradeBands.length; j++) {
        const band1 = value.gradeBands[i];
        const band2 = value.gradeBands[j];
        
        if (
          (band1.min <= band2.max && band1.max >= band2.min) ||
          (band2.min <= band1.max && band2.max >= band1.min)
        ) {
          errors.push(`Grade bands "${band1.grade}" and "${band2.grade}" overlap`);
        }
      }
    }

    // Check for gaps
    const sortedBands = [...value.gradeBands].sort((a, b) => a.min - b.min);
    for (let i = 0; i < sortedBands.length - 1; i++) {
      if (sortedBands[i].max + 1 < sortedBands[i + 1].min) {
        errors.push(`Gap between "${sortedBands[i].grade}" and "${sortedBands[i + 1].grade}"`);
      }
    }

    return errors;
  };

  const validationErrors = validateGradeBands();

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bands" className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Grade Bands</span>
          </TabsTrigger>
          <TabsTrigger value="calculation" className="flex items-center space-x-2">
            <Calculator className="w-4 h-4" />
            <span>Calculation</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bands" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Grade Bands Configuration</h3>
              <p className="text-sm text-gray-600">Define grade boundaries and their corresponding grades</p>
            </div>
            <Button onClick={addGradeBand} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Band
            </Button>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <AnimatePresence>
              {value.gradeBands.map((band, index) => (
                <motion.div
                  key={`${band.grade}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-1">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        </div>
                        
                        <div className="col-span-2">
                          <Label className="text-xs">Grade</Label>
                          <Input
                            value={band.grade}
                            onChange={(e) => updateGradeBand(index, 'grade', e.target.value)}
                            className="h-8"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Min %</Label>
                          <Input
                            type="number"
                            value={band.min}
                            onChange={(e) => updateGradeBand(index, 'min', Number(e.target.value))}
                            className="h-8"
                            min="0"
                            max="100"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Max %</Label>
                          <Input
                            type="number"
                            value={band.max}
                            onChange={(e) => updateGradeBand(index, 'max', Number(e.target.value))}
                            className="h-8"
                            min="0"
                            max="100"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">GPA</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={band.gpa}
                            onChange={(e) => updateGradeBand(index, 'gpa', Number(e.target.value))}
                            className="h-8"
                            min="0"
                            max="4"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Color</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={band.color}
                              onChange={(e) => updateGradeBand(index, 'color', e.target.value)}
                              className="w-8 h-8 rounded border"
                            />
                            <Badge style={{ backgroundColor: band.color, color: 'white' }}>
                              {band.grade}
                            </Badge>
                          </div>
                        </div>

                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGradeBand(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {value.gradeBands.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Grade Bands</h3>
              <p className="text-gray-500 mb-4">Add grade bands to define your grading system</p>
              <Button onClick={addGradeBand}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Band
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calculation" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Calculation Method</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Calculation Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={value.calculationType}
                    onValueChange={(newValue) => onChange({ ...value, calculationType: newValue as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Based</SelectItem>
                      <SelectItem value="weighted">Weighted Average</SelectItem>
                      <SelectItem value="points">Points Based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-2">
                    {value.calculationType === 'percentage' && 'Grades based on percentage of total marks'}
                    {value.calculationType === 'weighted' && 'Different subjects have different weights'}
                    {value.calculationType === 'points' && 'Points accumulation system'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pass Marks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={value.passMarks}
                      onChange={(e) => onChange({ ...value, passMarks: Number(e.target.value) })}
                      min="0"
                      max="100"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Minimum percentage required to pass
                  </p>
                </CardContent>
              </Card>
            </div>

            {value.calculationType === 'weighted' && (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Subject Weights</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Subject weights will be configured when generating report cards.
                      You can set default weights here if needed.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">GPA Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showGPA">Show GPA on Report</Label>
                    <input
                      id="showGPA"
                      type="checkbox"
                      checked={value.showGPA ?? true}
                      onChange={(e) => onChange({ ...value, showGPA: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Maximum GPA</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={value.maxGPA ?? 4.0}
                      onChange={(e) => onChange({ ...value, maxGPA: Number(e.target.value) })}
                      min="1"
                      max="10"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ranking Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showRank">Show Class Rank</Label>
                    <input
                      id="showRank"
                      type="checkbox"
                      checked={value.showRank ?? true}
                      onChange={(e) => onChange({ ...value, showRank: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Display student's rank within their class/section
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grade Bands Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {value.gradeBands
              .sort((a, b) => b.min - a.min)
              .map((band, index) => (
                <div
                  key={index}
                  className="text-center p-3 rounded-lg border"
                  style={{ backgroundColor: `${band.color}20`, borderColor: band.color }}
                >
                  <div className="font-bold" style={{ color: band.color }}>
                    {band.grade}
                  </div>
                  <div className="text-xs text-gray-600">
                    {band.min}% - {band.max}%
                  </div>
                  <div className="text-xs text-gray-500">
                    GPA: {band.gpa}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 