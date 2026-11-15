/*
  # Add assessment assignments

  1. New Tables
    - `assessment_assignments`
      - `id` (uuid, primary key)
      - `assessment_id` (uuid, foreign key)
      - `assessment_type` (text) - to distinguish between case studies and code assessments
      - `user_email` (text) - email of the assigned user
      - `status` (text) - assigned, completed, expired
      - `due_date` (timestamptz) - when the assessment should be completed by
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `assessment_assignments` table
    - Add policies for admins to manage assignments
    - Add policies for users to view their own assignments
*/

CREATE TABLE assessment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  assessment_type text NOT NULL,
  user_email text NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('assigned', 'completed', 'expired'))
);

ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage assignments
CREATE POLICY "Admins can manage assignments"
  ON assessment_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Policy for users to view their own assignments
CREATE POLICY "Users can view their own assignments"
  ON assessment_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_email = (
      SELECT email FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_assessment_assignments_updated_at
  BEFORE UPDATE ON assessment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();