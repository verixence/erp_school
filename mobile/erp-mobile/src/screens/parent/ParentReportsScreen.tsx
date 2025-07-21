import React from 'react';
import { FileText } from 'lucide-react-native';
import { PlaceholderScreen } from '../../components/common/PlaceholderScreen';

export const ParentReportsScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="Report Cards"
      description="Download and view detailed academic report cards for your children."
      icon={<FileText size={48} color="#6b7280" />}
    />
  );
};
