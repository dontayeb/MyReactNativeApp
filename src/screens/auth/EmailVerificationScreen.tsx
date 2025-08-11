import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface EmailVerificationScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
    };
  };
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ navigation, route }) => {
  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);
  const { resendVerification } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocalization();

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await resendVerification(email);
      Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToSignIn = () => {
    navigation.navigate('SignIn');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradient: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    contentContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 30,
      alignItems: 'center',
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${theme.colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    description: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 8,
    },
    emailText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 32,
    },
    resendButton: {
      backgroundColor: theme.colors.primary,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',  
      marginBottom: 16,
      width: '100%',
    },
    resendButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    backButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    instructionText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 20,
      fontStyle: 'italic',
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.isDark ? ['#1a1a1a', '#2d2d2d'] : ['#f8f9fa', '#e9ecef']}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="mail-outline"
              size={40}
              color={theme.colors.primary}
            />
          </View>
          
          <Text style={styles.title}>Check Your Email</Text>
          
          <Text style={styles.description}>
            We've sent a verification link to:
          </Text>
          
          <Text style={styles.emailText}>{email}</Text>
          
          <Text style={styles.description}>
            Click the link in the email to verify your account, then return here to sign in.
          </Text>
          
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendVerification}
            disabled={isResending}
          >
            <Text style={styles.resendButtonText}>
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToSignIn}
          >
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
          
          <Text style={styles.instructionText}>
            Don't see the email? Check your spam folder or try resending.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};