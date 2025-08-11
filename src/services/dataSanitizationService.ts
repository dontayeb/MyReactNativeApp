/**
 * DataSanitizationService - Comprehensive data validation and sanitization
 * 
 * Features:
 * - Input validation for financial data
 * - SQL injection prevention
 * - XSS protection
 * - Data type validation
 * - Range validation for financial values
 * - Format validation for currencies, dates, etc.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export interface ValidationRules {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'date' | 'currency' | 'percentage';
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: string[];
  customValidator?: (value: any) => boolean;
}

export class DataSanitizationService {
  private static instance: DataSanitizationService;
  
  // Maximum allowed values for financial data (helps prevent unrealistic data)
  private readonly MAX_ASSET_VALUE = 1000000000; // $1 billion
  private readonly MAX_LOAN_AMOUNT = 10000000; // $10 million
  private readonly MAX_INTEREST_RATE = 100; // 100%
  private readonly MAX_TERM_MONTHS = 600; // 50 years
  
  // Dangerous patterns to detect and block
  private readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|<|>)/g,
    /(\bOR\b.*=.*\bOR\b)/gi,
    /(\bAND\b.*=.*\bAND\b)/gi
  ];

  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  private constructor() {}

  static getInstance(): DataSanitizationService {
    if (!DataSanitizationService.instance) {
      DataSanitizationService.instance = new DataSanitizationService();
    }
    return DataSanitizationService.instance;
  }

  /**
   * Sanitize and validate asset data
   */
  validateAsset(asset: any): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Validate name
    const nameValidation = this.validateField(asset.name, {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100
    });
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    } else {
      sanitizedData.name = this.sanitizeString(asset.name);
    }

    // Validate type
    const typeValidation = this.validateField(asset.type, {
      required: true,
      allowedValues: ['bank', 'investment', 'property', 'vehicle', 'other']
    });
    if (!typeValidation.isValid) {
      errors.push(...typeValidation.errors);
    } else {
      sanitizedData.type = asset.type;
    }

    // Validate value
    const valueValidation = this.validateField(asset.value, {
      required: true,
      type: 'number',
      minValue: 0,
      maxValue: this.MAX_ASSET_VALUE
    });
    if (!valueValidation.isValid) {
      errors.push(...valueValidation.errors);
    } else {
      sanitizedData.value = this.sanitizeNumber(asset.value);
    }

    // Validate currency
    if (asset.currency) {
      const currencyValidation = this.validateField(asset.currency, {
        type: 'string',
        pattern: /^[A-Z]{3}$/
      });
      if (!currencyValidation.isValid) {
        errors.push('Currency must be a valid 3-letter ISO code');
      } else {
        sanitizedData.currency = asset.currency.toUpperCase();
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Sanitize and validate loan data
   */
  validateLoan(loan: any): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Validate name
    const nameValidation = this.validateField(loan.name, {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100
    });
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    } else {
      sanitizedData.name = this.sanitizeString(loan.name);
    }

    // Validate loan type
    const typeValidation = this.validateField(loan.loan_type, {
      required: true,
      allowedValues: ['amortized', 'credit_card', 'line_of_credit']
    });
    if (!typeValidation.isValid) {
      errors.push(...typeValidation.errors);
    } else {
      sanitizedData.loan_type = loan.loan_type;
    }

    // Validate principal/amount
    if (loan.principal !== undefined) {
      const principalValidation = this.validateField(loan.principal, {
        required: true,
        type: 'number',
        minValue: 1,
        maxValue: this.MAX_LOAN_AMOUNT
      });
      if (!principalValidation.isValid) {
        errors.push(...principalValidation.errors.map(e => `Principal: ${e}`));
      } else {
        sanitizedData.principal = this.sanitizeNumber(loan.principal);
      }
    }

    // Validate interest rate
    if (loan.interest_rate !== undefined) {
      const rateValidation = this.validateField(loan.interest_rate, {
        required: true,
        type: 'number',
        minValue: 0,
        maxValue: this.MAX_INTEREST_RATE
      });
      if (!rateValidation.isValid) {
        errors.push(...rateValidation.errors.map(e => `Interest rate: ${e}`));
      } else {
        sanitizedData.interest_rate = this.sanitizeNumber(loan.interest_rate);
      }
    }

    // Validate term months
    if (loan.term_months !== undefined) {
      const termValidation = this.validateField(loan.term_months, {
        type: 'number',
        minValue: 1,
        maxValue: this.MAX_TERM_MONTHS
      });
      if (!termValidation.isValid) {
        errors.push(...termValidation.errors.map(e => `Term: ${e}`));
      } else {
        sanitizedData.term_months = Math.round(this.sanitizeNumber(loan.term_months));
      }
    }

    // Validate credit limit (for credit cards/LOCs)
    if (loan.credit_limit !== undefined) {
      const creditValidation = this.validateField(loan.credit_limit, {
        type: 'number',
        minValue: 0,
        maxValue: this.MAX_LOAN_AMOUNT
      });
      if (!creditValidation.isValid) {
        errors.push(...creditValidation.errors.map(e => `Credit limit: ${e}`));
      } else {
        sanitizedData.credit_limit = this.sanitizeNumber(loan.credit_limit);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Validate user profile data
   */
  validateProfile(profile: any): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Validate username
    if (profile.username) {
      const usernameValidation = this.validateField(profile.username, {
        type: 'string',
        minLength: 2,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9_]+$/
      });
      if (!usernameValidation.isValid) {
        errors.push(...usernameValidation.errors.map(e => `Username: ${e}`));
      } else {
        sanitizedData.username = this.sanitizeString(profile.username);
      }
    }

    // Validate monthly survival budget
    if (profile.monthly_survival_budget !== undefined) {
      const budgetValidation = this.validateField(profile.monthly_survival_budget, {
        type: 'number',
        minValue: 0,
        maxValue: 100000 // $100k monthly budget limit
      });
      if (!budgetValidation.isValid) {
        errors.push(...budgetValidation.errors.map(e => `Budget: ${e}`));
      } else {
        sanitizedData.monthly_survival_budget = this.sanitizeNumber(profile.monthly_survival_budget);
      }
    }

    // Validate age group
    if (profile.age_group) {
      const ageValidation = this.validateField(profile.age_group, {
        allowedValues: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'prefer-not-to-say']
      });
      if (!ageValidation.isValid) {
        errors.push('Invalid age group');
      } else {
        sanitizedData.age_group = profile.age_group;
      }
    }

    // Validate gender
    if (profile.gender) {
      const genderValidation = this.validateField(profile.gender, {
        allowedValues: ['male', 'female', 'prefer-not-to-say']
      });
      if (!genderValidation.isValid) {
        errors.push('Invalid gender selection');
      } else {
        sanitizedData.gender = profile.gender;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Generic field validation
   */
  private validateField(value: any, rules: ValidationRules): ValidationResult {
    const errors: string[] = [];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push('This field is required');
      return { isValid: false, errors };
    }

    // Skip further validation if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return { isValid: true, errors: [] };
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push('Must be a text value');
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push('Must be a valid number');
          }
          break;
        case 'email':
          if (!this.isValidEmail(value)) {
            errors.push('Must be a valid email address');
          }
          break;
        case 'date':
          if (!this.isValidDate(value)) {
            errors.push('Must be a valid date');
          }
          break;
      }
    }

    // Range validation for numbers
    if (typeof value === 'number' && !isNaN(value)) {
      if (rules.minValue !== undefined && value < rules.minValue) {
        errors.push(`Must be at least ${rules.minValue}`);
      }
      if (rules.maxValue !== undefined && value > rules.maxValue) {
        errors.push(`Must be no more than ${rules.maxValue}`);
      }
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`Must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`Must be no more than ${rules.maxLength} characters`);
      }
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string') {
      if (!rules.pattern.test(value)) {
        errors.push('Invalid format');
      }
    }

    // Allowed values validation
    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      errors.push(`Must be one of: ${rules.allowedValues.join(', ')}`);
    }

    // Custom validation
    if (rules.customValidator && !rules.customValidator(value)) {
      errors.push('Invalid value');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  private sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    let sanitized = input.trim();

    // Check for SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially malicious input detected');
      }
    }

    // Check for XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially malicious script detected');
      }
    }

    // Basic HTML entity encoding
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Sanitize and validate numeric input
   */
  private sanitizeNumber(input: any): number {
    const num = Number(input);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number format');
    }
    // Round to 2 decimal places for financial data
    return Math.round(num * 100) / 100;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate date format
   */
  private isValidDate(date: any): boolean {
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    return false;
  }

  /**
   * Validate and sanitize any object based on schema
   */
  validateObject(obj: any, schema: { [key: string]: ValidationRules }): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    for (const [field, rules] of Object.entries(schema)) {
      const fieldValidation = this.validateField(obj[field], rules);
      
      if (!fieldValidation.isValid) {
        errors.push(...fieldValidation.errors.map(e => `${field}: ${e}`));
      } else if (obj[field] !== undefined) {
        // Apply appropriate sanitization based on type
        if (rules.type === 'string') {
          sanitizedData[field] = this.sanitizeString(obj[field]);
        } else if (rules.type === 'number') {
          sanitizedData[field] = this.sanitizeNumber(obj[field]);
        } else {
          sanitizedData[field] = obj[field];
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Check if input contains potentially dangerous content
   */
  isDangerous(input: string): boolean {
    if (typeof input !== 'string') return false;

    // Check SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) return true;
    }

    // Check XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(input)) return true;
    }

    return false;
  }

  /**
   * Sanitize search queries to prevent injection
   */
  sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';
    
    // Remove potentially dangerous characters
    let sanitized = query
      .replace(/['"`;\\]/g, '') // Remove quotes and dangerous chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    return sanitized;
  }
}

// Export singleton instance
export const dataSanitizationService = DataSanitizationService.getInstance();