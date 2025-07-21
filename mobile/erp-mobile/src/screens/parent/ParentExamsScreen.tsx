import React from 'react';
import { Award } from 'lucide-react-native';
import { PlaceholderScreen } from '../../components/common/PlaceholderScreen';

export const ParentExamsScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="Exams & Results"
      description="View exam schedules, results, and performance analytics for your children."
      icon={<Award size={48} color="#6b7280" />}
    />
  );
};
