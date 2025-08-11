import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENCIES, getCurrencyByCode, formatCurrency } from '../constants/currencies';
import { Currency } from '../types';

interface CurrencyContextType {
  defaultCurrency: string;
  setDefaultCurrency: (currency: string, userId?: string) => void;
  convertToDefault: boolean;
  setConvertToDefault: (convert: boolean) => void;
  formatAmount: (amount: number, currencyCode: string) => string;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => number;
  currencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [defaultCurrency, setDefaultCurrencyState] = useState<string>('USD');
  const [convertToDefault, setConvertToDefaultState] = useState<boolean>(false);

  useEffect(() => {
    loadCurrencySettings();
  }, []);

  const loadCurrencySettings = async () => {
    try {
      const savedCurrency = await AsyncStorage.getItem('defaultCurrency');
      const savedConvertSetting = await AsyncStorage.getItem('convertToDefault');
      
      if (savedCurrency) {
        setDefaultCurrencyState(savedCurrency);
      }
      if (savedConvertSetting) {
        setConvertToDefaultState(JSON.parse(savedConvertSetting));
      }
    } catch (error) {
      console.error('Error loading currency settings:', error);
    }
  };

  const setDefaultCurrency = async (currency: string, userId?: string) => {
    try {
      const oldCurrency = defaultCurrency;
      setDefaultCurrencyState(currency);
      await AsyncStorage.setItem('defaultCurrency', currency);
      
      // If currency changed and we have a userId, trigger update of default currency entries
      if (oldCurrency !== currency && userId) {
        await updateDefaultCurrencyEntries(oldCurrency, currency, userId);
      }
    } catch (error) {
      console.error('Error saving default currency:', error);
    }
  };

  const updateDefaultCurrencyEntries = async (oldCurrency: string, newCurrency: string, userId: string) => {
    try {
      console.log(`Updating entries from ${oldCurrency} to ${newCurrency} for user ${userId}`);
      
      // Dynamic import to avoid circular dependency
      const { dataService } = await import('../services/dataService');

      // Update user profile first
      await dataService.updateUserDefaultCurrency(userId, newCurrency);
      
      // Update assets that were in the old default currency
      await dataService.updateDefaultCurrencyAssets(userId, oldCurrency, newCurrency);
      
      // Update loans that were in the old default currency  
      await dataService.updateDefaultCurrencyLoans(userId, oldCurrency, newCurrency);
      
      console.log(`Successfully updated currency entries from ${oldCurrency} to ${newCurrency}`);
    } catch (error) {
      console.error('Error updating default currency entries:', error);
      // Don't throw here to prevent UI crashes - log and continue
    }
  };

  const setConvertToDefault = async (convert: boolean) => {
    try {
      setConvertToDefaultState(convert);
      await AsyncStorage.setItem('convertToDefault', JSON.stringify(convert));
    } catch (error) {
      console.error('Error saving convert setting:', error);
    }
  };

  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    const fromCurrencyData = getCurrencyByCode(fromCurrency);
    const toCurrencyData = getCurrencyByCode(toCurrency);
    
    if (!fromCurrencyData || !toCurrencyData) return amount;
    
    const usdAmount = amount / fromCurrencyData.exchangeRate;
    return usdAmount * toCurrencyData.exchangeRate;
  };

  const formatAmount = (amount: number, currencyCode: string): string => {
    if (convertToDefault && currencyCode !== defaultCurrency) {
      const convertedAmount = convertAmount(amount, currencyCode, defaultCurrency);
      return formatCurrency(convertedAmount, defaultCurrency);
    }
    return formatCurrency(amount, currencyCode);
  };

  return (
    <CurrencyContext.Provider value={{
      defaultCurrency,
      setDefaultCurrency,
      convertToDefault,
      setConvertToDefault,
      formatAmount,
      convertAmount,
      currencies: CURRENCIES,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};