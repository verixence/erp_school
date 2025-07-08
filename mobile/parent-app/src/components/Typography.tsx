import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { theme } from '../theme/colors';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'muted' | 'inverse';
  size?: keyof typeof theme.typography.fontSize;
  weight?: 'regular' | 'medium' | 'bold';
  style?: TextStyle;
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'primary',
  size = 'base',
  weight = 'regular',
  style,
}) => {
  const textStyle = getTextStyle(variant, size, weight);
  
  return (
    <Text style={[textStyle, style]}>
      {children}
    </Text>
  );
};

// Heading Components
interface HeadingProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'muted' | 'inverse';
  style?: TextStyle;
}

export const Heading1: React.FC<HeadingProps> = ({ children, variant = 'primary', style }) => (
  <Typography variant={variant} size="4xl" weight="bold" style={[styles.heading, style]}>
    {children}
  </Typography>
);

export const Heading2: React.FC<HeadingProps> = ({ children, variant = 'primary', style }) => (
  <Typography variant={variant} size="3xl" weight="bold" style={[styles.heading, style]}>
    {children}
  </Typography>
);

export const Heading3: React.FC<HeadingProps> = ({ children, variant = 'primary', style }) => (
  <Typography variant={variant} size="2xl" weight="bold" style={[styles.heading, style]}>
    {children}
  </Typography>
);

export const Heading4: React.FC<HeadingProps> = ({ children, variant = 'primary', style }) => (
  <Typography variant={variant} size="xl" weight="bold" style={[styles.heading, style]}>
    {children}
  </Typography>
);

export const Heading5: React.FC<HeadingProps> = ({ children, variant = 'primary', style }) => (
  <Typography variant={variant} size="lg" weight="bold" style={[styles.heading, style]}>
    {children}
  </Typography>
);

export const Heading6: React.FC<HeadingProps> = ({ children, variant = 'primary', style }) => (
  <Typography variant={variant} size="base" weight="bold" style={[styles.heading, style]}>
    {children}
  </Typography>
);

// Body Text Components
interface BodyProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'muted' | 'inverse';
  weight?: 'regular' | 'medium' | 'bold';
  style?: TextStyle;
}

export const BodyLarge: React.FC<BodyProps> = ({ children, variant = 'primary', weight = 'regular', style }) => (
  <Typography variant={variant} size="lg" weight={weight} style={style}>
    {children}
  </Typography>
);

export const Body: React.FC<BodyProps> = ({ children, variant = 'primary', weight = 'regular', style }) => (
  <Typography variant={variant} size="base" weight={weight} style={style}>
    {children}
  </Typography>
);

export const BodySmall: React.FC<BodyProps> = ({ children, variant = 'secondary', weight = 'regular', style }) => (
  <Typography variant={variant} size="sm" weight={weight} style={style}>
    {children}
  </Typography>
);

export const Caption: React.FC<BodyProps> = ({ children, variant = 'muted', weight = 'regular', style }) => (
  <Typography variant={variant} size="xs" weight={weight} style={style}>
    {children}
  </Typography>
);

// Utility function for consistent text styling
const getTextStyle = (
  variant: 'primary' | 'secondary' | 'muted' | 'inverse',
  size: keyof typeof theme.typography.fontSize,
  weight: 'regular' | 'medium' | 'bold'
) => ({
  color: theme.colors.text[variant],
  fontSize: theme.typography.fontSize[size],
  fontFamily: theme.typography.fontFamily[weight],
  lineHeight: theme.typography.fontSize[size] * theme.typography.lineHeight.normal,
});

const styles = StyleSheet.create({
  heading: {
    lineHeight: theme.typography.lineHeight.tight,
    marginBottom: theme.spacing.sm,
  },
}); 