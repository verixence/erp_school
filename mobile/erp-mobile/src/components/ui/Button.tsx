import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, StyleSheet } from 'react-native';

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
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: '#2563eb', borderColor: '#2563eb' };
      case 'secondary':
        return { backgroundColor: '#7c3aed', borderColor: '#7c3aed' };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: '#2563eb' };
      case 'ghost':
        return { backgroundColor: 'transparent', borderColor: 'transparent' };
      default:
        return { backgroundColor: '#2563eb', borderColor: '#2563eb' };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { paddingHorizontal: 12, paddingVertical: 8 };
      case 'md':
        return { paddingHorizontal: 16, paddingVertical: 12 };
      case 'lg':
        return { paddingHorizontal: 24, paddingVertical: 16 };
      default:
        return { paddingHorizontal: 16, paddingVertical: 12 };
    }
  };

  const getTextVariantStyles = (): TextStyle => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return { color: '#2563eb' };
      default:
        return { color: 'white' };
    }
  };

  const getTextSizeStyles = (): TextStyle => {
    switch (size) {
      case 'sm':
        return { fontSize: 14 };
      case 'md':
        return { fontSize: 16 };
      case 'lg':
        return { fontSize: 18 };
      default:
        return { fontSize: 16 };
    }
  };

  const buttonStyle: ViewStyle = {
    ...styles.base,
    ...getVariantStyles(),
    ...getSizeStyles(),
    opacity: (disabled || loading) ? 0.5 : 1,
    ...style,
  };

  const textStyle_: TextStyle = {
    ...styles.text,
    ...getTextVariantStyles(),
    ...getTextSizeStyles(),
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
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
      <Text style={textStyle_}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
}); 