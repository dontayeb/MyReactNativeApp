import { createClient } from '@supabase/supabase-js';
import { config, logger } from '../config/environment';

// Create Supabase client with environment-specific configuration
export const supabase = createClient(config.apiUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disable for mobile apps
    storage: undefined, // Use default AsyncStorage
  },
  global: {
    headers: {
      'X-Client-Info': 'easywealthguide-mobile',
      'X-App-Version': process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    },
  },
});

// Monitor connection status
supabase.auth.onAuthStateChange((event, session) => {
  logger.info('Auth state changed:', event, session ? 'Session active' : 'No session');
});

// Log Supabase configuration on initialization
logger.info('Supabase client initialized', {
  url: config.apiUrl,
  environment: process.env.EXPO_PUBLIC_APP_ENV || 'development',
});

export default supabase;