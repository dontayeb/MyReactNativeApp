# Network Issue Debug Guide

## The Problem
Your app shows "network request failed" even with correct Supabase credentials. This suggests:

1. **Database doesn't exist or isn't set up**
2. **Tables are missing** 
3. **RLS (Row Level Security) is blocking requests**
4. **API keys are incorrect or expired**

## Immediate Steps to Fix

### Step 1: Verify Supabase Project
1. Go to https://supabase.com/dashboard
2. Log into your account
3. Check if project `dzyzffrokbqgocejgmii` exists and is active
4. If project doesn't exist, create a new one

### Step 2: Set Up Database Tables
Your app needs these tables to work:
- `profiles` (user profiles)
- `loans` (user loans)  
- `assets` (user assets)
- `terms_acceptance` (terms tracking)
- `analytics_events` (analytics)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    loan_name TEXT NOT NULL,
    loan_type TEXT NOT NULL,
    principal DECIMAL(12,2) NOT NULL,
    current_balance DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2),
    currency TEXT DEFAULT 'USD',
    payment_amount DECIMAL(12,2),
    payment_frequency TEXT,
    next_payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assets table  
CREATE TABLE IF NOT EXISTS assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    last_valued DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own loans" ON loans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" ON loans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" ON loans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" ON loans
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own assets" ON assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets" ON assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets" ON assets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets" ON assets
    FOR DELETE USING (auth.uid() = user_id);
```

### Step 3: Test Database Connection
Test your credentials with curl:

```bash
curl -X GET 'https://dzyzffrokbqgocejgmii.supabase.co/rest/v1/profiles' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eXpmZnJva2JxZ29jZWpnbWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMTI1MzYsImV4cCI6MjA2OTU4ODUzNn0.vbDh4m-3dzKOuS0n_ttyfcMvBPEmiQjEAXBGlKtY7y8" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eXpmZnJva2JxZ29jZWpnbWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMTI1MzYsImV4cCI6MjA2OTU4ODUzNn0.vbDh4m-3dzKOuS0n_ttyfcMvBPEmiQjEAXBGlKtY7y8"
```

### Step 4: Alternative - Create New Supabase Project
If your project doesn't exist:

1. Go to https://supabase.com/dashboard/new
2. Create new project: `EasyWealthGuide`
3. Wait for setup (2-3 minutes)
4. Copy new URL and API key
5. Update `.env.staging` with new credentials
6. Run the SQL schema above
7. Rebuild the app

### Step 5: Quick Test Build
After setting up the database, create a simple test:

```bash
# Build with new credentials
npx eas-cli build --platform android --profile preview --clear-cache
```

## Most Likely Issues

1. **Database doesn't exist** - Project was deleted or never created
2. **Missing tables** - App expects specific table structure  
3. **Wrong API keys** - Keys expired or from different project
4. **RLS blocking** - Row Level Security preventing access

## Next Steps
1. Check Supabase dashboard first
2. Set up database schema if missing
3. Test connection with curl
4. If still failing, create fresh Supabase project
5. Rebuild app with working credentials