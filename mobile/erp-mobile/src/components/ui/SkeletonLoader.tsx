import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const StatCardSkeleton: React.FC = () => (
  <View style={styles.statCardSkeleton}>
    <SkeletonLoader width={40} height={40} borderRadius={20} />
    <SkeletonLoader width={30} height={24} style={{ marginTop: 8 }} />
    <SkeletonLoader width={50} height={14} style={{ marginTop: 4 }} />
  </View>
);

export const ActionCardSkeleton: React.FC = () => (
  <View style={styles.actionCardSkeleton}>
    <SkeletonLoader width={60} height={60} borderRadius={30} />
    <SkeletonLoader width="80%" height={20} style={{ marginTop: 12 }} />
    <SkeletonLoader width="60%" height={14} style={{ marginTop: 8 }} />
  </View>
);

export const ListItemSkeleton: React.FC = () => (
  <View style={styles.listItemSkeleton}>
    <SkeletonLoader width={48} height={48} borderRadius={24} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <SkeletonLoader width="70%" height={18} />
      <SkeletonLoader width="50%" height={14} style={{ marginTop: 8 }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  statCardSkeleton: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionCardSkeleton: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#f3f4f6',
    height: 160,
    width: '48%',
  },
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
  },
});
