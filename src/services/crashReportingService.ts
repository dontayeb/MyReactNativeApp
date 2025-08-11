import { config, logger } from '../config/environment';

/**
 * Crash Reporting Service for EasyWealthGuide
 * 
 * Provides error tracking and crash reporting functionality
 * Can be extended with services like Sentry, Bugsnag, or Firebase Crashlytics
 */

export interface CrashReport {
  error: Error;
  context?: Record<string, any>;
  userId?: string;
  timestamp: string;
  appVersion: string;
  platform: string;
  stackTrace?: string;
}

export class CrashReportingService {
  private static instance: CrashReportingService;
  private initialized: boolean = false;

  static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      // Initialize crash reporting service (extend with Sentry, etc.)
      if (config.performanceMonitoring) {
        await this.initializeExternalService();
      }

      this.initialized = true;
      logger.info('Crash reporting service initialized');
    } catch (error) {
      logger.error('Failed to initialize crash reporting:', error);
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    if (typeof global !== 'undefined') {
      global.onunhandledrejection = (event: any) => {
        this.reportError(new Error(`Unhandled promise rejection: ${event.reason}`), {
          type: 'unhandled_promise_rejection',
          reason: event.reason,
        });
      };

      // Handle uncaught exceptions
      global.onerror = (message: any, source?: string, lineno?: number, colno?: number, error?: Error) => {
        this.reportError(error || new Error(message), {
          type: 'uncaught_exception',
          source,
          lineno,
          colno,
        });
      };
    }
  }

  private async initializeExternalService() {
    // Placeholder for external crash reporting service initialization
    // You can integrate Sentry, Bugsnag, or Firebase Crashlytics here
    
    // Example Sentry integration (uncomment when implementing):
    /*
    import * as Sentry from '@sentry/react-native';
    
    Sentry.init({
      dsn: 'YOUR_SENTRY_DSN',
      environment: config.environment,
    });
    */
    
    logger.info('External crash reporting service ready for integration');
  }

  /**
   * Report an error to the crash reporting service
   */
  async reportError(error: Error, context?: Record<string, any>): Promise<void> {
    try {
      const crashReport: CrashReport = {
        error,
        context,
        timestamp: new Date().toISOString(),
        appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        platform: 'mobile',
        stackTrace: error.stack,
      };

      // Log locally for development
      if (config.debugMode) {
        logger.error('Crash Report:', crashReport);
      }

      // Send to external service in production
      if (config.performanceMonitoring && !config.debugMode) {
        await this.sendCrashReport(crashReport);
      }

      // Store locally for offline reporting
      await this.storeLocalCrashReport(crashReport);

    } catch (reportingError) {
      logger.error('Failed to report crash:', reportingError);
    }
  }

  /**
   * Report a non-fatal error
   */
  async reportNonFatalError(error: Error, context?: Record<string, any>): Promise<void> {
    const enhancedContext = {
      ...context,
      severity: 'non-fatal',
    };

    await this.reportError(error, enhancedContext);
  }

  /**
   * Report app performance metrics
   */
  async reportPerformanceMetric(metricName: string, value: number, context?: Record<string, any>): Promise<void> {
    if (!config.performanceMonitoring) {
      return;
    }

    try {
      const performanceData = {
        metric: metricName,
        value,
        context,
        timestamp: new Date().toISOString(),
        appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      };

      logger.debug('Performance metric:', performanceData);

      // Send to analytics service
      if (config.analyticsEnabled) {
        // You can integrate with your analytics service here
        const { analyticsService } = await import('./analyticsService');
        // analyticsService.trackPerformanceMetric(performanceData);
      }
    } catch (error) {
      logger.error('Failed to report performance metric:', error);
    }
  }

  /**
   * Set user context for crash reports
   */
  setUserContext(userId: string, userInfo?: Record<string, any>): void {
    try {
      // Set user context for external crash reporting service
      // Example for Sentry:
      // Sentry.setUser({ id: userId, ...userInfo });

      logger.debug('User context set for crash reporting:', userId);
    } catch (error) {
      logger.error('Failed to set user context:', error);
    }
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(message: string, category?: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info'): void {
    try {
      const breadcrumb = {
        message,
        category: category || 'app',
        level,
        timestamp: new Date().toISOString(),
      };

      // Add to external service
      // Example for Sentry:
      // Sentry.addBreadcrumb(breadcrumb);

      logger.debug('Breadcrumb added:', breadcrumb);
    } catch (error) {
      logger.error('Failed to add breadcrumb:', error);
    }
  }

  private async sendCrashReport(crashReport: CrashReport): Promise<void> {
    try {
      // Send to your crash reporting backend
      // This could be Sentry, Bugsnag, Firebase, or your own service
      
      // Example implementation:
      /*
      const response = await fetch('https://your-crash-reporting-endpoint.com/crashes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-api-key',
        },
        body: JSON.stringify(crashReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      */

      logger.info('Crash report sent successfully');
    } catch (error) {
      logger.error('Failed to send crash report:', error);
      throw error;
    }
  }

  private async storeLocalCrashReport(crashReport: CrashReport): Promise<void> {
    try {
      // Store crash report locally for offline scenarios
      // You can use AsyncStorage or SQLite for persistence
      
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const key = `crash_report_${Date.now()}`;
      
      await AsyncStorage.default.setItem(key, JSON.stringify(crashReport));
      logger.debug('Crash report stored locally:', key);
      
      // Clean up old reports (keep last 10)
      await this.cleanupOldCrashReports();
    } catch (error) {
      logger.error('Failed to store crash report locally:', error);
    }
  }

  private async cleanupOldCrashReports(): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const keys = await AsyncStorage.default.getAllKeys();
      
      const crashReportKeys = keys
        .filter(key => key.startsWith('crash_report_'))
        .sort()
        .reverse();

      // Keep only the 10 most recent crash reports
      const keysToDelete = crashReportKeys.slice(10);
      
      if (keysToDelete.length > 0) {
        await AsyncStorage.default.multiRemove(keysToDelete);
        logger.debug('Cleaned up old crash reports:', keysToDelete.length);
      }
    } catch (error) {
      logger.error('Failed to cleanup old crash reports:', error);
    }
  }

  /**
   * Test crash reporting (development only)
   */
  testCrashReporting(): void {
    if (!config.debugMode) {
      logger.warn('Crash reporting test only available in debug mode');
      return;
    }

    // Test non-fatal error
    this.reportNonFatalError(new Error('Test non-fatal error'), {
      test: true,
      feature: 'crash_reporting_test',
    });

    // Test performance metric
    this.reportPerformanceMetric('test_metric', 123.45, {
      test: true,
    });

    logger.info('Crash reporting test completed');
  }
}

export const crashReportingService = CrashReportingService.getInstance();

// Export utility functions for easy use throughout the app
export const reportError = (error: Error, context?: Record<string, any>) => 
  crashReportingService.reportError(error, context);

export const reportNonFatalError = (error: Error, context?: Record<string, any>) => 
  crashReportingService.reportNonFatalError(error, context);

export const addBreadcrumb = (message: string, category?: string, level?: 'debug' | 'info' | 'warning' | 'error') => 
  crashReportingService.addBreadcrumb(message, category, level);

export const setUserContext = (userId: string, userInfo?: Record<string, any>) => 
  crashReportingService.setUserContext(userId, userInfo);

export const reportPerformanceMetric = (metricName: string, value: number, context?: Record<string, any>) => 
  crashReportingService.reportPerformanceMetric(metricName, value, context);