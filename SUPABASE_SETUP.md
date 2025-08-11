# Supabase Setup Guide

## 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from the project settings

## 2. Environment Variables
Update the `.env` file with your actual Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_actual_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
```

## 3. Database Schema
Run these SQL commands in your Supabase SQL editor:

### Create profiles table
```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  default_currency text default 'USD',
  age_group text,
  gender text,
  country text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policy for profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
```

### Create assets table
```sql
-- Create assets table
create table public.assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null,
  value decimal not null,
  currency text default 'USD',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS
alter table public.assets enable row level security;

-- Create policies for assets
create policy "Users can view own assets" on public.assets
  for select using (auth.uid() = user_id);

create policy "Users can insert own assets" on public.assets
  for insert with check (auth.uid() = user_id);

create policy "Users can update own assets" on public.assets
  for update using (auth.uid() = user_id);

create policy "Users can delete own assets" on public.assets
  for delete using (auth.uid() = user_id);
```

### Create loans table
```sql
-- Create loans table
create table public.loans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  principal decimal not null,
  interest_rate decimal not null,
  term_months integer not null,
  monthly_payment decimal not null,
  currency text default 'USD',
  start_date date not null,
  loan_type text default 'personal',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS
alter table public.loans enable row level security;

-- Create policies for loans
create policy "Users can view own loans" on public.loans
  for select using (auth.uid() = user_id);

create policy "Users can insert own loans" on public.loans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own loans" on public.loans
  for update using (auth.uid() = user_id);

create policy "Users can delete own loans" on public.loans
  for delete using (auth.uid() = user_id);
```

### Create function to handle profile creation
```sql
-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, default_currency, age_group, gender, country)
  values (new.id, new.raw_user_meta_data->>'username', 'USD', null, null, null);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 4. Test the Setup
1. Start your app: `npm start`
2. Try signing up with a new account
3. Check your Supabase dashboard to see if the user and profile were created

## 5. Schema Updates for Existing Databases
If you already have a Supabase database set up, you'll need to run the additional schema updates from `SCHEMA_UPDATE.sql` to add the missing columns for profile data (age_group, gender, country) and loan categorization (loan_type).

## 6. Email Configuration (Optional)
For production, configure email templates in Supabase dashboard under Authentication > Email Templates.