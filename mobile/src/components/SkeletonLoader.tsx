import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
};

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
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
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function EventCardSkeleton() {
  return (
    <View style={styles.eventCardSkeleton}>
      <Skeleton height={120} borderRadius={12} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
      <Skeleton width="50%" height={14} />
    </View>
  );
}

export function EventDetailSkeleton() {
  return (
    <View style={styles.container}>
      <Skeleton height={300} borderRadius={0} style={{ marginBottom: 16 }} />
      <View style={{ paddingHorizontal: 20 }}>
        <Skeleton width="90%" height={24} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
          <View>
            <Skeleton width={100} height={12} style={{ marginBottom: 6 }} />
            <Skeleton width={140} height={14} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <Skeleton width="48%" height={100} borderRadius={12} />
          <Skeleton width="48%" height={100} borderRadius={12} />
        </View>
        <Skeleton width="100%" height={100} borderRadius={12} style={{ marginBottom: 24 }} />
        <Skeleton width="40%" height={18} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={60} borderRadius={12} />
      </View>
    </View>
  );
}

export function NotificationSkeleton() {
  return (
    <View style={styles.notificationSkeleton}>
      <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="80%" height={15} style={{ marginBottom: 6 }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.background.card,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  eventCardSkeleton: {
    width: '48%',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  notificationSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
});
