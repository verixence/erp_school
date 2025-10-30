'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Download, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: 'sections' | 'students' | 'teachers';
  onUpload: (data: any[]) => Promise<void | any>;
}

const CSV_TEMPLATES = {
  sections: {
    filename: 'sections_template.csv',
    headers: ['grade', 'section', 'capacity', 'teacher_employee_id', 'teacher_email'],
    example: [
      'Grade,Section,Capacity,Teacher Employee ID,Teacher Email',
      '1,A,30,EMP001,',
      '1,B,30,T001,',
      '2,A,25,,john.doe@school.com'
    ],
    description: 'Use Teacher Employee ID (preferred) or Teacher Email to assign class teachers. Employee ID takes priority if both are provided.'
  },
  students: {
    filename: 'students_template.csv',
    headers: ['full_name', 'admission_no', 'grade', 'section', 'date_of_birth', 'gender', 'parent_names', 'parent_usernames', 'parent_emails', 'parent_phones', 'parent_passwords', 'parent_relations', 'student_email', 'student_phone'],
    example: [
      'Full Name,Admission No,Grade,Section,Date of Birth,Gender,Parent Names,Parent Usernames,Parent Emails,Parent Phones,Parent Passwords,Parent Relations,Student Email,Student Phone',
      'Alice Johnson,STU001,1,A,2018-05-15,female,John Johnson;Mary Johnson,johnjohn,john@email.com,123-456-7890,,father;mother,alice@school.com,',
      'Bob Smith,STU002,1,A,2018-03-22,male,Robert Smith,robert123,,555-123-4567,Pass123!,father,,',
      'Carol Wilson,STU003,2,A,2017-08-10,female,Sarah Wilson,sarahw,sarah@email.com,333-444-5555,,mother,carol@school.com,',
      'Emma Brown,STU005,2,A,2017-05-15,female,John Johnson;Mary Johnson,johnjohn,,123-456-7890,,father;mother,,'
    ],
    description: 'Use semicolons (;) to separate multiple parents. Parent usernames are optional - if not provided, will auto-generate. Email is optional. If same parent for multiple children, use same username/email/phone. System will link to existing parent account.'
  },
  teachers: {
    filename: 'teachers_template.csv',
    headers: ['first_name', 'last_name', 'employee_id', 'email', 'phone', 'department', 'subjects', 'password'],
    example: [
      'First Name,Last Name,Employee ID,Email,Phone,Department,Subjects,Password',
      'John,Doe,EMP001,john.doe@school.com,123-456-7890,Mathematics,Mathematics;Physics,',
      'Jane,Smith,EMP002,,098-765-4321,English,English;Literature,MyPass123!',
      'Bob,Wilson,T001,,555-123-4567,Science,Science;Chemistry,'
    ],
    description: 'Employee ID will be used as username for login. Email is optional. Password is optional - if not provided, a temporary password will be generated.'
  },

};

export default function CSVUploadModal({ isOpen, onClose, entity, onUpload }: CSVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const queryClient = useQueryClient();

  const template = CSV_TEMPLATES[entity];

  const downloadTemplate = () => {
    const csvContent = template.example.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Improved CSV parsing that handles quoted fields and commas within values
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;

      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
        i++;
      }
      
      result.push(current.trim());
      return result;
    };

    const headerLine = parseCSVLine(lines[0]);
    const headers = headerLine.map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        let value = values[index]?.trim() || '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        row[header] = value;
      });
      
      // Only add rows that have at least some data
      if (Object.values(row).some(val => val !== '')) {
        data.push(row);
      }
    }

    return data;
  };

  const validateData = (data: any[]): string[] => {
    const errors: string[] = [];
    
    if (data.length === 0) {
      errors.push('No valid data rows found');
      return errors;
    }

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index starts at 0 and we skip header

      switch (entity) {
        case 'sections':
          if (!row.grade) errors.push(`Row ${rowNum}: Grade is required`);
          if (!row.section) errors.push(`Row ${rowNum}: Section is required`);
          if (!row.capacity || isNaN(Number(row.capacity))) errors.push(`Row ${rowNum}: Valid capacity number is required`);
          break;

        case 'students':
          if (!row.full_name) errors.push(`Row ${rowNum}: Full name is required`);
          if (!row.admission_no) errors.push(`Row ${rowNum}: Admission number is required`);
          if (!row.grade) errors.push(`Row ${rowNum}: Grade is required`);
          if (!row.section) errors.push(`Row ${rowNum}: Section is required`);
          if (!row.date_of_birth) errors.push(`Row ${rowNum}: Date of birth is required`);
          if (!['male', 'female', 'other'].includes(row.gender?.toLowerCase())) {
            errors.push(`Row ${rowNum}: Gender must be male, female, or other`);
          }
          break;

        case 'teachers':
          if (!row.first_name) errors.push(`Row ${rowNum}: First name is required`);
          if (!row.last_name) errors.push(`Row ${rowNum}: Last name is required`);
          if (!row.employee_id) errors.push(`Row ${rowNum}: Employee ID is required (used as username)`);
          // Email is optional - username will be used for login
          if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            errors.push(`Row ${rowNum}: Invalid email format`);
          }
          break;


      }
    });

    return errors;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setCsvData(data);
      
      const validationErrors = validateData(data);
      setErrors(validationErrors);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!csvData.length || errors.length > 0) return;

    setIsProcessing(true);
    try {
      const results = await onUpload(csvData);

      if (results && results.imported && results.imported.length > 0) {
        // Show results with credentials if available
        setUploadResults(results);
        setShowResults(true);
      } else {
        toast.success(`Successfully imported ${csvData.length} ${entity}`);
        onClose();
      }

      setFile(null);
      setCsvData([]);
      setErrors([]);
    } catch (error: any) {
      toast.error(`Failed to import ${entity}: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCredentials = () => {
    if (!uploadResults || !uploadResults.imported) return;

    const csvLines = ['Username,Password,Name,Employee ID'];
    uploadResults.imported.forEach((item: any) => {
      if (item.username && item.temp_password) {
        const name = `${item.first_name} ${item.last_name}`;
        csvLines.push(`${item.username},${item.temp_password},"${name}",${item.employee_id || ''}`);
      }
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Credentials downloaded successfully');
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setUploadResults(null);
    onClose();
  };

  const handleClose = () => {
    onClose();
    setFile(null);
    setCsvData([]);
    setErrors([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload {entity}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple {entity} at once. Download the template below to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Download Template</p>
              <p className="text-sm text-muted-foreground">
                Get the CSV template with required columns
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="btn-outline-visible">
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview and Errors */}
          {file && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {csvData.length} rows found
                </Badge>
                {errors.length > 0 && (
                  <Badge variant="destructive">
                    {errors.length} errors
                  </Badge>
                )}
              </div>

              {errors.length > 0 && (
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-700">Validation Errors</span>
                  </div>
                  <ul className="text-sm text-red-600 space-y-1">
                    {errors.slice(0, 10).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li>• ... and {errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="btn-outline-visible">
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!csvData.length || errors.length > 0 || isProcessing}
            className="btn-primary-visible"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? 'Importing...' : `Import ${csvData.length} ${entity}`}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={handleCloseResults}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Complete - Credentials Generated</DialogTitle>
            <DialogDescription>
              {uploadResults?.imported?.length || 0} {entity} imported successfully.
              Download the credentials file to share login information.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-700">Successful</p>
                  <p className="text-2xl font-bold text-green-900">
                    {uploadResults?.imported?.length || 0}
                  </p>
                </div>
                {uploadResults?.errors && uploadResults.errors.length > 0 && (
                  <div className="flex-1 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-700">Failed</p>
                    <p className="text-2xl font-bold text-red-900">
                      {uploadResults.errors.length}
                    </p>
                  </div>
                )}
              </div>

              {/* Credentials Table */}
              {uploadResults?.imported && uploadResults.imported.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-2 font-medium text-sm grid grid-cols-4 gap-2">
                    <div>Name</div>
                    <div>Username</div>
                    <div>Password</div>
                    <div>Employee ID</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {uploadResults.imported.map((item: any, index: number) => (
                      <div key={index} className="p-2 border-t text-sm grid grid-cols-4 gap-2 hover:bg-muted/50">
                        <div className="truncate">
                          {item.first_name} {item.last_name}
                        </div>
                        <div className="font-mono text-xs">
                          {item.username || 'N/A'}
                        </div>
                        <div className="font-mono text-xs">
                          {item.temp_password || 'N/A'}
                        </div>
                        <div className="text-xs">
                          {item.employee_id || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {uploadResults?.errors && uploadResults.errors.length > 0 && (
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-700">Import Errors</span>
                  </div>
                  <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {uploadResults.errors.slice(0, 10).map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {uploadResults.errors.length > 10 && (
                      <li>• ... and {uploadResults.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Save these credentials before closing
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseResults} className="btn-outline-visible">
                Close
              </Button>
              <Button onClick={downloadCredentials} className="btn-primary-visible">
                <Download className="h-4 w-4 mr-2" />
                Download Credentials
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 