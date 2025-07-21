import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, className = '' }) => {
  const baseStyle = `bg-white rounded-xl shadow-sm border border-gray-200 ${className}`;
  
  return (
    <View className={baseStyle} style={style}>
      {children}
    </View>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style, className = '' }) => {
  const baseStyle = `p-4 pb-2 ${className}`;
  
  return (
    <View className={baseStyle} style={style}>
      {children}
    </View>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style, className = '' }) => {
  const baseStyle = `p-4 pt-0 ${className}`;
  
  return (
    <View className={baseStyle} style={style}>
      {children}
    </View>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style, className = '' }) => {
  const baseStyle = `p-4 pt-0 ${className}`;
  
  return (
    <View className={baseStyle} style={style}>
      {children}
    </View>
  );
}; 