import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface SkeletonLoaderProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: any;
}

const SkeletonItem: React.FC<SkeletonLoaderProps> = ({ 
  height = 20, 
  width = '100%', 
  borderRadius = 8, 
  style 
}) => {
  const { theme } = useTheme();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = () => {
      shimmerAnimation.setValue(0);
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        shimmer();
      });
    };
    
    shimmer();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [typeof width === 'number' ? -width : -200, typeof width === 'number' ? width : 200],
  });

  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius,
          backgroundColor: theme.isDark ? '#2a2a2a' : '#f0f0f0',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

export const SkeletonLoader: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Summary Cards Skeleton */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <SkeletonItem height={16} width="60%" style={{ marginBottom: 8 }} />
          <SkeletonItem height={24} width="80%" />
        </View>
        <View style={styles.summaryCard}>
          <SkeletonItem height={16} width="70%" style={{ marginBottom: 8 }} />
          <SkeletonItem height={24} width="75%" />
        </View>
      </View>

      {/* Loan Items Skeleton */}
      {[1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={[styles.loanItem, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.loanHeader}>
            <SkeletonItem height={18} width="40%" />
            <SkeletonItem height={16} width="25%" />
          </View>
          
          <View style={styles.loanDetails}>
            <View style={styles.loanDetailRow}>
              <SkeletonItem height={14} width="30%" />
              <SkeletonItem height={14} width="35%" />
            </View>
            <View style={styles.loanDetailRow}>
              <SkeletonItem height={14} width="25%" />
              <SkeletonItem height={14} width="40%" />
            </View>
          </View>

          <View style={styles.progressContainer}>
            <SkeletonItem height={6} width="100%" borderRadius={3} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loanItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loanDetails: {
    marginBottom: 12,
  },
  loanDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressContainer: {
    marginTop: 8,
  },
});