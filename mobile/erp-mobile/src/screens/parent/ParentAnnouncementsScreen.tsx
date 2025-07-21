import React from 'react';
import { MessageSquare } from 'lucide-react-native';
import { PlaceholderScreen } from '../../components/common/PlaceholderScreen';

export const ParentAnnouncementsScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="School Announcements"
      description="Stay updated with the latest school announcements and important notices."
      icon={<MessageSquare size={48} color="#6b7280" />}
    />
  );
};
