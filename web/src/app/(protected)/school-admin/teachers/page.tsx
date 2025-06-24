'use client';

import CrudTable from '@/components/crud-table';

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { 
    key: 'created_at', 
    label: 'Joined',
    render: (value: string) => new Date(value).toLocaleDateString()
  },
];

const createFields = [
  { key: 'email', label: 'Email', type: 'email' as const, required: true },
];

export default function TeachersPage() {
  return (
    <CrudTable
      entity="users"
      title="Teachers"
      columns={columns}
      createFields={createFields}
      searchPlaceholder="Search teachers by email..."
      onCreateData={(data) => ({ ...data, role: 'teacher' })}
    />
  );
} 