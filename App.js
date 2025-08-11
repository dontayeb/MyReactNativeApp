import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

// Suppress crypto-js warnings
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Native crypto module could not be used']);

// Initialize crash reporting
import { crashReportingService } from './src/services/crashReportingService';

// Polyfill for Buffer
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Polyfill for Intl and toLocaleString
if (typeof global.Intl === 'undefined') {
  global.Intl = {
    NumberFormat: function(locale, options) {
      return {
        format: function(number) {
          if (options && options.style === 'currency') {
            const symbol = (options.currency === 'USD') ? '$' : (options.currency || '$');
            const decimals = options.minimumFractionDigits || 2;
            return symbol + number.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          }
          const decimals = options ? (options.minimumFractionDigits || 0) : 0;
          return number.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
      };
    }
  };
}

if (!Number.prototype.toLocaleString) {
  Number.prototype.toLocaleString = function() {
    return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
}

if (!Date.prototype.toLocaleString) {
  Date.prototype.toLocaleString = function() {
    return this.toString();
  };
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

// Temporarily comment out complex imports to isolate Platform error
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LocalizationProvider } from './src/contexts/LocalizationContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notificationService';
import { ThemeAuthIntegration } from './src/components/ThemeAuthIntegration';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const AppContent = () => {
  const { theme } = useTheme();
  
  // Set system navigation bar color and style
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Now we can control both background color and button style
      NavigationBar.setBackgroundColorAsync(theme.colors.card);
      NavigationBar.setButtonStyleAsync(theme.isDark ? 'light' : 'dark');
    }
  }, [theme]);
  
  return (
    <>
      <ThemeAuthIntegration />
      <AppNavigator />
      <StatusBar style={theme.isDark ? "light" : "dark"} translucent={true} />
    </>
  );
};

export default function App() {
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize crash reporting first
        await crashReportingService.initialize();
        console.log('Crash reporting service initialized');
        
        // Clear any existing notifications to prevent duplicates
        await notificationService.clearAllNotifications();
        await notificationService.initialize();
        console.log('Notification service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize services:', error);
        // Report initialization errors
        crashReportingService.reportError(error, { context: 'app_initialization' });
      }
    };

    initializeServices();

    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      notificationService.handleNotificationReceived(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      notificationService.handleNotificationResponse(response);
    });

    // Cleanup listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NetworkProvider>
          <ThemeProvider>
            <LocalizationProvider>
              <CurrencyProvider>
                <AuthProvider>
                  <AppContent />
                </AuthProvider>
              </CurrencyProvider>
            </LocalizationProvider>
          </ThemeProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
