-- Add monthly_survival_budget column to profiles table
ALTER TABLE profiles ADD COLUMN monthly_survival_budget DECIMAL(15,2);

-- Add comment to explain the column
COMMENT ON COLUMN profiles.monthly_survival_budget IS 'Monthly amount needed for survival including all bills, loans, groceries, and essential expenses';