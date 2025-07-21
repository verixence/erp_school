import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 border-primary-600';
      case 'secondary':
        return 'bg-secondary-600 border-secondary-600';
      case 'outline':
        return 'bg-transparent border-primary-600';
      case 'ghost':
        return 'bg-transparent border-transparent';
      default:
        return 'bg-primary-600 border-primary-600';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2';
      case 'md':
        return 'px-4 py-3';
      case 'lg':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-primary-600';
      case 'ghost':
        return 'text-primary-600';
      default:
        return 'text-white';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const baseStyle = `
    rounded-lg border-2 flex-row items-center justify-center
    ${getVariantStyles()}
    ${getSizeStyles()}
    ${disabled || loading ? 'opacity-50' : ''}
  `;

  const textBaseStyle = `
    font-semibold text-center
    ${getTextVariantStyles()}
    ${getTextSizeStyles()}
  `;

  return (
    <TouchableOpacity
      className={baseStyle}
      style={style}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading && (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'ghost' ? '#2563eb' : 'white'} 
          style={{ marginRight: 8 }}
        />
      )}
      <Text className={textBaseStyle} style={textStyle}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}; 