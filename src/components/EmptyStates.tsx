import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  illustrationColor?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  illustrationColor
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingVertical: 60,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: (illustrationColor || theme.colors.primary) + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    description: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    actionButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginRight: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon as any}
          size={48}
          color={illustrationColor || theme.colors.primary}
        />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      {actionText && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionText}</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Pre-configured empty states for common scenarios
export const NoAssetsEmptyState: React.FC<{ onAddAsset: () => void }> = ({ onAddAsset }) => (
  <EmptyState
    icon="wallet-outline"
    title="No Assets Yet"
    description="Start building your wealth portfolio by adding your first asset. Track bank accounts, investments, property, and more."
    actionText="Add Your First Asset"
    onAction={onAddAsset}
    illustrationColor="#10B981"
  />
);

export const NoLoansEmptyState: React.FC<{ onAddLoan: () => void }> = ({ onAddLoan }) => (
  <EmptyState
    icon="card-outline"
    title="No Loans or Debt"
    description="Track your loans, credit cards, and other debts to better manage your payments and payoff strategies."
    actionText="Add Your First Loan"
    onAction={onAddLoan}
    illustrationColor="#F59E0B"
  />
);

export const NoPaymentsEmptyState: React.FC = () => (
  <EmptyState
    icon="calendar-clear-outline"
    title="No Upcoming Payments"
    description="Great! You don't have any payments due in the next 30 days. Keep up the excellent financial management."
    illustrationColor="#10B981"
  />
);

export const NoTransactionsEmptyState: React.FC<{ onAddTransaction?: () => void }> = ({ onAddTransaction }) => (
  <EmptyState
    icon="receipt-outline"
    title="No Transactions Yet"
    description="Transaction history will appear here once you start adding payments and other financial activities."
    actionText={onAddTransaction ? "Add Transaction" : undefined}
    onAction={onAddTransaction}
    illustrationColor="#6366F1"
  />
);

export const NoNotificationsEmptyState: React.FC = () => (
  <EmptyState
    icon="notifications-outline"
    title="No Notifications"
    description="You're all caught up! Payment reminders and important updates will appear here."
    illustrationColor="#8B5CF6"
  />
);

export const NoSearchResultsEmptyState: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => (
  <EmptyState
    icon="search-outline"
    title="No Results Found"
    description={searchQuery ? 
      `We couldn't find anything matching "${searchQuery}". Try adjusting your search terms.` :
      "No results found. Try adjusting your search terms."
    }
    illustrationColor="#6B7280"
  />
);

export const OfflineEmptyState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="cloud-offline-outline"
    title="You're Offline"
    description="Please check your internet connection and try again. Some features may be limited while offline."
    actionText={onRetry ? "Retry" : undefined}
    onAction={onRetry}
    illustrationColor="#EF4444"
  />
);

export const ErrorEmptyState: React.FC<{ onRetry?: () => void; errorMessage?: string }> = ({ onRetry, errorMessage }) => (
  <EmptyState
    icon="warning-outline"
    title="Something Went Wrong"
    description={errorMessage || "We encountered an error while loading your data. Please try again."}
    actionText={onRetry ? "Try Again" : undefined}
    onAction={onRetry}
    illustrationColor="#EF4444"
  />
);

export const DataExportEmptyState: React.FC<{ onStartExport: () => void }> = ({ onStartExport }) => (
  <EmptyState
    icon="download-outline"
    title="Export Your Data"
    description="Download a complete copy of all your financial data in JSON format for your records or to transfer to another service."
    actionText="Start Export"
    onAction={onStartExport}
    illustrationColor="#3B82F6"
  />
);

export const WelcomeEmptyState: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => (
  <EmptyState
    icon="sparkles-outline"
    title="Welcome to WealthTracker"
    description="Take control of your finances by tracking your assets, managing loans, and monitoring your net worth all in one place."
    actionText="Get Started"
    onAction={onGetStarted}
    illustrationColor="#8B5CF6"
  />
);