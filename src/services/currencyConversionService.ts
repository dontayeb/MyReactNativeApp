import AsyncStorage from '@react-native-async-storage/async-storage';
import { config, logger } from '../config/environment';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

export interface CurrencyConversionResult {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: number;
  source: 'api' | 'cache' | 'fallback';
}

class CurrencyConversionService {
  private readonly CACHE_KEY = 'currency_exchange_rates';
  private readonly CACHE_EXPIRY = 4 * 60 * 60 * 1000; // 4 hours
  private readonly API_TIMEOUT = 5000; // 5 seconds instead of 10
  private readonly API_ENDPOINTS = [
    'https://api.exchangerate-api.com/v4/latest/', // Free tier: 1500 requests/month
    'https://open.er-api.com/v6/latest/', // Fast backup free service
    // Removed fixer.io as it requires API key
  ];

  private cachedRates: Map<string, ExchangeRate> = new Map();
  private lastFetchTime = 0;

  constructor() {
    this.loadCachedRates();
  }

  private async loadCachedRates(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const rates: ExchangeRate[] = JSON.parse(cached);
        rates.forEach(rate => {
          const key = `${rate.from}_${rate.to}`;
          this.cachedRates.set(key, rate);
        });
        logger.info(`Loaded ${rates.length} cached exchange rates`);
      }
    } catch (error) {
      logger.error('Error loading cached exchange rates:', error);
    }
  }

  private async saveCachedRates(): Promise<void> {
    try {
      const rates = Array.from(this.cachedRates.values());
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(rates));
      logger.info(`Saved ${rates.length} exchange rates to cache`);
    } catch (error) {
      logger.error('Error saving cached exchange rates:', error);
    }
  }

  private getCacheKey(fromCurrency: string, toCurrency: string): string {
    return `${fromCurrency}_${toCurrency}`;
  }

  private async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number> | null> {
    // Try each endpoint with timeout
    for (const endpoint of this.API_ENDPOINTS) {
      try {
        logger.info(`Fetching exchange rates from ${endpoint}${baseCurrency}`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);
        
        const response = await fetch(`${endpoint}${baseCurrency}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'WealthTracker/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle different API response formats
        let rates: Record<string, number>;
        if (data.rates) {
          rates = data.rates;
        } else if (data.conversion_rates) {
          rates = data.conversion_rates;
        } else {
          throw new Error('Invalid API response format');
        }

        // Ensure base currency is included
        rates[baseCurrency] = 1.0;

        logger.info(`Successfully fetched ${Object.keys(rates).length} exchange rates`);
        return rates;
        
      } catch (error) {
        if (error.name === 'AbortError') {
          logger.warn(`Request to ${endpoint} timed out after ${this.API_TIMEOUT}ms`);
        } else {
          logger.warn(`Failed to fetch from ${endpoint}:`, error);
        }
        continue;
      }
    }
    
    logger.warn('All currency API endpoints failed, using fallback rates');
    return null;
  }

  private async updateExchangeRates(baseCurrency: string = 'USD'): Promise<boolean> {
    try {
      const rates = await this.fetchExchangeRates(baseCurrency);
      if (!rates) return false;

      const timestamp = Date.now();
      
      // Update cache with new rates
      Object.entries(rates).forEach(([toCurrency, rate]) => {
        if (toCurrency !== baseCurrency) {
          const exchangeRate: ExchangeRate = {
            from: baseCurrency,
            to: toCurrency,
            rate,
            timestamp,
          };
          
          const key = this.getCacheKey(baseCurrency, toCurrency);
          this.cachedRates.set(key, exchangeRate);

          // Also store reverse rate
          const reverseRate: ExchangeRate = {
            from: toCurrency,
            to: baseCurrency,
            rate: 1 / rate,
            timestamp,
          };
          
          const reverseKey = this.getCacheKey(toCurrency, baseCurrency);
          this.cachedRates.set(reverseKey, reverseRate);
        }
      });

      // Calculate cross rates for common currency pairs
      this.calculateCrossRates(rates, timestamp);

      await this.saveCachedRates();
      this.lastFetchTime = timestamp;
      
      return true;
    } catch (error) {
      logger.error('Error updating exchange rates:', error);
      return false;
    }
  }

  private calculateCrossRates(usdRates: Record<string, number>, timestamp: number): void {
    const majorCurrencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
    
    majorCurrencies.forEach(fromCurrency => {
      if (!usdRates[fromCurrency]) return;
      
      majorCurrencies.forEach(toCurrency => {
        if (fromCurrency === toCurrency || !usdRates[toCurrency]) return;
        
        // Calculate cross rate: FROM -> USD -> TO
        const crossRate = usdRates[toCurrency] / usdRates[fromCurrency];
        
        const exchangeRate: ExchangeRate = {
          from: fromCurrency,
          to: toCurrency,
          rate: crossRate,
          timestamp,
        };
        
        const key = this.getCacheKey(fromCurrency, toCurrency);
        this.cachedRates.set(key, exchangeRate);
      });
    });
  }

  private getCachedRate(fromCurrency: string, toCurrency: string): ExchangeRate | null {
    const key = this.getCacheKey(fromCurrency, toCurrency);
    const rate = this.cachedRates.get(key);
    
    if (!rate) return null;
    
    // Check if rate is still valid (not expired)
    const now = Date.now();
    if (now - rate.timestamp > this.CACHE_EXPIRY) {
      this.cachedRates.delete(key);
      return null;
    }
    
    return rate;
  }

  private getFallbackRate(fromCurrency: string, toCurrency: string): number {
    // Import the static rates as fallback
    const { getCurrencyByCode } = require('../constants/currencies');
    
    const fromCurrencyData = getCurrencyByCode(fromCurrency);
    const toCurrencyData = getCurrencyByCode(toCurrency);
    
    if (!fromCurrencyData || !toCurrencyData) return 1;
    
    // Convert via USD
    const usdAmount = 1 / fromCurrencyData.exchangeRate;
    return usdAmount * toCurrencyData.exchangeRate;
  }

  public async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    forceRefresh: boolean = false
  ): Promise<CurrencyConversionResult> {
    // Same currency, no conversion needed
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        timestamp: Date.now(),
        source: 'cache',
      };
    }

    let exchangeRate: number;
    let source: 'api' | 'cache' | 'fallback';
    let timestamp: number;

    // Try to get cached rate first (prioritize speed)
    const cachedRate = this.getCachedRate(fromCurrency, toCurrency);
    
    if (cachedRate && !forceRefresh) {
      exchangeRate = cachedRate.rate;
      timestamp = cachedRate.timestamp;
      source = 'cache';
    } else {
      // Use fallback rate immediately for speed
      exchangeRate = this.getFallbackRate(fromCurrency, toCurrency);
      timestamp = Date.now();
      source = 'fallback';
      
      // Try to fetch new rates in background only if forced refresh
      if (forceRefresh) {
        try {
          const success = await this.updateExchangeRates();
          if (success) {
            const freshRate = this.getCachedRate(fromCurrency, toCurrency);
            if (freshRate) {
              exchangeRate = freshRate.rate;
              timestamp = freshRate.timestamp;
              source = 'api';
            }
          }
        } catch (error) {
          logger.warn('Background rate update failed:', error);
          // Continue with fallback rate
        }
      }
    }

    const convertedAmount = amount * exchangeRate;

    logger.info(`Converted ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency} (rate: ${exchangeRate}, source: ${source})`);

    return {
      originalAmount: amount,
      convertedAmount,
      fromCurrency,
      toCurrency,
      exchangeRate,
      timestamp,
      source,
    };
  }

  // Fast conversion using only cached or fallback rates (no API calls)
  public convertCurrencyFast(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): CurrencyConversionResult {
    // Same currency, no conversion needed
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        timestamp: Date.now(),
        source: 'cache',
      };
    }

    let exchangeRate: number;
    let source: 'api' | 'cache' | 'fallback';
    let timestamp: number;

    // Try cached rate first
    const cachedRate = this.getCachedRate(fromCurrency, toCurrency);
    
    if (cachedRate) {
      exchangeRate = cachedRate.rate;
      timestamp = cachedRate.timestamp;
      source = 'cache';
    } else {
      // Use fallback rate immediately
      exchangeRate = this.getFallbackRate(fromCurrency, toCurrency);
      timestamp = Date.now();
      source = 'fallback';
    }

    const convertedAmount = amount * exchangeRate;

    return {
      originalAmount: amount,
      convertedAmount,
      fromCurrency,
      toCurrency,
      exchangeRate,
      timestamp,
      source,
    };
  }

  public async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const result = await this.convertCurrency(1, fromCurrency, toCurrency);
    return result.exchangeRate;
  }

  public async refreshRates(): Promise<boolean> {
    return await this.updateExchangeRates();
  }

  public clearCache(): void {
    this.cachedRates.clear();
    AsyncStorage.removeItem(this.CACHE_KEY);
    logger.info('Currency conversion cache cleared');
  }

  public getCacheInfo(): { count: number; oldestTimestamp: number; newestTimestamp: number } {
    const rates = Array.from(this.cachedRates.values());
    
    if (rates.length === 0) {
      return { count: 0, oldestTimestamp: 0, newestTimestamp: 0 };
    }

    const timestamps = rates.map(r => r.timestamp);
    
    return {
      count: rates.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps),
    };
  }
}

export const currencyConversionService = new CurrencyConversionService();