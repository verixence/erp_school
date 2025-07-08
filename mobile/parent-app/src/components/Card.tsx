import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default', 
  style 
}) => {
  const cardStyle = getCardStyle(variant);
  
  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
};

const getCardStyle = (variant: 'default' | 'elevated' | 'outlined') => {
  const baseStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  };

  switch (variant) {
    case 'elevated':
      return {
        ...baseStyle,
        ...theme.shadow.md,
      };
    case 'outlined':
      return {
        ...baseStyle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadow.sm,
      };
    default:
      return {
        ...baseStyle,
        ...theme.shadow.sm,
      };
  }
};

// Card Header Component
interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>
    {children}
  </View>
);

// Card Content Component
interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>
    {children}
  </View>
);

// Card Title Component
interface CardTitleProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => (
  <View style={[styles.title, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
}); 