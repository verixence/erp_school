import React from 'react';
import { Calendar } from 'lucide-react-native';
import { PlaceholderScreen } from '../../components/common/PlaceholderScreen';

export const ParentTimetableScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="Class Timetable"
      description="View your children's weekly class schedules."
      icon={<Calendar size={48} color="#6b7280" />}
    />
  );
};
