import { logger } from '../config/environment';

/**
 * Retry utility for handling network requests that may fail
 * due to temporary connectivity issues
 */

export interface RetryConfig {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: true,
  onRetry: () => {},
};

/**
 * Retry a promise-returning function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts`);
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      
      logger.warn(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === finalConfig.maxAttempts) {
        logger.error(`All ${finalConfig.maxAttempts} attempts failed`);
        break;
      }

      // Call retry callback
      finalConfig.onRetry(attempt, lastError);

      // Calculate delay with exponential backoff
      const delay = finalConfig.backoff 
        ? finalConfig.delay * Math.pow(2, attempt - 1)
        : finalConfig.delay;

      logger.debug(`Waiting ${delay}ms before retry ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if an error is retryable (network/temporary errors)
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('failed to fetch') ||
    error.name === 'NetworkError' ||
    error.name === 'AbortError'
  );
}

/**
 * Retry only if the error is retryable
 */
export async function retryIfNetworkError<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  return retryAsync(fn, {
    ...config,
    onRetry: (attempt, error) => {
      if (!isRetryableError(error)) {
        throw error; // Don't retry non-network errors
      }
      config.onRetry?.(attempt, error);
    },
  });
}