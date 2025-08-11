import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from './ErrorBoundary';

interface ScreenErrorFallbackProps {
  onRetry: () => void;
  screenName?: string;
}

const ScreenErrorFallback: React.FC<ScreenErrorFallbackProps> = ({ onRetry, screenName }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Ionicons name="alert-circle" size={64} color="#F59E0B" />
        
        <Text style={styles.title}>Screen Error</Text>
        
        <Text style={styles.description}>
          {screenName ? `The ${screenName} screen` : 'This screen'} encountered an error and couldn't load properly.
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.retryButtonText}>Reload Screen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

interface ScreenErrorBoundaryProps {
  children: React.ReactNode;
  screenName?: string;
  navigation?: any;
}

export const ScreenErrorBoundary: React.FC<ScreenErrorBoundaryProps> = ({ 
  children, 
  screenName,
  navigation 
}) => {
  const handleError = (error: Error, errorInfo: any) => {
    // Log screen-specific error
    console.error(`Screen Error in ${screenName}:`, error);
    console.error('Error Info:', errorInfo);
    
    // You could send this to an error reporting service
    // Example: Crashlytics.recordError(error);
  };

  const handleRetry = () => {
    // If navigation is available, we could navigate back or refresh
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallbackComponent={
        <ScreenErrorFallback 
          onRetry={handleRetry} 
          screenName={screenName} 
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});