-- Migration: Assessment Templates and Unified Management System
-- Description: Adds support for assessment templates, bulk operations, and unified management

-- Add metadata columns to existing assessment tables
ALTER TABLE code_assessments ADD COLUMN IF NOT EXISTS 
  tags TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT FALSE,
  template_name TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ;

ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS 
  tags TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT FALSE,
  template_name TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ;

ALTER TABLE mcq_assessments ADD COLUMN IF NOT EXISTS 
  tags TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT FALSE,
  template_name TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ;

-- Create assessment_templates table
CREATE TABLE IF NOT EXISTS assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_assessment_id UUID,
  source_type TEXT CHECK (source_type IN ('code', 'case_study', 'mcq')),
  template_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  content JSONB NOT NULL, -- Stores full assessment data
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE, -- For sharing across orgs
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_template_name_per_org UNIQUE(organization_id, template_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_org ON assessment_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON assessment_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_category ON assessment_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON assessment_templates(is_public) WHERE is_public = true;

-- Create indexes for assessment tables
CREATE INDEX IF NOT EXISTS idx_code_assessments_tags ON code_assessments USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_case_studies_tags ON case_studies USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_mcq_assessments_tags ON mcq_assessments USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_code_assessments_template ON code_assessments(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_case_studies_template ON case_studies(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_mcq_assessments_template ON mcq_assessments(is_template) WHERE is_template = true;

-- Function for bulk operations
CREATE OR REPLACE FUNCTION bulk_update_assessments(
  assessment_ids UUID[],
  assessment_type TEXT,
  operation TEXT,
  metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  affected_count INTEGER;
BEGIN
  CASE operation
    WHEN 'delete' THEN
      -- Bulk delete
      IF assessment_type = 'code' THEN
        DELETE FROM code_assessments WHERE id = ANY(assessment_ids);
      ELSIF assessment_type = 'case_study' THEN
        DELETE FROM case_studies WHERE id = ANY(assessment_ids);
      ELSIF assessment_type = 'mcq' THEN
        DELETE FROM mcq_assessments WHERE id = ANY(assessment_ids);
      END IF;
      GET DIAGNOSTICS affected_count = ROW_COUNT;
      
    WHEN 'duplicate' THEN
      -- Bulk duplicate
      affected_count := 0;
      IF assessment_type = 'code' THEN
        INSERT INTO code_assessments (title, description, problem_statement, starter_code, solution_code, test_cases, difficulty, time_limit, language, organization_id, tags)
        SELECT title || ' (Copy)', description, problem_statement, starter_code, solution_code, test_cases, difficulty, time_limit, language, organization_id, tags
        FROM code_assessments WHERE id = ANY(assessment_ids);
        GET DIAGNOSTICS affected_count = ROW_COUNT;
      ELSIF assessment_type = 'case_study' THEN
        INSERT INTO case_studies (title, description, scenario, tasks, evaluation_criteria, difficulty, time_limit, organization_id, tags)
        SELECT title || ' (Copy)', description, scenario, tasks, evaluation_criteria, difficulty, time_limit, organization_id, tags
        FROM case_studies WHERE id = ANY(assessment_ids);
        GET DIAGNOSTICS affected_count = ROW_COUNT;
      ELSIF assessment_type = 'mcq' THEN
        INSERT INTO mcq_assessments (title, description, passing_score, time_limit, randomize_questions, show_explanations, organization_id, tags)
        SELECT title || ' (Copy)', description, passing_score, time_limit, randomize_questions, show_explanations, organization_id, tags
        FROM mcq_assessments WHERE id = ANY(assessment_ids);
        GET DIAGNOSTICS affected_count = ROW_COUNT;
      END IF;
      
    WHEN 'tag' THEN
      -- Bulk tagging
      IF assessment_type = 'code' THEN
        UPDATE code_assessments 
        SET tags = tags || (metadata->>'tags')::TEXT[]
        WHERE id = ANY(assessment_ids);
      ELSIF assessment_type = 'case_study' THEN
        UPDATE case_studies 
        SET tags = tags || (metadata->>'tags')::TEXT[]
        WHERE id = ANY(assessment_ids);
      ELSIF assessment_type = 'mcq' THEN
        UPDATE mcq_assessments 
        SET tags = tags || (metadata->>'tags')::TEXT[]
        WHERE id = ANY(assessment_ids);
      END IF;
      GET DIAGNOSTICS affected_count = ROW_COUNT;
      
    ELSE
      RAISE EXCEPTION 'Invalid operation: %', operation;
  END CASE;
  
  result := jsonb_build_object(
    'success', true,
    'operation', operation,
    'affected_count', affected_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create template from assessment
CREATE OR REPLACE FUNCTION create_assessment_template(
  p_assessment_id UUID,
  p_assessment_type TEXT,
  p_template_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}',
  p_is_public BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
  v_content JSONB;
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get assessment content and organization
  IF p_assessment_type = 'code' THEN
    SELECT to_jsonb(ca.*), ca.organization_id 
    INTO v_content, v_org_id
    FROM code_assessments ca 
    WHERE ca.id = p_assessment_id;
  ELSIF p_assessment_type = 'case_study' THEN
    SELECT to_jsonb(cs.*), cs.organization_id 
    INTO v_content, v_org_id
    FROM case_studies cs 
    WHERE cs.id = p_assessment_id;
  ELSIF p_assessment_type = 'mcq' THEN
    SELECT to_jsonb(ma.*), ma.organization_id 
    INTO v_content, v_org_id
    FROM mcq_assessments ma 
    WHERE ma.id = p_assessment_id;
  ELSE
    RAISE EXCEPTION 'Invalid assessment type: %', p_assessment_type;
  END IF;
  
  IF v_content IS NULL THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;
  
  -- Remove system fields from content
  v_content := v_content - 'id' - 'created_at' - 'updated_at' - 'organization_id';
  
  -- Create template
  INSERT INTO assessment_templates (
    organization_id,
    source_assessment_id,
    source_type,
    template_name,
    description,
    category,
    tags,
    content,
    is_public,
    created_by
  ) VALUES (
    v_org_id,
    p_assessment_id,
    p_assessment_type,
    p_template_name,
    p_description,
    p_category,
    p_tags,
    v_content,
    p_is_public,
    v_user_id
  ) RETURNING id INTO v_template_id;
  
  -- Update usage count on source assessment
  IF p_assessment_type = 'code' THEN
    UPDATE code_assessments SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = p_assessment_id;
  ELSIF p_assessment_type = 'case_study' THEN
    UPDATE case_studies SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = p_assessment_id;
  ELSIF p_assessment_type = 'mcq' THEN
    UPDATE mcq_assessments SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = p_assessment_id;
  END IF;
  
  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create assessment from template
CREATE OR REPLACE FUNCTION create_from_template(
  p_template_id UUID,
  p_title TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_template assessment_templates;
  v_new_id UUID;
  v_content JSONB;
  v_org_id UUID;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM assessment_templates WHERE id = p_template_id;
  
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Check access (own org or public template)
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF v_template.organization_id != v_org_id AND NOT v_template.is_public THEN
    RAISE EXCEPTION 'Access denied to this template';
  END IF;
  
  -- Prepare content
  v_content := v_template.content;
  IF p_title IS NOT NULL THEN
    v_content := jsonb_set(v_content, '{title}', to_jsonb(p_title));
  END IF;
  v_content := jsonb_set(v_content, '{organization_id}', to_jsonb(v_org_id));
  
  -- Create assessment based on type
  IF v_template.source_type = 'code' THEN
    INSERT INTO code_assessments 
    SELECT * FROM jsonb_populate_record(null::code_assessments, v_content)
    RETURNING id INTO v_new_id;
  ELSIF v_template.source_type = 'case_study' THEN
    INSERT INTO case_studies 
    SELECT * FROM jsonb_populate_record(null::case_studies, v_content)
    RETURNING id INTO v_new_id;
  ELSIF v_template.source_type = 'mcq' THEN
    INSERT INTO mcq_assessments 
    SELECT * FROM jsonb_populate_record(null::mcq_assessments, v_content)
    RETURNING id INTO v_new_id;
  END IF;
  
  -- Update template usage
  UPDATE assessment_templates 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = p_template_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'assessment_id', v_new_id,
    'assessment_type', v_template.source_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for templates
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;

-- View own organization's templates and public templates
CREATE POLICY "View templates" ON assessment_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    OR is_public = true
  );

-- Create templates for own organization
CREATE POLICY "Create templates" ON assessment_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Update own organization's templates
CREATE POLICY "Update templates" ON assessment_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Delete own organization's templates
CREATE POLICY "Delete templates" ON assessment_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON assessment_templates TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_assessments TO authenticated;
GRANT EXECUTE ON FUNCTION create_assessment_template TO authenticated;
GRANT EXECUTE ON FUNCTION create_from_template TO authenticated;
