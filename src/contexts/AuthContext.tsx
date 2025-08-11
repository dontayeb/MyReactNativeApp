import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { encryptionService } from '../services/encryptionService';
import { secureOfflineStorageService } from '../services/secureOfflineStorageService';
import { appStateService } from '../services/appStateService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, acceptedTerms?: boolean) => Promise<{ needsVerification: boolean }>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  acceptTerms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (mounted) {
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          if (session?.user) {
            await loadUserProfile(session.user);
          }
        }
        setIsLoading(false);
      }
    }

    // Initialize app state service
    appStateService.initialize();
    
    // Register refresh callback
    appStateService.onSessionRefresh(async () => {
      if (session?.user) {
        console.log('Refreshing user data after app state change');
        await loadUserProfile(session.user);
      }
    });

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session);
          if (session?.user) {
            await loadUserProfile(session.user);
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateService.cleanup();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // Initialize encryption and secure storage for this user (non-blocking)
      try {
        await Promise.all([
          encryptionService.initialize(supabaseUser.id),
          secureOfflineStorageService.initialize(supabaseUser.id)
        ]);
      } catch (initError) {
        console.warn('Failed to initialize secure services, continuing without encryption:', initError);
        // Continue without secure services - app will still work
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        return;
      }

      // Cache user profile securely (non-blocking)
      if (profile) {
        try {
          await secureOfflineStorageService.cacheProfile(profile);
        } catch (cacheError) {
          console.warn('Failed to cache profile, continuing without cache:', cacheError);
          // Don't throw - profile caching is optional
        }
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        username: profile?.username || null,
        defaultCurrency: profile?.default_currency || 'USD',
        ageGroup: profile?.age_group || null,
        gender: profile?.gender || null,
        country: profile?.country || null,
        monthlySurvivalBudget: profile?.monthly_survival_budget || null,
        createdAt: new Date(supabaseUser.created_at),
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for a verification link.');
        }
        throw error;
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, acceptedTerms: boolean = false) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }

      // Check if user needs verification
      // This happens when:
      // 1. User was created but no session exists (email confirmation required)
      // 2. User exists but email is not confirmed
      const needsVerification = data.user && (
        !data.session || 
        !data.user.email_confirmed_at
      );

      // Create profile for all new users
      if (data.user) {
        try {
          await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                username: null,
                default_currency: 'USD',
                age_group: null,
                gender: null,
                country: null,
              },
            ]);
        } catch (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw here, as the user account was created successfully
        }
      }

      return { needsVerification: !!needsVerification };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear encryption keys and cached data before signing out (non-blocking)
      if (user?.id) {
        try {
          await Promise.all([
            encryptionService.clearKeys(user.id),
            secureOfflineStorageService.clearAllData()
          ]);
        } catch (cleanupError) {
          console.warn('Failed to clear secure data, continuing with sign out:', cleanupError);
          // Don't block sign out if cleanup fails
        }
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No row found, username is available
        return true;
      }
      
      if (error) {
        throw error;
      }
      
      // Username exists
      return false;
    } catch (error) {
      console.error('Username availability check error:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      // If updating username, check availability first
      if (profileData.username && profileData.username !== user.username) {
        const isAvailable = await checkUsernameAvailability(profileData.username);
        if (!isAvailable) {
          throw new Error('Username is already taken');
        }
      }

      const updateData: any = {};
      if (profileData.username !== undefined) updateData.username = profileData.username;
      if (profileData.defaultCurrency !== undefined) updateData.default_currency = profileData.defaultCurrency;
      if (profileData.ageGroup !== undefined) updateData.age_group = profileData.ageGroup;
      if (profileData.gender !== undefined) updateData.gender = profileData.gender;
      if (profileData.country !== undefined) updateData.country = profileData.country;
      if (profileData.monthlySurvivalBudget !== undefined) updateData.monthly_survival_budget = profileData.monthlySurvivalBudget;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local user state
      setUser(prevUser => prevUser ? { ...prevUser, ...profileData } : null);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const acceptTerms = async () => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      await dataService.acceptTermsAndPrivacy(user.id);
    } catch (error) {
      console.error('Terms acceptance error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut, resendVerification, resetPassword, checkUsernameAvailability, updateProfile, acceptTerms }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};