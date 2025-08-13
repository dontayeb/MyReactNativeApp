-- Update the trigger function to auto-generate usernames from email addresses
-- This ensures new users always have a username for welcome messages

-- First, create a function to generate clean usernames from email
CREATE OR REPLACE FUNCTION public.generate_username_from_email(email_address text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    email_prefix text;
    clean_username text;
BEGIN
    -- Extract the part before @
    email_prefix := split_part(email_address, '@', 1);
    
    -- Clean the username: remove dots, dashes, plus signs, keep only alphanumeric and underscores
    clean_username := lower(regexp_replace(email_prefix, '[.\-+]', '', 'g'));
    clean_username := regexp_replace(clean_username, '[^a-z0-9_]', '', 'g');
    
    -- Limit to 20 characters
    clean_username := substring(clean_username from 1 for 20);
    
    -- Ensure it's not empty or too short
    IF clean_username IS NULL OR length(clean_username) < 2 THEN
        clean_username := 'user' || floor(random() * 1000)::text;
    END IF;
    
    RETURN clean_username;
END;
$$;

-- Update the trigger function to auto-generate username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    generated_username text;
BEGIN
    -- Generate username from email if not provided in metadata
    generated_username := COALESCE(
        new.raw_user_meta_data->>'username',
        public.generate_username_from_email(new.email)
    );
    
    -- Insert a new profile for the user
    INSERT INTO public.profiles (
        id, 
        username, 
        default_currency, 
        age_group, 
        gender, 
        country,
        terms_accepted,
        privacy_policy_accepted,
        terms_version,
        privacy_policy_version,
        newsletter_subscribed,
        newsletter_subscription_source
    )
    VALUES (
        new.id, 
        generated_username,
        'USD', 
        null, 
        null, 
        null,
        false,
        false,
        '1.0',
        '1.0',
        COALESCE((new.raw_user_meta_data->>'newsletter_subscribed')::boolean, false),
        CASE 
            WHEN (new.raw_user_meta_data->>'newsletter_subscribed')::boolean = true THEN 'signup'
            ELSE null
        END
    );
    
    RETURN new;
END;
$$;

-- The trigger should already exist, but recreate it to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Username auto-generation added to signup trigger. New users will get usernames from their email addresses.' as status;