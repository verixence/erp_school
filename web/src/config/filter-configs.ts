import { FilterConfig } from '@/components/FilterBar';

// Student Filters Configuration
export const studentFilters: FilterConfig[] = [
  {
    key: 'grade',
    label: 'Grade',
    type: 'select',
    options: [
      { value: 'nursery', label: 'Nursery' },
      { value: 'lkg', label: 'LKG' },
      { value: 'ukg', label: 'UKG' },
      { value: '1', label: 'Grade 1' },
      { value: '2', label: 'Grade 2' },
      { value: '3', label: 'Grade 3' },
      { value: '4', label: 'Grade 4' },
      { value: '5', label: 'Grade 5' },
      { value: '6', label: 'Grade 6' },
      { value: '7', label: 'Grade 7' },
      { value: '8', label: 'Grade 8' },
      { value: '9', label: 'Grade 9' },
      { value: '10', label: 'Grade 10' },
      { value: '11', label: 'Grade 11' },
      { value: '12', label: 'Grade 12' },
    ],
    placeholder: 'Select grade'
  },
  {
    key: 'section',
    label: 'Section',
    type: 'select',
    options: [
      { value: 'A', label: 'Section A' },
      { value: 'B', label: 'Section B' },
      { value: 'C', label: 'Section C' },
      { value: 'D', label: 'Section D' },
      { value: 'E', label: 'Section E' },
    ],
    placeholder: 'Select section'
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'graduated', label: 'Graduated' },
      { value: 'transferred', label: 'Transferred' },
    ],
    placeholder: 'Select status'
  },
  {
    key: 'gender',
    label: 'Gender',
    type: 'select',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ],
    placeholder: 'Select gender'
  }
];

// Teacher Filters Configuration
export const teacherFilters: FilterConfig[] = [
  {
    key: 'department',
    label: 'Department',
    type: 'select',
    options: [
      { value: 'Mathematics', label: 'Mathematics' },
      { value: 'Science', label: 'Science' },
      { value: 'English', label: 'English' },
      { value: 'Social Studies', label: 'Social Studies' },
      { value: 'Languages', label: 'Languages' },
      { value: 'Physical Education', label: 'Physical Education' },
      { value: 'Arts', label: 'Arts' },
      { value: 'Computer Science', label: 'Computer Science' },
      { value: 'Administration', label: 'Administration' },
    ],
    placeholder: 'Select department'
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'on_leave', label: 'On Leave' },
    ],
    placeholder: 'Select status'
  },
  {
    key: 'subject',
    label: 'Subject',
    type: 'select',
    options: [
      { value: 'Mathematics', label: 'Mathematics' },
      { value: 'Physics', label: 'Physics' },
      { value: 'Chemistry', label: 'Chemistry' },
      { value: 'Biology', label: 'Biology' },
      { value: 'English', label: 'English' },
      { value: 'Hindi', label: 'Hindi' },
      { value: 'Social Studies', label: 'Social Studies' },
      { value: 'Computer Science', label: 'Computer Science' },
      { value: 'Physical Education', label: 'Physical Education' },
    ],
    placeholder: 'Select subject'
  }
];

// Parent Filters Configuration
export const parentFilters: FilterConfig[] = [
  {
    key: 'relation',
    label: 'Relation',
    type: 'select',
    options: [
      { value: 'father', label: 'Father' },
      { value: 'mother', label: 'Mother' },
      { value: 'guardian', label: 'Guardian' },
      { value: 'parent', label: 'Parent' },
    ],
    placeholder: 'Select relation'
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    placeholder: 'Select status'
  },
  {
    key: 'childrenCount',
    label: 'Number of Children',
    type: 'select',
    options: [
      { value: '1', label: '1 child' },
      { value: '2', label: '2 children' },
      { value: '3', label: '3 children' },
      { value: '4+', label: '4+ children' },
    ],
    placeholder: 'Select number of children'
  }
];
