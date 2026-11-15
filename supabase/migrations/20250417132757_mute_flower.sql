/*
  # Fix User Profile Issues

  1. Changes
    - Drop and recreate user profile policies to fix RLS issues
    - Add trigger to create profile on user signup
    - Add policy for profile creation
    - Fix profile update policy

  2. Security
    - Maintain RLS protection
    - Allow users to manage their own profiles
    - Ensure profile creation on signup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create new policies
CREATE POLICY "Users can manage their own profile"
ON user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create policy for profile creation
CREATE POLICY "Create profile on signup"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- Create or replace the function to create user profile
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    first_name,
    last_name,
    phone,
    job_title
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'first_name')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'last_name')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'phone')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'job_title')::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_on_signup();