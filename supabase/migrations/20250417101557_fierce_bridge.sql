/*
  # Add Role-Based Access Control and Audit Logging

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    
    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `role_id` (uuid, references roles)
      - `created_at` (timestamp)
    
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `action` (text)
      - `table_name` (text)
      - `record_id` (uuid)
      - `old_data` (jsonb)
      - `new_data` (jsonb)
      - `created_at` (timestamp)

    - `assessment_order`
      - `id` (uuid, primary key)
      - `assessment_id` (uuid)
      - `assessment_type` (text)
      - `position` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users with admin role
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  role_id uuid REFERENCES roles NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create assessment_order table
CREATE TABLE IF NOT EXISTS assessment_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  assessment_type text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_type, position)
);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_order ENABLE ROW LEVEL SECURITY;

-- Create admin role
INSERT INTO roles (name) VALUES ('admin');

-- Create policies for roles
CREATE POLICY "Roles are viewable by authenticated users"
  ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for user_roles
CREATE POLICY "User roles are viewable by authenticated users"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage user roles"
  ON user_roles
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

-- Create policies for audit_logs
CREATE POLICY "Audit logs are viewable by admins"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Create policies for assessment_order
CREATE POLICY "Assessment order is viewable by authenticated users"
  ON assessment_order
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage assessment order"
  ON assessment_order
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

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
    END,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE row_to_json(NEW)
    END
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
CREATE TRIGGER audit_case_studies
  AFTER INSERT OR UPDATE OR DELETE ON case_studies
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_code_assessments
  AFTER INSERT OR UPDATE OR DELETE ON code_assessments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Create function to maintain assessment order
CREATE OR REPLACE FUNCTION maintain_assessment_order()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO assessment_order (assessment_id, assessment_type, position)
    SELECT NEW.id, TG_TABLE_NAME, COALESCE(MAX(position), 0) + 1
    FROM assessment_order
    WHERE assessment_type = TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE assessment_order
    SET position = position - 1
    WHERE assessment_type = TG_TABLE_NAME
    AND position > (
      SELECT position FROM assessment_order
      WHERE assessment_id = OLD.id
      AND assessment_type = TG_TABLE_NAME
    );
    DELETE FROM assessment_order
    WHERE assessment_id = OLD.id
    AND assessment_type = TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create order maintenance triggers
CREATE TRIGGER maintain_case_studies_order
  AFTER INSERT OR DELETE ON case_studies
  FOR EACH ROW EXECUTE FUNCTION maintain_assessment_order();

CREATE TRIGGER maintain_code_assessments_order
  AFTER INSERT OR DELETE ON code_assessments
  FOR EACH ROW EXECUTE FUNCTION maintain_assessment_order();