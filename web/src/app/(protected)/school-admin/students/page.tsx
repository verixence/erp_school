'use client';

import CrudTable from '@/components/crud-table';

const columns = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'grade', label: 'Grade' },
  { key: 'section', label: 'Section' },
  { 
    key: 'created_at', 
    label: 'Enrolled',
    render: (value: string) => new Date(value).toLocaleDateString()
  },
];

const createFields = [
  { key: 'full_name', label: 'Full Name', type: 'text' as const, required: true },
  { 
    key: 'grade', 
    label: 'Grade', 
    type: 'select' as const, 
    required: true,
    options: [
      { value: 'Grade 1', label: 'Grade 1' },
      { value: 'Grade 2', label: 'Grade 2' },
      { value: 'Grade 3', label: 'Grade 3' },
      { value: 'Grade 4', label: 'Grade 4' },
      { value: 'Grade 5', label: 'Grade 5' },
      { value: 'Grade 6', label: 'Grade 6' },
      { value: 'Grade 7', label: 'Grade 7' },
      { value: 'Grade 8', label: 'Grade 8' },
      { value: 'Grade 9', label: 'Grade 9' },
      { value: 'Grade 10', label: 'Grade 10' },
      { value: 'Grade 11', label: 'Grade 11' },
      { value: 'Grade 12', label: 'Grade 12' },
    ]
  },
  {
    key: 'section',
    label: 'Section',
    type: 'select' as const,
    required: true,
    options: [
      { value: 'A', label: 'Section A' },
      { value: 'B', label: 'Section B' },
      { value: 'C', label: 'Section C' },
      { value: 'D', label: 'Section D' },
    ]
  },
];

export default function StudentsPage() {
  return (
    <CrudTable
      entity="students"
      title="Students"
      columns={columns}
      createFields={createFields}
      searchPlaceholder="Search students by name..."
    />
  );
} 