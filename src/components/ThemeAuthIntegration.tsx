import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeAuthIntegration: React.FC = () => {
  const { user } = useAuth();
  const { loadUserTheme, resetToLightTheme } = useTheme();

  useEffect(() => {
    if (user) {
      // User logged in - load their theme preference
      loadUserTheme(user.id);
    } else {
      // User logged out - reset to light theme
      resetToLightTheme();
    }
  }, [user, loadUserTheme, resetToLightTheme]);

  return null; // This component only handles side effects
};