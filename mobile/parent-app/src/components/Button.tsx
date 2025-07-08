import React from 'react';
import { TouchableOpacity, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme/colors';
import { Typography } from './Typography';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  onPress?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  onPress,
}) => {
  const buttonStyle = getButtonStyle(variant, size, disabled);
  const textStyle = getTextStyle(variant, size, disabled);
  const iconSize = getIconSize(size);
  const iconColor = getIconColor(variant, disabled);

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <MaterialIcons 
              name={icon} 
              size={iconSize} 
              color={iconColor} 
              style={{ marginRight: theme.spacing.xs }}
            />
          )}
          <Typography 
            variant={variant === 'primary' ? 'inverse' : 'primary'}
            size={getTextSize(size)}
            weight="medium"
            style={textStyle}
          >
            {children}
          </Typography>
          {icon && iconPosition === 'right' && (
            <MaterialIcons 
              name={icon} 
              size={iconSize} 
              color={iconColor} 
              style={{ marginLeft: theme.spacing.xs }}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

// Helper functions
const getButtonStyle = (
  variant: 'primary' | 'secondary' | 'outline' | 'ghost',
  size: 'sm' | 'md' | 'lg',
  disabled: boolean
): ViewStyle => {
  const baseStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    ...theme.shadow.sm,
  };

  // Size-specific styles
  const sizeStyles = {
    sm: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      minHeight: 32,
    },
    md: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: 40,
    },
    lg: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      minHeight: 48,
    },
  };

  // Variant-specific styles
  const variantStyles = {
    primary: {
      backgroundColor: disabled ? theme.colors.gray[300] : theme.colors.primary[500],
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: disabled ? theme.colors.gray[200] : theme.colors.gray[100],
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: disabled ? theme.colors.gray[300] : theme.colors.primary[500],
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  };

  return {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    opacity: disabled ? 0.6 : 1,
  };
};

const getTextStyle = (
  variant: 'primary' | 'secondary' | 'outline' | 'ghost',
  size: 'sm' | 'md' | 'lg',
  disabled: boolean
): TextStyle => {
  const variantStyles = {
    primary: {
      color: theme.colors.text.inverse,
    },
    secondary: {
      color: theme.colors.text.primary,
    },
    outline: {
      color: disabled ? theme.colors.gray[400] : theme.colors.primary[500],
    },
    ghost: {
      color: disabled ? theme.colors.gray[400] : theme.colors.primary[500],
    },
  };

  return variantStyles[variant];
};

const getIconSize = (size: 'sm' | 'md' | 'lg'): number => {
  const sizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };
  return sizes[size];
};

const getIconColor = (
  variant: 'primary' | 'secondary' | 'outline' | 'ghost',
  disabled: boolean
): string => {
  if (disabled) return theme.colors.gray[400];
  
  const colors = {
    primary: theme.colors.text.inverse,
    secondary: theme.colors.text.primary,
    outline: theme.colors.primary[500],
    ghost: theme.colors.primary[500],
  };
  
  return colors[variant];
};

const getTextSize = (size: 'sm' | 'md' | 'lg'): keyof typeof theme.typography.fontSize => {
  const sizes = {
    sm: 'sm' as const,
    md: 'base' as const,
    lg: 'lg' as const,
  };
  return sizes[size];
}; 