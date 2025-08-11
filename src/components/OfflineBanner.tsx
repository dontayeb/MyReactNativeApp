import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNetwork } from '../contexts/NetworkContext';
import { offlineStorageService } from '../services/offlineStorageService';

export const OfflineBanner: React.FC = () => {
  const { theme } = useTheme();
  const { isConnected, isInternetReachable } = useNetwork();
  const [showBanner, setShowBanner] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [bannerOpacity] = useState(new Animated.Value(0));

  const isOffline = !isConnected || !isInternetReachable;

  useEffect(() => {
    const loadLastSyncTime = async () => {
      const syncTime = await offlineStorageService.getLastSyncTime();
      setLastSyncTime(syncTime);
    };
    
    loadLastSyncTime();
  }, []);

  useEffect(() => {
    if (isOffline) {
      setShowBanner(true);
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowBanner(false);
      });
    }
  }, [isOffline, bannerOpacity]);

  const getLastSyncText = () => {
    if (!lastSyncTime) return 'No cached data available';
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSyncTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Last synced just now';
    if (diffMinutes < 60) return `Last synced ${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Last synced ${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Last synced ${diffDays}d ago`;
  };

  if (!showBanner) return null;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: '#F59E0B',
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 8,
    },
    icon: {
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.9)',
    },
  });

  return (
    <Animated.View style={[styles.container, { opacity: bannerOpacity }]}>
      <Ionicons 
        name="cloud-offline" 
        size={20} 
        color="white" 
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>You're offline</Text>
        <Text style={styles.subtitle}>{getLastSyncText()}</Text>
      </View>
    </Animated.View>
  );
};