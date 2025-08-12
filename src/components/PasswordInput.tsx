import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { 
  validatePassword, 
  getPasswordRequirements, 
  getStrengthColor, 
  getStrengthMessage 
} from '../utils/passwordValidation';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  showRequirements?: boolean;
  showStrength?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  label?: string;
  testID?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChangeText,
  placeholder = "Enter password",
  showRequirements = true,
  showStrength = true,
  style,
  inputStyle,
  label = "Password",
  testID = "password-input"
}) => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState(validatePassword(''));

  useEffect(() => {
    setValidation(validatePassword(value));
  }, [value]);

  const requirements = getPasswordRequirements(value);
  const strengthColor = getStrengthColor(validation.strength);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      minHeight: 50,
    },
    inputContainerFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    inputContainerError: {
      borderColor: '#FF3B30',
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      paddingVertical: 12,
      ...inputStyle,
    },
    eyeButton: {
      padding: 4,
      marginLeft: 8,
    },
    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      marginRight: 12,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 2,
    },
    strengthText: {
      fontSize: 12,
      fontWeight: '500',
      minWidth: 100,
      textAlign: 'right',
    },
    requirementsContainer: {
      marginTop: 12,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    requirementsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    requirementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    requirementText: {
      fontSize: 13,
      marginLeft: 8,
      flex: 1,
    },
    satisfied: {
      color: '#34C759',
    },
    unsatisfied: {
      color: theme.colors.textSecondary,
    },
    mandatory: {
      fontWeight: '500',
    },
    recommended: {
      fontStyle: 'italic',
    },
  });

  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        !validation.isValid && value.length > 0 && styles.inputContainerError
      ]}>
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          testID="toggle-password-visibility"
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Password Strength Indicator */}
      {showStrength && value.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            <View
              style={[
                styles.strengthFill,
                {
                  width: `${validation.score}%`,
                  backgroundColor: strengthColor,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.strengthText,
              { color: strengthColor }
            ]}
          >
            {getStrengthMessage(validation.strength, validation.score)}
          </Text>
        </View>
      )}

      {/* Password Requirements */}
      {showRequirements && (isFocused || value.length > 0) && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          
          {requirements.map((requirement, index) => (
            <View key={index} style={styles.requirementItem}>
              <Ionicons
                name={requirement.satisfied ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={requirement.satisfied ? '#34C759' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.requirementText,
                  requirement.satisfied ? styles.satisfied : styles.unsatisfied,
                  requirement.isMandatory && styles.mandatory,
                  requirement.isRecommended && styles.recommended,
                ]}
              >
                {requirement.message}
                {requirement.isRecommended && ' (optional)'}
              </Text>
            </View>
          ))}
          
          {validation.errors.length > 0 && (
            <>
              <Text style={[styles.requirementsTitle, { color: '#FF3B30', marginTop: 8 }]}>
                Issues to fix:
              </Text>
              {validation.errors.map((error, index) => (
                <View key={`error-${index}`} style={styles.requirementItem}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                  <Text style={[styles.requirementText, { color: '#FF3B30', fontWeight: '500' }]}>
                    {error}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};