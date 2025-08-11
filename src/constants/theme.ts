import { Theme } from '../types';

export const LIGHT_THEME: Theme = {
  isDark: false,
  colors: {
    primary: '#6366F1', // Indigo-500 - modern, professional
    secondary: '#10B981', // Emerald-500 - fresh accent
    background: '#FAFAFA', // Neutral-50 - softer than pure white
    surface: '#F8FAFC', // Slate-50 - subtle surface
    text: '#0F172A', // Slate-900 - rich dark text
    textSecondary: '#64748B', // Slate-500 - balanced secondary text
    border: '#E2E8F0', // Slate-200 - subtle borders
    success: '#10B981', // Emerald-500
    warning: '#F59E0B', // Amber-500
    error: '#EF4444', // Red-500
    card: '#FFFFFF', // Pure white for cards
  },
};

export const DARK_THEME: Theme = {
  isDark: true,
  colors: {
    primary: '#818CF8', // Indigo-400 - softer for dark mode
    secondary: '#34D399', // Emerald-400 - vibrant accent
    background: '#0F172A', // Slate-900 - deep, rich background
    surface: '#1E293B', // Slate-800 - elevated surface
    text: '#F8FAFC', // Slate-50 - crisp white text
    textSecondary: '#94A3B8', // Slate-400 - readable secondary
    border: '#334155', // Slate-700 - subtle dark borders
    success: '#34D399', // Emerald-400
    warning: '#FBBF24', // Amber-400
    error: '#F87171', // Red-400
    card: '#1E293B', // Slate-800 - elevated cards
  },
};