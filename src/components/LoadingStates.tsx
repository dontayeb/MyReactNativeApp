import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Generic Loading Spinner
export const LoadingSpinner: React.FC<{ size?: 'small' | 'large'; text?: string }> = ({ 
  size = 'large', 
  text 
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    text: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

// Skeleton for Card-like items
export const CardSkeleton: React.FC<{ height?: number }> = ({ height = 120 }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      height,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    icon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.border,
      marginRight: 12,
    },
    title: {
      height: 16,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      flex: 1,
    },
    subtitle: {
      height: 12,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '70%',
      marginTop: 8,
    },
    amount: {
      height: 20,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '40%',
      marginTop: 12,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon} />
        <View style={styles.title} />
      </View>
      <View style={styles.subtitle} />
      <View style={styles.amount} />
    </View>
  );
};

// Assets List Skeleton
export const AssetsListSkeleton: React.FC = () => {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {[...Array(5)].map((_, index) => (
        <CardSkeleton key={index} height={100} />
      ))}
    </View>
  );
};

// Loans List Skeleton
export const LoansListSkeleton: React.FC = () => {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {[...Array(4)].map((_, index) => (
        <CardSkeleton key={index} height={140} />
      ))}
    </View>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
    },
    summaryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 120,
    },
    summaryTitle: {
      height: 16,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '50%',
      marginBottom: 16,
    },
    summaryAmount: {
      height: 28,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '80%',
      marginBottom: 8,
    },
    summarySubtitle: {
      height: 12,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '60%',
    },
    sectionHeader: {
      height: 20,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '40%',
      marginBottom: 16,
    },
  });

  return (
    <View style={styles.container}>
      {/* Net Worth Card Skeleton */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTitle} />
        <View style={styles.summaryAmount} />
        <View style={styles.summarySubtitle} />
      </View>

      {/* Assets Section Skeleton */}
      <View style={styles.sectionHeader} />
      <CardSkeleton height={80} />

      {/* Loans Section Skeleton */}
      <View style={[styles.sectionHeader, { marginTop: 16 }]} />
      <CardSkeleton height={80} />
    </View>
  );
};

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    name: {
      height: 18,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '60%',
      alignSelf: 'center',
      marginBottom: 8,
    },
    email: {
      height: 14,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '80%',
      alignSelf: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.avatar} />
      <View style={styles.name} />
      <View style={styles.email} />
    </View>
  );
};

// Settings List Skeleton
export const SettingsListSkeleton: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      height: 16,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '30%',
      marginBottom: 16,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    itemIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.border,
      marginRight: 12,
    },
    itemText: {
      flex: 1,
    },
    itemTitle: {
      height: 14,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '70%',
      marginBottom: 6,
    },
    itemSubtitle: {
      height: 12,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      width: '90%',
    },
    itemChevron: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.border,
    },
  });

  return (
    <View style={styles.container}>
      {[...Array(2)].map((_, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <View style={styles.sectionTitle} />
          {[...Array(3)].map((_, itemIndex) => (
            <View key={itemIndex} style={styles.item}>
              <View style={styles.itemIcon} />
              <View style={styles.itemText}>
                <View style={styles.itemTitle} />
                <View style={styles.itemSubtitle} />
              </View>
              <View style={styles.itemChevron} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

// Full Screen Loading
export const FullScreenLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    text: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};