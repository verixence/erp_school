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
  onUpload: (data: any[]) => Promise<void>;
}

const CSV_TEMPLATES = {
  sections: {
    filename: 'sections_template.csv',
    headers: ['grade', 'section', 'capacity', 'teacher_email'],
    example: [
      'Grade,Section,Capacity,Teacher Email',
      '1,A,30,john.doe@school.com',
      '1,B,30,jane.smith@school.com',
      '2,A,25,bob.wilson@school.com'
    ]
  },
  students: {
    filename: 'students_template.csv',
    headers: ['full_name', 'admission_no', 'grade', 'section', 'date_of_birth', 'gender', 'parent_names', 'parent_emails', 'parent_phones', 'parent_relations', 'student_email', 'student_phone'],
    example: [
      'Full Name,Admission No,Grade,Section,Date of Birth,Gender,Parent Names,Parent Emails,Parent Phones,Parent Relations,Student Email,Student Phone',
      'Alice Johnson,STU001,1,A,2018-05-15,female,John Johnson;Mary Johnson,john.johnson@email.com;mary.johnson@email.com,123-456-7890;098-765-4321,father;mother,alice@school.com,',
      'Bob Smith,STU002,1,A,2018-03-22,male,Robert Smith,robert.smith@email.com,555-123-4567,father,,',
      'Carol Wilson,STU003,2,A,2017-08-10,female,Sarah Wilson,sarah.wilson@email.com,333-444-5555,mother,carol@school.com,123-456-7890',
      'David Brown,STU004,1,A,2018-01-20,male,John Johnson;Mary Johnson,john.johnson@email.com;mary.johnson@email.com,123-456-7890;098-765-4321,father;mother,,'
    ]
  },
  teachers: {
    filename: 'teachers_template.csv',
    headers: ['first_name', 'last_name', 'email', 'phone', 'employee_id', 'department', 'subjects'],
    example: [
      'First Name,Last Name,Email,Phone,Employee ID,Department,Subjects',
      'John,Doe,john.doe@school.com,123-456-7890,EMP001,Mathematics,Mathematics;Physics',
      'Jane,Smith,jane.smith@school.com,098-765-4321,EMP002,English,English;Literature',
      'Bob,Wilson,bob.wilson@school.com,555-123-4567,EMP003,Science,Science;Chemistry'
    ]
  },

};

export default function CSVUploadModal({ isOpen, onClose, entity, onUpload }: CSVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
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
          if (!row.email) errors.push(`Row ${rowNum}: Email is required`);
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
      await onUpload(csvData);
      toast.success(`Successfully imported ${csvData.length} ${entity}`);
      onClose();
      setFile(null);
      setCsvData([]);
      setErrors([]);
    } catch (error: any) {
      toast.error(`Failed to import ${entity}: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
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
    </Dialog>
  );
} 