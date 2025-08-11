export interface User {
  id: string;
  email: string;
  username: string | null;
  defaultCurrency: string;
  ageGroup: string | null;
  gender: string | null;
  country: string | null;
  monthlySurvivalBudget: number | null;
  createdAt: Date;
}

export type AgeGroup = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+' | 'prefer-not-to-say';
export type Gender = 'male' | 'female';
export type Country = 'US' | 'CA' | 'GB' | 'AU' | 'DE' | 'FR' | 'JP' | 'BR' | 'IN' | 'MX' | 'CN' | 'RU' | 'IT' | 'ES' | 'KR' | 'NL' | 'CH' | 'SE' | 'BE' | 'NO' | 'DK' | 'FI' | 'IE' | 'AT' | 'PT' | 'PL' | 'CZ' | 'HU' | 'GR' | 'TR' | 'IL' | 'SA' | 'AE' | 'EG' | 'ZA' | 'NG' | 'KE' | 'GH' | 'MA' | 'TN' | 'AR' | 'CL' | 'CO' | 'PE' | 'VE' | 'UY' | 'EC' | 'BO' | 'PY' | 'CR' | 'PA' | 'GT' | 'HN' | 'SV' | 'NI' | 'DO' | 'CU' | 'JM' | 'TT' | 'TH' | 'VN' | 'MY' | 'SG' | 'ID' | 'PH' | 'BD' | 'PK' | 'LK' | 'NP' | 'MM' | 'KH' | 'LA' | 'NZ' | 'FJ' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  currency: string;
  lastValued: Date;
  userId: string;
}

export type AssetType = 'bank' | 'investment' | 'property' | 'vehicle' | 'other';

export interface Loan {
  id: string;
  name: string;
  type: LoanType;
  userId: string;
  createdAt: Date;
}

export type LoanType = 'amortized' | 'credit_card' | 'line_of_credit';

export interface AmortizedLoan extends Loan {
  type: 'amortized';
  principal: number;
  currentBalance: number;
  interestRate: number;
  termYears: number;
  termMonths: number;
  paymentFrequency: PaymentFrequency;
  monthlyPayment: number;
  currency: string;
  startDate: Date;
  nextPaymentDate: Date;
  lumpSumPayments: LumpSumPayment[];
}

export interface CreditCard extends Loan {
  type: 'credit_card';
  creditLimit: number;
  currentBalance: number;
  interestRate: number;
  minimumPaymentPercentage: number;
  dueDate: number;
  statementDate: number;
  currency: string;
}

export interface LineOfCredit extends Loan {
  type: 'line_of_credit';
  creditLimit: number;
  currentBalance: number;
  interestRate: number;
  minimumPaymentPercentage: number;
  currency: string;
}

export interface LumpSumPayment {
  id: string;
  amount: number;
  date: Date;
  description?: string;
}

export interface LoanPayment {
  id: string;
  userId: string;
  loanId: string;
  amount: number;
  paymentDate: Date;
  paymentType: 'regular' | 'additional' | 'extra';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentFrequency = 'monthly' | 'bi-weekly' | 'weekly';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number;
}

export interface Theme {
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    card: string;
  };
}

export interface NotificationSettings {
  creditCardDays: number;
  lineOfCreditDays: number;
  amortizedLoanEnabled: boolean;
}

export type Language = 'en' | 'es' | 'fr';