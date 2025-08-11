import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string[];
}

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, onSkip }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [currentStep, setCurrentStep] = useState(0);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to WealthTracker',
      description: 'Take control of your finances with our comprehensive wealth tracking solution.',
      icon: 'wallet',
      gradient: ['#667eea', '#764ba2']
    },
    {
      id: 'assets',
      title: 'Track Your Assets',
      description: 'Manually add and monitor your investments, properties, savings, and other valuable assets.',
      icon: 'trending-up',
      gradient: ['#11998e', '#38ef7d']
    },
    {
      id: 'loans',
      title: 'Manage Loans & Debt',
      description: 'Keep track of loans, credit cards, and get notifications for payment schedules to stay on top of your obligations.',
      icon: 'card',
      gradient: ['#fc4a1a', '#f7b733']
    },
    {
      id: 'insights',
      title: 'Get Financial Insights',
      description: 'View your net worth, upcoming payments, and financial trends all in one dashboard.',
      icon: 'analytics',
      gradient: ['#4facfe', '#00f2fe']
    },
    {
      id: 'security',
      title: 'Your Data is Secure',
      description: 'All your financial data is encrypted and stored securely. You have full control over your privacy.',
      icon: 'shield-checkmark',
      gradient: ['#a8edea', '#fed6e3']
    }
  ];

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true
      });
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * screenWidth,
        animated: true
      });
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    scrollViewRef.current?.scrollTo({
      x: stepIndex * screenWidth,
      animated: true
    });
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const stepIndex = Math.round(contentOffsetX / screenWidth);
    setCurrentStep(stepIndex);
  };

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    skipButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
    },
    skipText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
      backgroundColor: theme.colors.border,
    },
    progressDotActive: {
      backgroundColor: theme.colors.primary,
      width: 20,
    },
    scrollView: {
      flex: 1,
    },
    stepContainer: {
      width: screenWidth,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
    },
    stepTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    stepDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 40,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    navigationButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      minWidth: 100,
    },
    backButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      minWidth: 120,
    },
    nextButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginRight: 8,
    },
    getStartedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      minWidth: 160,
    },
    getStartedText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
      marginRight: 8,
    },
    placeholder: {
      width: 100,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          {onboardingSteps.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive
              ]}
              onPress={() => goToStep(index)}
            />
          ))}
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingSteps.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            <LinearGradient
              colors={step.gradient as any}
              style={styles.iconContainer}
            >
              <Ionicons
                name={step.icon as any}
                size={60}
                color="white"
              />
            </LinearGradient>
            
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.backButton, { opacity: currentStep === 0 ? 0 : 1 }]}
            onPress={prevStep}
            disabled={currentStep === 0}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {isLastStep ? (
            <TouchableOpacity style={styles.getStartedButton} onPress={onComplete}>
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};