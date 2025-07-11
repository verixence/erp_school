'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Trash2,
  Globe,
  Languages,
  Copy,
  Download,
  Upload,
  Save,
  AlertCircle,
  CheckCircle2
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface I18nBundle {
  [language: string]: {
    [key: string]: string;
  };
}

interface I18nEditorProps {
  value: I18nBundle;
  onChange: (bundle: I18nBundle) => void;
}

const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
];

const defaultTranslationKeys = [
  { key: 'reportTitle', label: 'Report Title', example: 'Academic Report Card' },
  { key: 'studentName', label: 'Student Name', example: 'Student Name' },
  { key: 'admissionNo', label: 'Admission Number', example: 'Admission No.' },
  { key: 'grade', label: 'Grade/Class', example: 'Grade' },
  { key: 'section', label: 'Section', example: 'Section' },
  { key: 'rollNo', label: 'Roll Number', example: 'Roll No.' },
  { key: 'academicYear', label: 'Academic Year', example: 'Academic Year' },
  { key: 'examName', label: 'Examination', example: 'Examination' },
  { key: 'subjects', label: 'Subjects', example: 'Subjects' },
  { key: 'totalMarks', label: 'Total Marks', example: 'Total Marks' },
  { key: 'obtainedMarks', label: 'Obtained Marks', example: 'Marks Obtained' },
  { key: 'percentage', label: 'Percentage', example: 'Percentage' },
  { key: 'grade_display', label: 'Grade Display', example: 'Grade' },
  { key: 'rank', label: 'Rank', example: 'Rank' },
  { key: 'attendance', label: 'Attendance', example: 'Attendance' },
  { key: 'remarks', label: 'Remarks', example: 'Remarks' },
  { key: 'principalSignature', label: 'Principal Signature', example: 'Principal' },
  { key: 'classTeacherSignature', label: 'Class Teacher', example: 'Class Teacher' },
  { key: 'parentSignature', label: 'Parent Signature', example: 'Parent/Guardian' },
  { key: 'dateOfIssue', label: 'Date of Issue', example: 'Date of Issue' },
  { key: 'schoolSeal', label: 'School Seal', example: 'School Seal' },
];

export function I18nEditor({ value, onChange }: I18nEditorProps) {
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showAddKey, setShowAddKey] = useState(false);

  const languages = Object.keys(value);
  const translationKeys = activeLanguage && value[activeLanguage] 
    ? Object.keys(value[activeLanguage]) 
    : [];

  const addLanguage = () => {
    if (!newLanguageCode || languages.includes(newLanguageCode)) {
      toast.error('Language already exists or invalid code');
      return;
    }

    const baseLanguage = languages.length > 0 ? languages[0] : 'en';
    const baseTranslations = value[baseLanguage] || {};
    
    // Initialize with default keys if this is the first language
    const initialTranslations = languages.length === 0 
      ? Object.fromEntries(defaultTranslationKeys.map(k => [k.key, k.example]))
      : Object.fromEntries(Object.keys(baseTranslations).map(key => [key, '']));

    onChange({
      ...value,
      [newLanguageCode]: initialTranslations
    });

    setActiveLanguage(newLanguageCode);
    setNewLanguageCode('');
    setShowAddLanguage(false);
    toast.success(`Added ${newLanguageCode.toUpperCase()} language`);
  };

  const removeLanguage = (languageCode: string) => {
    if (languages.length <= 1) {
      toast.error('Cannot remove the last language');
      return;
    }

    const updated = { ...value };
    delete updated[languageCode];
    onChange(updated);

    if (activeLanguage === languageCode) {
      setActiveLanguage(languages.filter(l => l !== languageCode)[0]);
    }

    toast.success(`Removed ${languageCode.toUpperCase()} language`);
  };

  const addTranslationKey = () => {
    if (!newKeyName || translationKeys.includes(newKeyName)) {
      toast.error('Key already exists or invalid name');
      return;
    }

    const updated = { ...value };
    
    // Add to all languages
    languages.forEach(lang => {
      updated[lang] = {
        ...updated[lang],
        [newKeyName]: ''
      };
    });

    onChange(updated);
    setNewKeyName('');
    setShowAddKey(false);
    toast.success('Added new translation key');
  };

  const removeTranslationKey = (key: string) => {
    const updated = { ...value };
    
    // Remove from all languages
    languages.forEach(lang => {
      if (updated[lang]) {
        delete updated[lang][key];
      }
    });

    onChange(updated);
    toast.success('Removed translation key');
  };

  const updateTranslation = (language: string, key: string, translation: string) => {
    onChange({
      ...value,
      [language]: {
        ...value[language],
        [key]: translation
      }
    });
  };

  const copyFromLanguage = (sourceLanguage: string, targetLanguage: string) => {
    onChange({
      ...value,
      [targetLanguage]: {
        ...value[targetLanguage],
        ...value[sourceLanguage]
      }
    });
    toast.success(`Copied translations from ${sourceLanguage.toUpperCase()}`);
  };

  const exportTranslations = () => {
    const dataStr = JSON.stringify(value, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'translations.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importTranslations = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        onChange({ ...value, ...imported });
        toast.success('Translations imported successfully');
      } catch (error) {
        toast.error('Invalid translation file');
      }
    };
    reader.readAsText(file);
  };

  const getLanguageInfo = (code: string) => {
    return supportedLanguages.find(l => l.code === code) || { code, name: code.toUpperCase(), flag: '🌐' };
  };

  const completionPercentage = (language: string) => {
    const translations = value[language] || {};
    const totalKeys = Object.keys(translations).length;
    const filledKeys = Object.values(translations).filter(v => v.trim() !== '').length;
    return totalKeys > 0 ? Math.round((filledKeys / totalKeys) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Multi-language Support</span>
          </h3>
          <p className="text-sm text-gray-600">Configure translations for different languages</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".json"
            onChange={importTranslations}
            className="hidden"
            id="import-translations"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-translations')?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={exportTranslations}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Language Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-wrap">
          {languages.map(lang => {
            const langInfo = getLanguageInfo(lang);
            const completion = completionPercentage(lang);
            
            return (
              <Button
                key={lang}
                variant={activeLanguage === lang ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveLanguage(lang)}
                className="flex items-center space-x-2"
              >
                <span>{langInfo.flag}</span>
                <span>{langInfo.name}</span>
                <Badge variant="secondary" className="ml-1">
                  {completion}%
                </Badge>
              </Button>
            );
          })}
        </div>
        
        <Dialog open={showAddLanguage} onOpenChange={setShowAddLanguage}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Language
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Language</DialogTitle>
              <DialogDescription>
                Select a language to add translation support
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={newLanguageCode} onValueChange={setNewLanguageCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages
                    .filter(lang => !languages.includes(lang.code))
                    .map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center space-x-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                          <Badge variant="outline">{lang.code}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex space-x-2">
                <Button onClick={addLanguage} disabled={!newLanguageCode}>
                  Add Language
                </Button>
                <Button variant="outline" onClick={() => setShowAddLanguage(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {languages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Languages className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Languages Added</h3>
            <p className="text-gray-500 mb-4">Add your first language to start creating translations</p>
            <Button onClick={() => setShowAddLanguage(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Language
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center space-x-2">
                <span>{getLanguageInfo(activeLanguage).flag}</span>
                <span>{getLanguageInfo(activeLanguage).name} Translations</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                {languages.length > 1 && (
                  <Select
                    value=""
                    onValueChange={(sourceLang) => copyFromLanguage(sourceLang, activeLanguage)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Copy from..." />
                    </SelectTrigger>
                    <SelectContent>
                      {languages
                        .filter(lang => lang !== activeLanguage)
                        .map(lang => {
                          const langInfo = getLanguageInfo(lang);
                          return (
                            <SelectItem key={lang} value={lang}>
                              <div className="flex items-center space-x-2">
                                <span>{langInfo.flag}</span>
                                <span>{langInfo.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddKey(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Key
                </Button>
                
                {languages.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeLanguage(activeLanguage)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {translationKeys.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No translation keys defined</p>
                <Button onClick={() => setShowAddKey(true)} className="mt-2">
                  Add First Key
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {translationKeys.map(key => {
                  const defaultKey = defaultTranslationKeys.find(k => k.key === key);
                  const hasTranslation = value[activeLanguage]?.[key]?.trim() !== '';
                  
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-12 gap-3 items-start"
                    >
                      <div className="col-span-3">
                        <Label className="text-sm font-medium flex items-center space-x-2">
                          <span>{defaultKey?.label || key}</span>
                          {hasTranslation ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                          )}
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">{key}</p>
                      </div>
                      
                      <div className="col-span-8">
                        <Textarea
                          value={value[activeLanguage]?.[key] || ''}
                          onChange={(e) => updateTranslation(activeLanguage, key, e.target.value)}
                          placeholder={defaultKey?.example || `Enter ${key} translation`}
                          className="min-h-[2.5rem] resize-none"
                          rows={1}
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTranslationKey(key)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Key Dialog */}
      <Dialog open={showAddKey} onOpenChange={setShowAddKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Translation Key</DialogTitle>
            <DialogDescription>
              Create a new translation key that will be available in all languages
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key Name</Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., customField1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use camelCase without spaces
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={addTranslationKey} disabled={!newKeyName}>
                Add Key
              </Button>
              <Button variant="outline" onClick={() => setShowAddKey(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Summary */}
      {languages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Translation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {languages.map(lang => {
                const langInfo = getLanguageInfo(lang);
                const completion = completionPercentage(lang);
                
                return (
                  <div key={lang} className="text-center">
                    <div className="text-2xl mb-1">{langInfo.flag}</div>
                    <div className="text-sm font-medium">{langInfo.name}</div>
                    <div className="text-xs text-gray-500">{completion}% complete</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${completion}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 