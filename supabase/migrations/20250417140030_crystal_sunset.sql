/*
  # Fix User Profile Creation

  1. Changes
    - Drop existing profile creation triggers and functions
    - Create a single, robust profile creation function
    - Add proper error handling for duplicate profiles
    - Update profile policies

  2. Security
    - Maintain RLS protection
    - Ensure proper access control
*/

-- First, drop existing triggers and functions
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS create_profile_on_signup();

-- Create new, improved profile creation function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Try to create profile, ignore if already exists
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
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create single trigger for profile creation
CREATE TRIGGER create_user_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Drop and recreate profile policies to ensure consistency
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Create profile on signup" ON user_profiles;

-- Create simplified policies
CREATE POLICY "Users can manage their own profile"
ON user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create policy for initial profile creation
CREATE POLICY "Create profile on signup"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Add index to improve profile lookup performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(id);