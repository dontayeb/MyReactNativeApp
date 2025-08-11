import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SplashScreen } from '../components/SplashScreen';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { onboardingService } from '../services/onboardingService';

import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { TermsPrivacyScreen } from '../screens/auth/TermsPrivacyScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AssetsScreen } from '../screens/assets/AssetsScreen';
import { AddAssetScreen } from '../screens/assets/AddAssetScreen';
import { AssetDetailScreen } from '../screens/assets/AssetDetailScreen';
import { LoansScreen } from '../screens/loans/LoansScreen';
import { AddLoanScreen } from '../screens/loans/AddLoanScreen';
import { LoanDetailsScreen } from '../screens/loans/LoanDetailsScreen';
import { SandboxScreen } from '../screens/sandbox/SandboxScreen';
import { EarlyLoanPayoffCalculator } from '../screens/sandbox/EarlyLoanPayoffCalculator';
import { CompoundInterestCalculator } from '../screens/sandbox/CompoundInterestCalculator';
import { RetirementPlanCalculator } from '../screens/sandbox/RetirementPlanCalculator';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileEditScreen } from '../screens/settings/ProfileEditScreen';
import { CurrencySelectionScreen } from '../screens/settings/CurrencySelectionScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { HelpSupportScreen } from '../screens/settings/HelpSupportScreen';
import { DataExportScreen } from '../screens/settings/DataExportScreen';
import { DeleteAccountScreen } from '../screens/settings/DeleteAccountScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
    </Stack.Navigator>
  );
};

const AssetsStack = () => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssetsList" component={AssetsScreen} />
      <Stack.Screen name="AddAsset" component={AddAssetScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
    </Stack.Navigator>
  );
};

const LoansStack = () => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoansList" component={LoansScreen} />
      <Stack.Screen name="AddLoan" component={AddLoanScreen} />
      <Stack.Screen name="LoanDetail" component={LoanDetailsScreen} />
      <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
    </Stack.Navigator>
  );
};

const DashboardStack = () => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="AddAsset" component={AddAssetScreen} />
      <Stack.Screen name="AddLoan" component={AddLoanScreen} />
      <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
    </Stack.Navigator>
  );
};

const SandboxStack = () => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SandboxHome" component={SandboxScreen} />
      <Stack.Screen name="EarlyLoanPayoff" component={EarlyLoanPayoffCalculator} />
      <Stack.Screen name="CompoundInterest" component={CompoundInterestCalculator} />
      <Stack.Screen name="RetirementPlan" component={RetirementPlanCalculator} />
    </Stack.Navigator>
  );
};

const SettingsStack = () => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="CurrencySelection" component={CurrencySelectionScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="DataExport" component={DataExportScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Assets':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Loans':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Sandbox':
              iconName = focused ? 'calculator' : 'calculator-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 8,
          paddingTop: 8,
          height: Platform.OS === 'android' ? 65 + Math.max(insets.bottom, 8) : 65,
          shadowColor: theme.colors.text,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 16,
          // Make tab bar fully opaque to prevent system nav bar showing through
          opacity: 1,
          // Add solid background overlay
          borderTopColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      })}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          // Reset the stack to the initial screen when tab is pressed
          if (navigation.getState().routes.find(r => r.name === route.name)?.state) {
            (e as any).preventDefault();
            navigation.reset({
              index: 0,
              routes: [{ name: route.name }],
            });
          }
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{ tabBarLabel: t('dashboard') }}
      />
      <Tab.Screen 
        name="Assets" 
        component={AssetsStack}
        options={{ tabBarLabel: t('assets') }}
      />
      <Tab.Screen 
        name="Loans" 
        component={LoansStack}
        options={{ tabBarLabel: t('loans') }}
      />
      <Tab.Screen 
        name="Sandbox" 
        component={SandboxStack}
        options={{ tabBarLabel: t('sandbox') }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{ tabBarLabel: t('settings') }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await onboardingService.hasCompletedOnboarding();
        setHasCompletedOnboarding(completed);
        
        // Uncomment next line to reset onboarding for testing:
        // await onboardingService.resetOnboarding(); setHasCompletedOnboarding(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to showing onboarding on error
        setHasCompletedOnboarding(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const handleOnboardingComplete = async () => {
    setHasCompletedOnboarding(true);
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (isLoading || isCheckingOnboarding) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: theme.colors.background 
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show onboarding for first-time users
  if (!hasCompletedOnboarding) {
    return (
      <NavigationContainer
        theme={{
          dark: theme.isDark,
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.primary,
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: 'normal',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: 'bold',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '900',
            },
          },
        }}
      >
        {/* @ts-ignore - Stack.Navigator typing issue with React Navigation v7 */}
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen 
                {...props} 
                onComplete={handleOnboardingComplete}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.card,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.primary,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};