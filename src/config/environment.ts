import Constants from 'expo-constants';

// Get environment from build configuration or default to development
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = process.env.EXPO_PUBLIC_APP_ENV || Constants.expoConfig?.extra?.APP_ENV;
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

export const environment = getEnvironment();

// Environment-specific configurations
const configs = {
  development: {
    apiUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'development-key',
    analyticsEnabled: false,
    debugMode: __DEV__,
    enableNotifications: true,
    enableBiometricAuth: false,
    enableOfflineMode: true,
    performanceMonitoring: false,
    enableSSLPinning: false,
  },
  staging: {
    apiUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://staging-project.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'staging-key',
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
    debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
    enableNotifications: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === 'true',
    enableBiometricAuth: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH === 'true',
    enableOfflineMode: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
    performanceMonitoring: process.env.EXPO_PUBLIC_PERFORMANCE_MONITORING === 'true',
    enableSSLPinning: process.env.EXPO_PUBLIC_ENABLE_SSL_PINNING === 'true',
  },
  production: {
    apiUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://production-project.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'production-key',
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
    debugMode: false,
    enableNotifications: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === 'true',
    enableBiometricAuth: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH === 'true',
    enableOfflineMode: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
    performanceMonitoring: process.env.EXPO_PUBLIC_PERFORMANCE_MONITORING === 'true',
    enableSSLPinning: process.env.EXPO_PUBLIC_ENABLE_SSL_PINNING === 'true',
  },
};

export const config = configs[environment];

// App version information
export const appVersion = {
  version: process.env.EXPO_PUBLIC_APP_VERSION || Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.ios?.buildNumber || 1,
  minSupportedVersion: process.env.EXPO_PUBLIC_MIN_SUPPORTED_VERSION || '1.0.0',
};

// Support information
export const support = {
  email: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@easywealthguide.com',
  feedbackUrl: process.env.EXPO_PUBLIC_FEEDBACK_URL || 'https://easywealthguide.com/feedback',
};

// Feature flags
export const features = {
  notifications: config.enableNotifications,
  biometricAuth: config.enableBiometricAuth,
  offlineMode: config.enableOfflineMode,
  analytics: config.analyticsEnabled,
  performanceMonitoring: config.performanceMonitoring,
  sslPinning: config.enableSSLPinning,
};

// Development utilities
export const isDevelopment = environment === 'development';
export const isStaging = environment === 'staging';
export const isProduction = environment === 'production';
export const isDebugMode = config.debugMode;

// Logging utility that respects environment
export const logger = {
  debug: (...args: any[]) => {
    if (config.debugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (config.debugMode || !isProduction) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};

// Environment validation
export const validateEnvironment = () => {
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    if (isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  logger.info('Environment configuration loaded:', {
    environment,
    apiUrl: config.apiUrl,
    analyticsEnabled: config.analyticsEnabled,
    version: appVersion.version,
    buildNumber: appVersion.buildNumber,
  });
};

// Initialize environment validation
validateEnvironment();