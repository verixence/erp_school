import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: 24 
      }}>
        {icon && <View style={{ marginBottom: 16 }}>{icon}</View>}
        <Text style={{ 
          fontSize: 20, 
          fontWeight: '600', 
          color: '#111827', 
          marginBottom: 8,
          textAlign: 'center'
        }}>
          {title}
        </Text>
        <Text style={{ 
          color: '#6b7280', 
          textAlign: 'center',
          lineHeight: 20
        }}>
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}; 