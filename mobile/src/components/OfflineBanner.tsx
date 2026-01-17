import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useNetworkStatus } from '../hooks/useOffline';

interface OfflineBannerProps {
  isFromCache?: boolean;
}

export function OfflineBanner({ isFromCache }: OfflineBannerProps) {
  const isOnline = useNetworkStatus();

  if (isOnline && !isFromCache) {
    return null;
  }

  return (
    <View style={[styles.container, isOnline ? styles.cacheMode : styles.offlineMode]}>
      {!isOnline ? (
        <>
          <WifiOff size={16} color={colors.text.primary} />
          <Text style={styles.text}>Mode hors ligne</Text>
        </>
      ) : (
        <>
          <RefreshCw size={16} color={colors.text.primary} />
          <Text style={styles.text}>Données en cache</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineMode: {
    backgroundColor: '#ef4444',
  },
  cacheMode: {
    backgroundColor: '#f59e0b',
  },
  text: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
