-- Schema Updates for WealthTracker App
-- Run these SQL commands in your Supabase SQL editor after the initial setup

-- 1. Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN age_group text,
ADD COLUMN gender text,
ADD COLUMN country text;

-- 2. Add loan_type column and additional fields for different loan types
ALTER TABLE public.loans 
ADD COLUMN loan_type text DEFAULT 'amortized',
ADD COLUMN credit_limit numeric,
ADD COLUMN current_balance numeric,
ADD COLUMN minimum_payment_percentage numeric,
ADD COLUMN due_date text,
ADD COLUMN statement_date text;

-- 3. Update the profile creation function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, default_currency, age_group, gender, country)
  VALUES (new.id, new.raw_user_meta_data->>'username', 'USD', null, null, null);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add check constraints for data validation (optional but recommended)
ALTER TABLE public.profiles 
ADD CONSTRAINT check_age_group 
CHECK (age_group IS NULL OR age_group IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'prefer-not-to-say'));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_gender 
CHECK (gender IS NULL OR gender IN ('male', 'female'));

ALTER TABLE public.loans 
ADD CONSTRAINT check_loan_type 
CHECK (loan_type IN ('amortized', 'credit_card', 'line_of_credit'));

-- 5. Create indexes for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON public.profiles(age_group);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_loans_loan_type ON public.loans(loan_type);

-- 6. Update existing loans to have a default loan_type if they don't already
UPDATE public.loans 
SET loan_type = 'amortized' 
WHERE loan_type IS NULL;

-- 7. Make certain fields nullable for different loan types
ALTER TABLE public.loans 
ALTER COLUMN term_months DROP NOT NULL,
ALTER COLUMN monthly_payment DROP NOT NULL,
ALTER COLUMN start_date DROP NOT NULL;

-- 8. Add last_valued column to assets table
ALTER TABLE public.assets 
ADD COLUMN last_valued date DEFAULT CURRENT_DATE;

-- 9. Create loan_payments table for tracking additional payments
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    payment_date date NOT NULL,
    payment_type text DEFAULT 'additional' CHECK (payment_type IN ('regular', 'additional', 'extra')),
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Create indexes for loan_payments table
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id ON public.loan_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON public.loan_payments(payment_date);

-- 11. Enable RLS on loan_payments table  
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for loan_payments
CREATE POLICY "Users can view their own loan payments" ON public.loan_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loan payments" ON public.loan_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loan payments" ON public.loan_payments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loan payments" ON public.loan_payments
    FOR DELETE USING (auth.uid() = user_id);

-- 13. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger for loan_payments updated_at
CREATE TRIGGER update_loan_payments_updated_at
    BEFORE UPDATE ON public.loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Add additional fields to loans table for credit card/LOC statement functionality
ALTER TABLE public.loans 
ADD COLUMN last_statement_balance numeric DEFAULT 0,
ADD COLUMN last_statement_date date,
ADD COLUMN next_statement_date date,
ADD COLUMN minimum_payment_amount numeric,
ADD COLUMN late_fee_amount numeric DEFAULT 25.00,
ADD COLUMN grace_period_days integer DEFAULT 25,
ADD COLUMN last_payment_date date,
ADD COLUMN last_payment_amount numeric DEFAULT 0,
ADD COLUMN days_past_due integer DEFAULT 0,
ADD COLUMN total_fees_charged numeric DEFAULT 0;

-- 16. Create credit_card_statements table for tracking monthly statements
CREATE TABLE IF NOT EXISTS public.credit_card_statements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
    statement_date date NOT NULL,
    previous_balance numeric NOT NULL DEFAULT 0,
    payments_credits numeric NOT NULL DEFAULT 0,
    purchases_charges numeric NOT NULL DEFAULT 0,
    interest_charged numeric NOT NULL DEFAULT 0,
    fees_charged numeric NOT NULL DEFAULT 0,
    new_balance numeric NOT NULL DEFAULT 0,
    minimum_payment_due numeric NOT NULL DEFAULT 0,
    payment_due_date date NOT NULL,
    is_payment_received boolean DEFAULT false,
    payment_received_date date,
    payment_amount numeric DEFAULT 0,
    late_fees_applied numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Create indexes for credit_card_statements table
CREATE INDEX IF NOT EXISTS idx_credit_statements_user_id ON public.credit_card_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_statements_loan_id ON public.credit_card_statements(loan_id);
CREATE INDEX IF NOT EXISTS idx_credit_statements_statement_date ON public.credit_card_statements(statement_date);
CREATE INDEX IF NOT EXISTS idx_credit_statements_due_date ON public.credit_card_statements(payment_due_date);

-- 18. Enable RLS on credit_card_statements table  
ALTER TABLE public.credit_card_statements ENABLE ROW LEVEL SECURITY;

-- 19. Create RLS policies for credit_card_statements
CREATE POLICY "Users can view their own credit card statements" ON public.credit_card_statements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit card statements" ON public.credit_card_statements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card statements" ON public.credit_card_statements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card statements" ON public.credit_card_statements
    FOR DELETE USING (auth.uid() = user_id);

-- 20. Create trigger for credit_card_statements updated_at
CREATE TRIGGER update_credit_card_statements_updated_at
    BEFORE UPDATE ON public.credit_card_statements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 21. Update loan_payments table to support credit card/LOC payment types
ALTER TABLE public.loan_payments 
ADD COLUMN statement_id uuid REFERENCES public.credit_card_statements(id) ON DELETE SET NULL,
ADD COLUMN is_minimum_payment boolean DEFAULT false,
ADD COLUMN is_late_payment boolean DEFAULT false,
ADD COLUMN days_late integer DEFAULT 0;

-- 22. Update payment_type constraint to include credit card payment types
ALTER TABLE public.loan_payments 
DROP CONSTRAINT IF EXISTS loan_payments_payment_type_check;

ALTER TABLE public.loan_payments 
ADD CONSTRAINT loan_payments_payment_type_check 
CHECK (payment_type IN ('regular', 'additional', 'extra', 'minimum', 'statement_payment', 'late_payment'));

-- 23. Enhanced credit card fields for realistic operations
ALTER TABLE public.loans 
ADD COLUMN statement_balance numeric DEFAULT 0,
ADD COLUMN available_credit numeric DEFAULT 0,
ADD COLUMN payment_due_date date,
ADD COLUMN statement_closing_date date,
ADD COLUMN days_in_cycle integer DEFAULT 30,
ADD COLUMN grace_period integer DEFAULT 25,
ADD COLUMN cash_advance_limit numeric DEFAULT 0,
ADD COLUMN cash_advance_rate numeric DEFAULT 0,
ADD COLUMN balance_transfer_rate numeric DEFAULT 0,
ADD COLUMN over_limit_fee numeric DEFAULT 35.00,
ADD COLUMN returned_payment_fee numeric DEFAULT 35.00,
ADD COLUMN annual_fee numeric DEFAULT 0,
ADD COLUMN purchase_apr numeric,
ADD COLUMN last_statement_balance numeric DEFAULT 0,
ADD COLUMN minimum_payment_due numeric DEFAULT 0,
ADD COLUMN total_minimum_payments_due numeric DEFAULT 0,
ADD COLUMN past_due_amount numeric DEFAULT 0,
ADD COLUMN consecutive_minimum_payments integer DEFAULT 0,
ADD COLUMN account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'closed', 'suspended', 'overlimit'));

-- 24. Create credit_card_transactions table for detailed transaction tracking
CREATE TABLE IF NOT EXISTS public.credit_card_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
    transaction_date date NOT NULL,
    post_date date NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'payment', 'interest', 'fee', 'cash_advance', 'balance_transfer', 'refund', 'adjustment')),
    description text NOT NULL,
    merchant_name text,
    category text,
    amount numeric NOT NULL,
    running_balance numeric NOT NULL,
    statement_id uuid REFERENCES public.credit_card_statements(id) ON DELETE SET NULL,
    is_pending boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 25. Create indexes for credit_card_transactions
CREATE INDEX IF NOT EXISTS idx_cc_transactions_user_id ON public.credit_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_loan_id ON public.credit_card_transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_date ON public.credit_card_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_type ON public.credit_card_transactions(transaction_type);

-- 26. Enable RLS on credit_card_transactions
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- 27. Create RLS policies for credit_card_transactions
CREATE POLICY "Users can view their own credit card transactions" ON public.credit_card_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit card transactions" ON public.credit_card_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card transactions" ON public.credit_card_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card transactions" ON public.credit_card_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- 28. Create trigger for credit_card_transactions updated_at
CREATE TRIGGER update_credit_card_transactions_updated_at
    BEFORE UPDATE ON public.credit_card_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 29. Enhanced credit card statements table with realistic fields
ALTER TABLE public.credit_card_statements 
ADD COLUMN account_summary jsonb DEFAULT '{}',
ADD COLUMN payment_allocation jsonb DEFAULT '{}',
ADD COLUMN interest_calculation jsonb DEFAULT '{}',
ADD COLUMN fee_summary jsonb DEFAULT '{}',
ADD COLUMN credit_limit numeric,
ADD COLUMN available_credit numeric,
ADD COLUMN cash_advance_limit numeric,
ADD COLUMN available_cash_advance numeric,
ADD COLUMN over_limit_amount numeric DEFAULT 0,
ADD COLUMN days_in_billing_cycle integer DEFAULT 30,
ADD COLUMN average_daily_balance numeric DEFAULT 0,
ADD COLUMN purchase_balance numeric DEFAULT 0,
ADD COLUMN cash_advance_balance numeric DEFAULT 0,
ADD COLUMN balance_transfer_balance numeric DEFAULT 0,
ADD COLUMN purchase_apr numeric,
ADD COLUMN cash_advance_apr numeric,
ADD COLUMN balance_transfer_apr numeric,
ADD COLUMN penalty_apr numeric,
ADD COLUMN is_penalty_pricing boolean DEFAULT false;

-- 30. Function to calculate credit card interest and fees
CREATE OR REPLACE FUNCTION calculate_credit_card_interest(
    loan_id_param uuid,
    calculation_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
    loan_record RECORD;
    daily_rate numeric;
    days_since_statement integer;
    interest_amount numeric;
    result jsonb;
BEGIN
    -- Get loan details
    SELECT * INTO loan_record 
    FROM public.loans 
    WHERE id = loan_id_param;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Loan not found"}'::jsonb;
    END IF;
    
    -- Calculate daily interest rate
    daily_rate := (loan_record.interest_rate / 100) / 365;
    
    -- Calculate days since last statement
    days_since_statement := EXTRACT(days FROM (calculation_date - COALESCE(loan_record.last_statement_date, calculation_date)));
    
    -- Calculate interest on current balance
    interest_amount := loan_record.current_balance * daily_rate * days_since_statement;
    
    -- Build result
    result := jsonb_build_object(
        'daily_rate', daily_rate,
        'days_calculated', days_since_statement,
        'current_balance', loan_record.current_balance,
        'interest_amount', ROUND(interest_amount, 2),
        'calculation_date', calculation_date
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 31. Function to generate monthly credit card statement
CREATE OR REPLACE FUNCTION generate_credit_card_statement(
    loan_id_param uuid,
    statement_date_param date DEFAULT CURRENT_DATE
)
RETURNS uuid AS $$
DECLARE
    loan_record RECORD;
    statement_id uuid;
    previous_balance numeric := 0;
    new_purchases numeric := 0;
    payments_credits numeric := 0;
    interest_charged numeric := 0;
    fees_charged numeric := 0;
    new_balance numeric;
    minimum_payment numeric;
    payment_due_date date;
BEGIN
    -- Get loan details
    SELECT * INTO loan_record 
    FROM public.loans 
    WHERE id = loan_id_param AND loan_type IN ('credit_card', 'line_of_credit');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit card not found';
    END IF;
    
    -- Calculate statement period (last 30 days)
    previous_balance := COALESCE(loan_record.last_statement_balance, 0);
    
    -- Get transactions for this period
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN -amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'interest' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'fee' THEN amount ELSE 0 END), 0)
    INTO new_purchases, payments_credits, interest_charged, fees_charged
    FROM public.credit_card_transactions
    WHERE loan_id = loan_id_param 
    AND transaction_date > (statement_date_param - INTERVAL '30 days')
    AND transaction_date <= statement_date_param;
    
    -- Calculate new balance
    new_balance := previous_balance + new_purchases + payments_credits + interest_charged + fees_charged;
    
    -- Calculate minimum payment (typically 2-3% of balance or $25 minimum)
    minimum_payment := GREATEST(new_balance * (loan_record.minimum_payment_percentage / 100), 25);
    
    -- Set payment due date (typically 25 days after statement date)
    payment_due_date := statement_date_param + INTERVAL '25 days';
    
    -- Create statement record
    INSERT INTO public.credit_card_statements (
        user_id, loan_id, statement_date, previous_balance, 
        payments_credits, purchases_charges, interest_charged, fees_charged,
        new_balance, minimum_payment_due, payment_due_date,
        credit_limit, available_credit
    ) VALUES (
        loan_record.user_id, loan_id_param, statement_date_param, previous_balance,
        payments_credits, new_purchases, interest_charged, fees_charged,
        new_balance, minimum_payment, payment_due_date,
        loan_record.credit_limit, loan_record.credit_limit - new_balance
    ) RETURNING id INTO statement_id;
    
    -- Update loan record
    UPDATE public.loans SET 
        current_balance = new_balance,
        last_statement_balance = new_balance,
        last_statement_date = statement_date_param,
        minimum_payment_due = minimum_payment,
        payment_due_date = payment_due_date::text,
        available_credit = loan_record.credit_limit - new_balance
    WHERE id = loan_id_param;
    
    RETURN statement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;