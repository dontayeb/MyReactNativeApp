import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface UseDataLoaderOptions {
  timeout?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number;
  skipIfNoUser?: boolean;
}

export interface DataLoaderState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook to handle data loading with timeout, retry logic, and error handling
 * Prevents infinite loading states and provides better user experience
 */
export function useDataLoader<T>(
  dataFetcher: () => Promise<T>,
  dependencies: any[] = [],
  options: UseDataLoaderOptions = {}
): DataLoaderState<T> {
  const {
    timeout = 30000, // 30 seconds default
    retryAttempts = 2,
    retryDelay = 1000,
    skipIfNoUser = true
  } = options;

  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const currentAttemptRef = useRef(0);

  const loadData = useCallback(async (attempt = 0) => {
    // Skip if no user and skipIfNoUser is true
    if (skipIfNoUser && !user) {
      if (isMountedRef.current) {
        setIsLoading(false);
        setError(null);
        setData(null);
      }
      return;
    }

    if (!isMountedRef.current) return;

    // Only set loading to true on first attempt
    if (attempt === 0) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), timeout);
      });

      // Race between data fetching and timeout
      const result = await Promise.race([
        dataFetcher(),
        timeoutPromise
      ]);

      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setIsLoading(false);
        currentAttemptRef.current = 0;
      }
    } catch (err) {
      console.error('Data loading error:', err);
      
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Retry logic
      if (attempt < retryAttempts) {
        console.log(`Retrying data load (attempt ${attempt + 1}/${retryAttempts})`);
        setTimeout(() => {
          if (isMountedRef.current) {
            loadData(attempt + 1);
          }
        }, retryDelay * (attempt + 1)); // Exponential backoff
      } else {
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [dataFetcher, user, timeout, retryAttempts, retryDelay, skipIfNoUser]);

  const retry = useCallback(() => {
    currentAttemptRef.current = 0;
    loadData(0);
  }, [loadData]);

  const refresh = useCallback(async () => {
    currentAttemptRef.current = 0;
    await loadData(0);
  }, [loadData]);

  // Load data when dependencies change
  useEffect(() => {
    loadData(0);
  }, dependencies);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    retry,
    refresh
  };
}