'use client';

import CrudTable from '@/components/crud-table';

const columns = [
  { key: 'name', label: 'Class Name' },
  { 
    key: 'created_at', 
    label: 'Created',
    render: (value: string) => new Date(value).toLocaleDateString()
  },
];

const createFields = [
  { key: 'name', label: 'Class Name', type: 'text' as const, required: true },
];

export default function ClassesPage() {
  return (
    <CrudTable
      entity="classes"
      title="Classes"
      columns={columns}
      createFields={createFields}
      searchPlaceholder="Search classes by name..."
    />
  );
} 