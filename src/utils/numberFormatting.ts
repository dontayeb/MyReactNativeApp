/**
 * Utility functions for formatting numbers with thousands separators
 */

/**
 * Formats a number string by adding commas as thousands separators
 * @param value - The input string value
 * @returns Formatted string with commas
 */
export const formatNumberWithCommas = (value: string): string => {
  // Remove all non-digit and non-decimal characters
  const cleanValue = value.replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points - keep only the first one
  const parts = cleanValue.split('.');
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : '';
  const hasDecimalPoint = parts.length > 1;
  
  // Add commas to integer part
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine integer and decimal parts
  if (hasDecimalPoint) {
    return `${integerPart}.${decimalPart}`;
  }
  
  return integerPart;
};

/**
 * Removes commas from a formatted number string
 * @param value - The formatted string with commas
 * @returns Clean number string without commas
 */
export const removeCommasFromNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

/**
 * Validates if a string represents a valid number (with or without commas)
 * @param value - The input string
 * @returns true if valid number, false otherwise
 */
export const isValidNumber = (value: string): boolean => {
  if (!value || value.trim() === '') return false;
  
  const cleanValue = removeCommasFromNumber(value);
  const number = parseFloat(cleanValue);
  
  return !isNaN(number) && isFinite(number);
};

/**
 * Converts a formatted number string to a number
 * @param value - The formatted string (may contain commas)
 * @returns The numeric value
 */
export const parseFormattedNumber = (value: string): number => {
  const cleanValue = removeCommasFromNumber(value);
  return parseFloat(cleanValue) || 0;
};

/**
 * Formats a number for display with commas
 * @param value - The numeric value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with commas
 */
export const formatNumberForDisplay = (value: number, decimals: number = 2): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats large numbers in a mobile-friendly way using abbreviated forms
 * @param value - The numeric value
 * @param decimals - Number of decimal places for abbreviated numbers (default: 1)
 * @returns Abbreviated string (e.g., "1.2M", "345K", "$1,234")
 */
export const formatNumberCompact = (value: number, decimals: number = 1): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1000000000) {
    return `${sign}${(abs / 1000000000).toFixed(decimals)}B`;
  } else if (abs >= 1000000) {
    return `${sign}${(abs / 1000000).toFixed(decimals)}M`;
  } else if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(decimals)}K`;
  } else {
    return formatNumberForDisplay(value, 0);
  }
};

/**
 * Intelligently formats numbers for mobile display - compact for large numbers, full for smaller ones
 * @param value - The numeric value
 * @param threshold - The threshold above which to use compact format (default: 100000)
 * @returns Appropriately formatted string
 */
export const formatNumberMobile = (value: number, threshold: number = 100000): string => {
  if (Math.abs(value) >= threshold) {
    return formatNumberCompact(value);
  } else {
    return formatNumberForDisplay(value, value % 1 === 0 ? 0 : 2);
  }
};