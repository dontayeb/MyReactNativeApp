import { CURRENCIES } from '../constants/currencies';
import { formatNumberMobile, formatNumberCompact } from './numberFormatting';

interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // Rate to USD
}

// Get currency configuration
export const getCurrencyConfig = (currencyCode: string): CurrencyConfig | null => {
  return CURRENCIES.find(curr => curr.code === currencyCode) || null;
};

// Format currency amount with smart display logic
export const formatCurrencyAmount = (
  amount: number, 
  currency: string, 
  defaultCurrency: string,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    precision?: number;
  } = {}
): string => {
  const { showSymbol = true, showCode = true, precision = 2 } = options;
  
  const currencyConfig = getCurrencyConfig(currency);
  if (!currencyConfig) return amount.toFixed(precision);

  // Format the number with appropriate separators
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount);

  // Only show currency info if it's different from default
  const isDifferentCurrency = currency !== defaultCurrency;
  
  if (!isDifferentCurrency) {
    // Same as default currency - only show symbol, never show code
    return showSymbol ? `${currencyConfig.symbol}${formattedAmount}` : formattedAmount;
  } else {
    // Different currency - show both symbol and code
    const symbol = showSymbol ? currencyConfig.symbol : '';
    const code = showCode ? ` ${currency}` : '';
    return `${symbol}${formattedAmount}${code}`;
  }
};

// Mobile-friendly currency formatting that prevents text wrapping
export const formatCurrencyMobile = (
  amount: number, 
  currency: string, 
  defaultCurrency: string,
  options: {
    compact?: boolean;
    threshold?: number;
  } = {}
): string => {
  const { compact = false, threshold = 100000 } = options;
  
  const currencyConfig = getCurrencyConfig(currency);
  if (!currencyConfig) return amount.toString();

  // Use mobile-friendly number formatting
  const formattedAmount = compact ? 
    formatNumberCompact(amount) : 
    formatNumberMobile(amount, threshold);

  // Only show currency info if it's different from default
  const isDifferentCurrency = currency !== defaultCurrency;
  
  if (!isDifferentCurrency) {
    return `${currencyConfig.symbol}${formattedAmount}`;
  } else {
    return `${currencyConfig.symbol}${formattedAmount} ${currency}`;
  }
};

// Convert amount from one currency to another
export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number => {
  if (fromCurrency === toCurrency) return amount;

  const fromConfig = getCurrencyConfig(fromCurrency);
  const toConfig = getCurrencyConfig(toCurrency);

  if (!fromConfig || !toConfig) return amount;

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromConfig.exchangeRate;
  const convertedAmount = usdAmount * toConfig.exchangeRate;

  return convertedAmount;
};

// Convert amount to default currency for net worth calculations
export const convertToDefaultCurrency = (
  amount: number,
  currency: string,
  defaultCurrency: string
): number => {
  return convertCurrency(amount, currency, defaultCurrency);
};

// Get currency symbol only
export const getCurrencySymbol = (currencyCode: string): string => {
  const config = getCurrencyConfig(currencyCode);
  return config?.symbol || currencyCode;
};

// Format for net worth display (always in default currency)
export const formatNetWorthAmount = (
  amount: number,
  defaultCurrency: string
): string => {
  const currencyConfig = getCurrencyConfig(defaultCurrency);
  const symbol = currencyConfig?.symbol || defaultCurrency;
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol}${formattedAmount}`;
};