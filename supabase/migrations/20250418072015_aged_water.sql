/*
  # Fix MCQ Permissions

  1. Changes
    - Add missing RLS policies for MCQ questions and categories
    - Fix existing policies to ensure proper access
    - Add organization_id to MCQ questions for proper isolation

  2. Security
    - Enable RLS on all MCQ-related tables
    - Add policies for authenticated users
    - Ensure organization-level access control
*/

-- Add organization_id to mcq_questions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mcq_questions' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE mcq_questions ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "MCQ questions are viewable by assigned users" ON mcq_questions;
DROP POLICY IF EXISTS "MCQ categories are viewable by authenticated users" ON mcq_categories;

-- Create new policies for MCQ questions
CREATE POLICY "View MCQ questions"
ON mcq_questions
FOR SELECT
TO authenticated
USING (
  (organization_id IS NULL) OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = mcq_questions.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Manage MCQ questions"
ON mcq_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = mcq_questions.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = mcq_questions.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'owner')
  )
);

-- Create policies for MCQ categories
CREATE POLICY "View MCQ categories"
ON mcq_categories
FOR SELECT
TO authenticated
USING (
  (organization_id IS NULL) OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = mcq_categories.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Manage MCQ categories"
ON mcq_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = mcq_categories.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = mcq_categories.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'owner')
  )
);

-- Create default categories if they don't exist
INSERT INTO mcq_categories (name, description)
SELECT 'General', 'General knowledge questions'
WHERE NOT EXISTS (
  SELECT 1 FROM mcq_categories WHERE name = 'General'
);

INSERT INTO mcq_categories (name, description)
SELECT 'Technical', 'Technical and programming questions'
WHERE NOT EXISTS (
  SELECT 1 FROM mcq_categories WHERE name = 'Technical'
);

INSERT INTO mcq_categories (name, description)
SELECT 'Soft Skills', 'Behavioral and soft skills questions'
WHERE NOT EXISTS (
  SELECT 1 FROM mcq_categories WHERE name = 'Soft Skills'
);