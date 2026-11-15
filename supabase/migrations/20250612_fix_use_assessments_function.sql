-- Create use_assessments function that the edge function expects
-- This is an alias for deduct_assessments with a simpler interface

CREATE OR REPLACE FUNCTION use_assessments(
  org_id UUID, 
  assessments_to_deduct INTEGER,
  description TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Call the existing deduct_assessments function
  RETURN deduct_assessments(org_id, assessments_to_deduct, description);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION use_assessments TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_assessments TO authenticated;
GRANT EXECUTE ON FUNCTION check_assessment_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_ai_config TO authenticated;
