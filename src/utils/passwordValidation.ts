/**
 * Password validation utility with comprehensive security requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
}

export interface PasswordRequirement {
  test: (password: string) => boolean;
  message: string;
  weight: number; // Weight for strength calculation
}

// Password policy requirements
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    test: (password: string) => password.length >= 8,
    message: 'At least 8 characters long',
    weight: 20
  },
  {
    test: (password: string) => /[a-z]/.test(password),
    message: 'At least one lowercase letter (a-z)',
    weight: 15
  },
  {
    test: (password: string) => /[A-Z]/.test(password),
    message: 'At least one uppercase letter (A-Z)',
    weight: 15
  },
  {
    test: (password: string) => /\d/.test(password),
    message: 'At least one number (0-9)',
    weight: 15
  },
  {
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~`]/.test(password),
    message: 'At least one special character (!@#$%^&*...)',
    weight: 20
  },
  {
    test: (password: string) => password.length >= 12,
    message: 'At least 12 characters for extra security (recommended)',
    weight: 10
  },
  {
    test: (password: string) => !/(.)\1{2,}/.test(password),
    message: 'No more than 2 repeated characters in a row',
    weight: 5
  }
];

// Common weak passwords to check against
const COMMON_WEAK_PASSWORDS = [
  'password', '123456', 'password123', 'admin', 'qwerty',
  'letmein', 'welcome', 'monkey', '1234567890', 'abc123',
  'password1', 'iloveyou', 'sunshine', 'master', 'login',
  '123456789', 'welcome123', 'admin123', 'root', 'toor'
];

/**
 * Validates password against security requirements
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  let score = 0;

  // Check each requirement
  for (const requirement of PASSWORD_REQUIREMENTS) {
    if (requirement.test(password)) {
      score += requirement.weight;
    } else {
      // Only add error for mandatory requirements (high weight)
      if (requirement.weight >= 15) {
        errors.push(requirement.message);
      }
    }
  }

  // Check for common weak passwords
  if (COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
    score = Math.max(0, score - 30);
  }

  // Check for sequential characters
  if (hasSequentialChars(password)) {
    errors.push('Avoid sequential characters (abc, 123, etc.)');
    score = Math.max(0, score - 10);
  }

  // Calculate strength based on score
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'fair';
  } else if (score < 80) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score)
  };
};

/**
 * Checks for sequential characters (abc, 123, etc.)
 */
const hasSequentialChars = (password: string): boolean => {
  const sequential = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
    '0123456789'
  ];

  for (const seq of sequential) {
    for (let i = 0; i <= seq.length - 3; i++) {
      const subseq = seq.substring(i, i + 3);
      if (password.toLowerCase().includes(subseq) || 
          password.toLowerCase().includes(subseq.split('').reverse().join(''))) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Gets requirement status for UI display
 */
export const getPasswordRequirements = (password: string) => {
  return PASSWORD_REQUIREMENTS.map(requirement => ({
    message: requirement.message,
    satisfied: requirement.test(password),
    isMandatory: requirement.weight >= 15,
    isRecommended: requirement.weight < 15 && requirement.weight > 0
  }));
};

/**
 * Gets strength color for UI display
 */
export const getStrengthColor = (strength: string): string => {
  switch (strength) {
    case 'weak':
      return '#FF3B30'; // Red
    case 'fair':
      return '#FF9500'; // Orange
    case 'good':
      return '#34C759'; // Green
    case 'strong':
      return '#007AFF'; // Blue
    default:
      return '#8E8E93'; // Gray
  }
};

/**
 * Generates password strength message
 */
export const getStrengthMessage = (strength: string, score: number): string => {
  switch (strength) {
    case 'weak':
      return `Weak password (${score}/100)`;
    case 'fair':
      return `Fair password (${score}/100)`;
    case 'good':
      return `Good password (${score}/100)`;
    case 'strong':
      return `Strong password (${score}/100)`;
    default:
      return 'Enter a password';
  }
};