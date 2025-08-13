import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { encryptionService } from '../services/encryptionService';
import { secureOfflineStorageService } from '../services/secureOfflineStorageService';
import { validateUsername } from '../utils/usernameUtils';
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
      
      // First check if email already exists
      const { data: emailCheck, error: checkError } = await supabase
        .rpc('check_email_exists', { email_param: email });
      
      if (checkError) {
        console.error('Email check error:', checkError);
        // Continue with signup if check fails
      } else if (emailCheck?.exists) {
        // Email already exists
        if (emailCheck.email_confirmed) {
          throw new Error('User already registered');
        } else {
          throw new Error('Email not confirmed');
        }
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }

      // Handle successful signup
      if (data.user) {
        const needsVerification = !data.session || !data.user.email_confirmed_at;

        // Profile creation is now handled by database trigger
        // No need to manually create profile here

        // Handle terms acceptance for new users (only if email is confirmed)
        if (acceptedTerms && !needsVerification) {
          try {
            await dataService.acceptTermsAndPrivacy(data.user.id);
          } catch (termsError) {
            console.error('Terms acceptance error:', termsError);
            // Don't fail the signup process if terms recording fails
          }
        }

        return { needsVerification: !!needsVerification };
      }

      // No user returned - this shouldn't happen
      return { needsVerification: false };
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
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile update timed out after 30 seconds')), 30000);
    });

    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('Starting profile update for user:', user.id, 'with data:', profileData);

      // If updating username, validate and check availability first
      if (profileData.username && profileData.username !== user.username) {
        console.log('Validating and checking username availability for:', profileData.username);
        
        // First validate the username format
        const validation = validateUsername(profileData.username);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid username');
        }
        
        // Then check availability
        const availabilityPromise = checkUsernameAvailability(profileData.username);
        const isAvailable = await Promise.race([availabilityPromise, timeoutPromise]);
        
        if (!isAvailable) {
          throw new Error('Username is already taken');
        }
        console.log('Username is valid and available');
      }

      const updateData: any = {};
      if (profileData.username !== undefined) updateData.username = profileData.username;
      if (profileData.defaultCurrency !== undefined) updateData.default_currency = profileData.defaultCurrency;
      if (profileData.ageGroup !== undefined) updateData.age_group = profileData.ageGroup;
      if (profileData.gender !== undefined) updateData.gender = profileData.gender;
      if (profileData.country !== undefined) updateData.country = profileData.country;
      if (profileData.monthlySurvivalBudget !== undefined) updateData.monthly_survival_budget = profileData.monthlySurvivalBudget;

      console.log('Updating profile with data:', updateData);

      const updatePromise = supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Profile update successful');

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