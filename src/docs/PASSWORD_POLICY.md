# Password Policy

This application implements a comprehensive password policy to ensure user account security.

## Password Requirements

### Mandatory Requirements
- **Minimum 8 characters** - Passwords must be at least 8 characters long
- **Lowercase letter (a-z)** - At least one lowercase letter is required
- **Uppercase letter (A-Z)** - At least one uppercase letter is required  
- **Number (0-9)** - At least one numeric digit is required
- **Special character** - At least one special character (!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~`)

### Recommended Requirements
- **12+ characters** - For enhanced security (optional but recommended)
- **No repeated characters** - Avoid more than 2 identical characters in a row

### Security Checks
- **Common password detection** - Blocks common weak passwords (password, 123456, etc.)
- **Sequential character detection** - Prevents sequential patterns (abc, 123, qwerty)

## Password Strength Scoring

Passwords are scored from 0-100 based on meeting requirements:
- **0-39: Weak** - Does not meet minimum security requirements
- **40-59: Fair** - Meets basic requirements but could be stronger  
- **60-79: Good** - Strong password with good security
- **80-100: Strong** - Excellent password with maximum security

## Implementation

### Components
- **PasswordInput** - Reusable password input component with validation
- **passwordValidation.ts** - Core validation logic and requirements

### Features
- **Real-time validation** - Requirements update as users type
- **Visual feedback** - Color-coded strength indicator and progress bar
- **Show/hide password** - Toggle password visibility
- **Requirement checklist** - Clear indication of what's needed
- **Error messages** - Helpful feedback for improving passwords

### Usage
```typescript
import { PasswordInput } from '../components/PasswordInput';
import { validatePassword } from '../utils/passwordValidation';

// In signup form
<PasswordInput
  label="Password"
  value={password}
  onChangeText={setPassword}
  showRequirements={true}
  showStrength={true}
/>

// Validate before submission
const validation = validatePassword(password);
if (!validation.isValid) {
  // Show errors: validation.errors
}
```

## Benefits
- **Enhanced security** - Protects against common attack vectors
- **User guidance** - Helps users create strong passwords
- **Consistent UX** - Standardized password input across the app
- **Accessibility** - Clear requirements and visual feedback
- **Future-proof** - Easy to adjust requirements as needed