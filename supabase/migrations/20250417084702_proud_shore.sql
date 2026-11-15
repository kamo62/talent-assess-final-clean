/*
  # Initial Schema Setup for Skill Assessment Platform

  1. New Tables
    - `case_studies`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `type` (enum: programming, system_design)
      - `difficulty` (enum: easy, medium, hard)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `code_submissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `code` (text)
      - `language` (text)
      - `created_at` (timestamp)
      - `feedback` (text, nullable)
      - `status` (enum: pending, approved, rejected)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create enum types
CREATE TYPE case_study_type AS ENUM ('programming', 'system_design');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Create case_studies table
CREATE TABLE IF NOT EXISTS case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type case_study_type NOT NULL,
  difficulty difficulty_level NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create code_submissions table
CREATE TABLE IF NOT EXISTS code_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  code text NOT NULL,
  language text NOT NULL,
  created_at timestamptz DEFAULT now(),
  feedback text,
  status submission_status DEFAULT 'pending'
);

-- Enable Row Level Security
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for case_studies
CREATE POLICY "Case studies are viewable by authenticated users"
  ON case_studies
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for code_submissions
CREATE POLICY "Users can view their own submissions"
  ON code_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions"
  ON code_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for case_studies
CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE
  ON case_studies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();