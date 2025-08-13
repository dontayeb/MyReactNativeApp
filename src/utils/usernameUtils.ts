/**
 * Utility functions for username generation and validation
 */

/**
 * Generates a clean username from an email address
 * @param email - The email address to extract username from
 * @returns A cleaned username suitable for display and storage
 */
export const generateUsernameFromEmail = (email: string): string => {
  if (!email || !email.includes('@')) {
    return 'user';
  }

  // Get the part before @
  const emailPrefix = email.split('@')[0];
  
  // Clean the username:
  // - Remove common separators and replace with nothing
  // - Keep only alphanumeric characters and underscores
  // - Convert to lowercase
  // - Limit length to reasonable size
  let cleanUsername = emailPrefix
    .toLowerCase()
    .replace(/[.\-+]/g, '') // Remove dots, dashes, plus signs
    .replace(/[^a-z0-9_]/g, '') // Keep only letters, numbers, underscores
    .substring(0, 20); // Limit to 20 characters

  // Ensure it's not empty after cleaning
  if (!cleanUsername || cleanUsername.length < 2) {
    cleanUsername = 'user' + Math.floor(Math.random() * 1000);
  }

  return cleanUsername;
};

/**
 * Validates if a username meets requirements
 * @param username - The username to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (username.length > 20) {
    return { isValid: false, error: 'Username must be no more than 20 characters long' };
  }

  // Check for valid characters (letters, numbers, underscores)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  // Don't allow usernames that are just numbers
  if (/^\d+$/.test(username)) {
    return { isValid: false, error: 'Username cannot be only numbers' };
  }

  return { isValid: true };
};