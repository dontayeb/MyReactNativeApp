import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import { calculateProfileCompletion, isProfileIncomplete } from '../utils/profileUtils';

interface ProfileCompletionBannerProps {
  onPress: () => void;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({ onPress }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();

  // Don't show banner if profile is complete
  if (!user || !isProfileIncomplete(user)) {
    return null;
  }

  const completionPercentage = calculateProfileCompletion(user);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    content: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftContent: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    rightContent: {
      alignItems: 'flex-end',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressBarContainer: {
      width: 60,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      marginRight: 8,
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    button: {
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.primary,
      marginRight: 4,
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.leftContent}>
            <Text style={styles.title}>{t('completeProfile')}</Text>
            <Text style={styles.subtitle}>{t('profileIncomplete')}</Text>
          </View>
          
          <View style={styles.rightContent}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${completionPercentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {completionPercentage}%
              </Text>
            </View>
            
            <View style={styles.button}>
              <Text style={styles.buttonText}>{t('completeNow')}</Text>
              <Ionicons name="chevron-forward" size={12} color={theme.colors.primary} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};