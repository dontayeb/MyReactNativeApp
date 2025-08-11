import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../types';
import { LIGHT_THEME, DARK_THEME } from '../constants/theme';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  loadUserTheme: (userId: string) => Promise<void>;
  resetToLightTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(LIGHT_THEME);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadUserTheme = async (userId: string) => {
    try {
      setCurrentUserId(userId);
      const userThemeKey = `theme_${userId}`;
      const savedTheme = await AsyncStorage.getItem(userThemeKey);
      if (savedTheme) {
        setTheme(savedTheme === 'dark' ? DARK_THEME : LIGHT_THEME);
      } else {
        // Default to light theme for new users
        setTheme(LIGHT_THEME);
      }
    } catch (error) {
      console.error('Error loading user theme:', error);
      setTheme(LIGHT_THEME);
    }
  };

  const resetToLightTheme = () => {
    setTheme(LIGHT_THEME);
    setCurrentUserId(null);
  };

  const toggleTheme = async () => {
    if (!currentUserId) {
      console.warn('Cannot toggle theme: no user logged in');
      return;
    }

    try {
      const newTheme = theme.isDark ? LIGHT_THEME : DARK_THEME;
      setTheme(newTheme);
      
      // Save theme preference for the current user
      const userThemeKey = `theme_${currentUserId}`;
      await AsyncStorage.setItem(userThemeKey, newTheme.isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving user theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, loadUserTheme, resetToLightTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};