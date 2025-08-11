import { User } from '../types';

export const calculateProfileCompletion = (user: User | null): number => {
  if (!user) return 0;
  
  const fields = [
    user.username,
    user.ageGroup,
    user.gender,
    user.country,
    user.monthlySurvivalBudget,
  ];
  
  const completedFields = fields.filter(field => field !== null && field !== undefined && field !== '').length;
  const totalFields = fields.length;
  
  return Math.round((completedFields / totalFields) * 100);
};

export const isProfileIncomplete = (user: User | null): boolean => {
  const completionPercentage = calculateProfileCompletion(user);
  return completionPercentage < 100;
};