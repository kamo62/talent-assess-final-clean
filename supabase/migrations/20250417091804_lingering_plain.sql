/*
  # Separate Code Assessments from Case Studies

  1. New Tables
    - `code_assessments`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `difficulty` (difficulty_level)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Data Migration
    - Move programming-type case studies to code_assessments table
    - Remove programming-type entries from case_studies table

  3. Security
    - Enable RLS on code_assessments table
    - Add policy for authenticated users to view code assessments
*/

-- Create code_assessments table
CREATE TABLE IF NOT EXISTS code_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  difficulty difficulty_level NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE code_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for code_assessments
CREATE POLICY "Code assessments are viewable by authenticated users"
  ON code_assessments
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger for code_assessments
CREATE TRIGGER update_code_assessments_updated_at
  BEFORE UPDATE
  ON code_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Move programming case studies to code_assessments
INSERT INTO code_assessments (title, description, difficulty)
SELECT title, description, difficulty
FROM case_studies
WHERE type = 'programming';

-- Remove programming case studies
DELETE FROM case_studies WHERE type = 'programming';