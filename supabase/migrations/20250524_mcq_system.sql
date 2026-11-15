-- MCQ System Tables

-- Question categories
CREATE TABLE mcq_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES mcq_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question bank
CREATE TABLE mcq_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES mcq_categories(id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER DEFAULT 1,
  time_limit_seconds INTEGER, -- Optional per-question time limit
  explanation TEXT, -- Explanation shown after answer
  tags TEXT[], -- Array of tags for filtering
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question options
CREATE TABLE mcq_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  explanation TEXT, -- Per-option explanation
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCQ assessments (collections of questions)
CREATE TABLE mcq_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES mcq_categories(id),
  time_limit_minutes INTEGER DEFAULT 60,
  passing_score_percentage INTEGER DEFAULT 70,
  randomize_questions BOOLEAN DEFAULT true,
  randomize_options BOOLEAN DEFAULT true,
  show_correct_answers BOOLEAN DEFAULT false, -- Show correct answers after submission
  allow_review BOOLEAN DEFAULT true, -- Allow reviewing answers after submission
  max_attempts INTEGER DEFAULT 1,
  difficulty_distribution JSONB, -- e.g., {"easy": 30, "medium": 50, "hard": 20}
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions in assessments (many-to-many)
CREATE TABLE mcq_assessment_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES mcq_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES mcq_questions(id),
  display_order INTEGER,
  points_override INTEGER, -- Override default question points for this assessment
  UNIQUE(assessment_id, question_id)
);

-- User attempts on assessments
CREATE TABLE mcq_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES mcq_assessments(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent INTERVAL,
  score INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  percentage_score DECIMAL(5,2),
  passed BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  UNIQUE(assessment_id, user_id, attempt_number)
);

-- User answers
CREATE TABLE mcq_user_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES mcq_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES mcq_questions(id),
  selected_option_ids UUID[], -- Array of selected option IDs
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  time_spent_seconds INTEGER,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- Performance analytics
CREATE TABLE mcq_question_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES mcq_questions(id),
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  incorrect_attempts INTEGER DEFAULT 0,
  average_time_seconds INTEGER,
  difficulty_rating DECIMAL(3,2), -- Calculated based on success rate
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id)
);

-- Indexes for performance
CREATE INDEX idx_mcq_questions_category ON mcq_questions(category_id);
CREATE INDEX idx_mcq_questions_difficulty ON mcq_questions(difficulty);
CREATE INDEX idx_mcq_questions_tags ON mcq_questions USING GIN(tags);
CREATE INDEX idx_mcq_options_question ON mcq_options(question_id);
CREATE INDEX idx_mcq_attempts_user ON mcq_attempts(user_id);
CREATE INDEX idx_mcq_attempts_assessment ON mcq_attempts(assessment_id);
CREATE INDEX idx_mcq_user_answers_attempt ON mcq_user_answers(attempt_id);

-- Function to calculate question difficulty based on performance
CREATE OR REPLACE FUNCTION update_question_difficulty_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mcq_question_analytics
  SET 
    difficulty_rating = CASE 
      WHEN total_attempts = 0 THEN NULL
      ELSE 1.0 - (correct_attempts::DECIMAL / total_attempts::DECIMAL)
    END,
    last_updated = NOW()
  WHERE question_id = NEW.question_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics
CREATE TRIGGER update_question_analytics
AFTER INSERT OR UPDATE ON mcq_user_answers
FOR EACH ROW
EXECUTE FUNCTION update_question_difficulty_rating();

-- Function to generate random assessment
CREATE OR REPLACE FUNCTION generate_random_mcq_assessment(
  p_category_id UUID,
  p_num_questions INTEGER,
  p_difficulty_distribution JSONB
) RETURNS UUID AS $$
DECLARE
  v_assessment_id UUID;
  v_easy_count INTEGER;
  v_medium_count INTEGER;
  v_hard_count INTEGER;
BEGIN
  -- Parse difficulty distribution
  v_easy_count := COALESCE((p_difficulty_distribution->>'easy')::INTEGER * p_num_questions / 100, 0);
  v_medium_count := COALESCE((p_difficulty_distribution->>'medium')::INTEGER * p_num_questions / 100, 0);
  v_hard_count := p_num_questions - v_easy_count - v_medium_count;
  
  -- Create assessment
  INSERT INTO mcq_assessments (
    title,
    category_id,
    difficulty_distribution,
    created_by
  ) VALUES (
    'Random Assessment - ' || NOW()::TEXT,
    p_category_id,
    p_difficulty_distribution,
    auth.uid()
  ) RETURNING id INTO v_assessment_id;
  
  -- Add random questions by difficulty
  -- Easy questions
  INSERT INTO mcq_assessment_questions (assessment_id, question_id)
  SELECT v_assessment_id, id
  FROM mcq_questions
  WHERE category_id = p_category_id
    AND difficulty = 'easy'
    AND is_active = true
  ORDER BY RANDOM()
  LIMIT v_easy_count;
  
  -- Medium questions
  INSERT INTO mcq_assessment_questions (assessment_id, question_id)
  SELECT v_assessment_id, id
  FROM mcq_questions
  WHERE category_id = p_category_id
    AND difficulty = 'medium'
    AND is_active = true
  ORDER BY RANDOM()
  LIMIT v_medium_count;
  
  -- Hard questions
  INSERT INTO mcq_assessment_questions (assessment_id, question_id)
  SELECT v_assessment_id, id
  FROM mcq_questions
  WHERE category_id = p_category_id
    AND difficulty = 'hard'
    AND is_active = true
  ORDER BY RANDOM()
  LIMIT v_hard_count;
  
  RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate assessment score
CREATE OR REPLACE FUNCTION calculate_mcq_score(p_attempt_id UUID)
RETURNS TABLE (
  score INTEGER,
  total_points INTEGER,
  percentage DECIMAL,
  passed BOOLEAN
) AS $$
DECLARE
  v_score INTEGER;
  v_total INTEGER;
  v_percentage DECIMAL;
  v_passing_score INTEGER;
  v_passed BOOLEAN;
BEGIN
  -- Calculate score
  SELECT 
    COALESCE(SUM(points_earned), 0),
    COALESCE(SUM(q.points), 0)
  INTO v_score, v_total
  FROM mcq_user_answers ua
  JOIN mcq_questions q ON ua.question_id = q.id
  WHERE ua.attempt_id = p_attempt_id;
  
  -- Calculate percentage
  v_percentage := CASE 
    WHEN v_total = 0 THEN 0
    ELSE (v_score::DECIMAL / v_total::DECIMAL) * 100
  END;
  
  -- Check if passed
  SELECT passing_score_percentage INTO v_passing_score
  FROM mcq_assessments a
  JOIN mcq_attempts att ON att.assessment_id = a.id
  WHERE att.id = p_attempt_id;
  
  v_passed := v_percentage >= v_passing_score;
  
  -- Update attempt record
  UPDATE mcq_attempts
  SET 
    score = v_score,
    total_points = v_total,
    percentage_score = v_percentage,
    passed = v_passed,
    completed_at = NOW(),
    time_spent = NOW() - started_at
  WHERE id = p_attempt_id;
  
  RETURN QUERY SELECT v_score, v_total, v_percentage, v_passed;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE mcq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_question_analytics ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Public can view categories"
  ON mcq_categories FOR SELECT
  USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON mcq_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Users can view active questions
CREATE POLICY "Users can view active questions"
  ON mcq_questions FOR SELECT
  USING (is_active = true);

-- Admins can manage questions
CREATE POLICY "Admins can manage questions"
  ON mcq_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Users can view options for active questions
CREATE POLICY "Users can view options"
  ON mcq_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mcq_questions
      WHERE mcq_questions.id = mcq_options.question_id
      AND mcq_questions.is_active = true
    )
  );

-- Users can view assessments
CREATE POLICY "Users can view assessments"
  ON mcq_assessments FOR SELECT
  USING (true);

-- Users can view their own attempts
CREATE POLICY "Users can view own attempts"
  ON mcq_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create attempts
CREATE POLICY "Users can create attempts"
  ON mcq_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own answers
CREATE POLICY "Users can view own answers"
  ON mcq_user_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mcq_attempts
      WHERE mcq_attempts.id = mcq_user_answers.attempt_id
      AND mcq_attempts.user_id = auth.uid()
    )
  );

-- Users can create answers for their attempts
CREATE POLICY "Users can create answers"
  ON mcq_user_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mcq_attempts
      WHERE mcq_attempts.id = mcq_user_answers.attempt_id
      AND mcq_attempts.user_id = auth.uid()
    )
  );

-- Everyone can view analytics
CREATE POLICY "Public can view analytics"
  ON mcq_question_analytics FOR SELECT
  USING (true);
