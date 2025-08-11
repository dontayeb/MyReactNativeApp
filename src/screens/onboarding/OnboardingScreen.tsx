import React from 'react';
import { OnboardingTutorial } from '../../components/OnboardingTutorial';
import { onboardingService } from '../../services/onboardingService';

interface OnboardingScreenProps {
  navigation: any;
  onComplete?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, onComplete }) => {
  const handleComplete = async () => {
    try {
      await onboardingService.completeOnboarding();
      
      if (onComplete) {
        onComplete();
      } else {
        // Navigate to the main app
        navigation.navigate('Auth');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still navigate even if storage fails
      if (onComplete) {
        onComplete();
      } else {
        navigation.navigate('Auth');
      }
    }
  };

  const handleSkip = async () => {
    try {
      await onboardingService.completeOnboarding();
      
      if (onComplete) {
        onComplete();
      } else {
        navigation.navigate('Auth');
      }
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      // Still navigate even if storage fails
      if (onComplete) {
        onComplete();
      } else {
        navigation.navigate('Auth');
      }
    }
  };

  return (
    <OnboardingTutorial
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
};