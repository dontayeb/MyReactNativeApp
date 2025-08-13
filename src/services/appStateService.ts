import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { logger } from '../config/environment';

/**
 * AppStateService handles app lifecycle events and ensures proper
 * reconnection when the app returns from background
 */
export class AppStateService {
  private static instance: AppStateService;
  private appStateSubscription: any;
  private netInfoSubscription: any;
  private backgroundTime: number = 0;
  private readonly SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  private isOnline: boolean = true;
  private sessionRefreshCallbacks: (() => Promise<void>)[] = [];

  static getInstance(): AppStateService {
    if (!AppStateService.instance) {
      AppStateService.instance = new AppStateService();
    }
    return AppStateService.instance;
  }

  initialize() {
    // Listen for app state changes (background/foreground)
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Listen for network connectivity changes
    this.netInfoSubscription = NetInfo.addEventListener(
      this.handleNetworkChange.bind(this)
    );

    logger.info('AppStateService initialized');
  }

  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
    }
  }

  /**
   * Register callback to refresh data when app becomes active
   */
  onSessionRefresh(callback: () => Promise<void>) {
    this.sessionRefreshCallbacks.push(callback);
  }

  private async handleAppStateChange(nextAppState: AppStateStatus) {
    logger.info('App state changed to:', nextAppState);

    switch (nextAppState) {
      case 'background':
      case 'inactive':
        this.backgroundTime = Date.now();
        logger.debug('App went to background at:', new Date(this.backgroundTime));
        break;

      case 'active':
        if (this.backgroundTime > 0) {
          const timeInBackground = Date.now() - this.backgroundTime;
          logger.debug('App returned to foreground after:', timeInBackground, 'ms');
          
          await this.handleAppReturningToForeground(timeInBackground);
        }
        break;
    }
  }

  private async handleNetworkChange(state: any) {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected;

    logger.debug('Network state changed:', {
      isConnected: state.isConnected,
      type: state.type,
      wasOnline
    });

    // If we just came back online, refresh data
    if (!wasOnline && this.isOnline) {
      logger.info('Network reconnected, refreshing session');
      await this.refreshSession();
    }
  }

  private async handleAppReturningToForeground(timeInBackground: number) {
    try {
      logger.info('App returning to foreground after', Math.round(timeInBackground / 1000), 'seconds');

      // Always refresh if app was in background for more than 2 minutes
      if (timeInBackground > 2 * 60 * 1000) {
        logger.info('App was in background for', Math.round(timeInBackground / 60000), 'minutes, refreshing session');
        await this.refreshSession();
        return;
      }

      // Check if Supabase session is still valid with timeout
      const sessionCheckPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 10000);
      });

      const { data: { session }, error } = await Promise.race([
        sessionCheckPromise,
        timeoutPromise
      ]) as any;
      
      if (error) {
        logger.warn('Session check failed:', error);
        await this.refreshSession();
        return;
      }

      if (!session) {
        logger.warn('No active session found after background');
        return;
      }

      // Check if session is close to expiring (within 10 minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const timeUntilExpiry = expiresAt - Date.now();
      
      if (timeUntilExpiry < 10 * 60 * 1000) {
        logger.info('Session expires soon, refreshing');
        await this.refreshAuthSession();
      }

      // Always refresh data when returning to foreground to ensure UI is up to date
      await this.refreshSession();

    } catch (error) {
      logger.error('Error handling foreground return:', error);
      // Force refresh on any error to ensure app state is consistent
      await this.refreshSession();
    }
  }

  private async refreshAuthSession() {
    try {
      logger.debug('Refreshing auth session');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.warn('Session refresh failed:', error);
        return false;
      }
      
      if (data.session) {
        logger.info('Auth session refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Auth session refresh error:', error);
      return false;
    }
  }

  private async refreshSession() {
    try {
      logger.info('Refreshing app session and data');
      
      // Refresh auth session first
      await this.refreshAuthSession();
      
      // Execute all registered refresh callbacks
      const refreshPromises = this.sessionRefreshCallbacks.map(callback => 
        callback().catch(error => {
          logger.error('Session refresh callback failed:', error);
        })
      );
      
      await Promise.allSettled(refreshPromises);
      
      logger.info('Session refresh completed');
    } catch (error) {
      logger.error('Session refresh failed:', error);
    }
  }

  /**
   * Manually trigger session refresh (can be called from UI)
   */
  async forceRefresh() {
    logger.info('Force refresh requested');
    await this.refreshSession();
  }

  /**
   * Check if we should show network error
   */
  isOffline(): boolean {
    return !this.isOnline;
  }
}

export const appStateService = AppStateService.getInstance();