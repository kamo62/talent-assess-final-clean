import { supabase } from './supabase';

export interface MCQCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MCQQuestion {
  id: string;
  category_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  time_limit_seconds: number | null;
  explanation: string | null;
  tags: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MCQOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  explanation: string | null;
  display_order: number;
}

export interface MCQAssessment {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  time_limit_minutes: number;
  passing_score_percentage: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_correct_answers: boolean;
  allow_review: boolean;
  max_attempts: number;
  difficulty_distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MCQAttempt {
  id: string;
  assessment_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  time_spent: string | null;
  score: number;
  total_points: number;
  percentage_score: number | null;
  passed: boolean;
  ip_address: string | null;
  user_agent: string | null;
}

export interface MCQUserAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean | null;
  points_earned: number;
  time_spent_seconds: number | null;
  answered_at: string;
}

export interface MCQQuestionAnalytics {
  question_id: string;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  average_time_seconds: number | null;
  difficulty_rating: number | null;
  last_updated: string;
}

// Category Management
export async function createCategory(category: Omit<MCQCategory, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('mcq_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCategories(includeSubcategories = false) {
  let query = supabase
    .from('mcq_categories')
    .select('*')
    .order('name');

  if (!includeSubcategories) {
    query = query.is('parent_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Question Management
export async function createQuestion(
  question: Omit<MCQQuestion, 'id' | 'created_at' | 'updated_at'>,
  options: Omit<MCQOption, 'id' | 'question_id' | 'created_at'>[]
) {
  const { data: questionData, error: questionError } = await supabase
    .from('mcq_questions')
    .insert(question)
    .select()
    .single();

  if (questionError) throw questionError;

  const optionsWithQuestionId = options.map(option => ({
    ...option,
    question_id: questionData.id
  }));

  const { error: optionsError } = await supabase
    .from('mcq_options')
    .insert(optionsWithQuestionId);

  if (optionsError) throw optionsError;

  return questionData;
}

export async function getQuestions(filters?: {
  category_id?: string;
  difficulty?: string;
  tags?: string[];
  is_active?: boolean;
}) {
  let query = supabase
    .from('mcq_questions')
    .select(`
      *,
      category:mcq_categories(name),
      options:mcq_options(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Assessment Management
export async function createAssessment(
  assessment: Omit<MCQAssessment, 'id' | 'created_at' | 'updated_at'>,
  questionIds?: string[]
) {
  const { data: assessmentData, error: assessmentError } = await supabase
    .from('mcq_assessments')
    .insert(assessment)
    .select()
    .single();

  if (assessmentError) throw assessmentError;

  if (questionIds && questionIds.length > 0) {
    const assessmentQuestions = questionIds.map((questionId, index) => ({
      assessment_id: assessmentData.id,
      question_id: questionId,
      display_order: index + 1
    }));

    const { error: linkError } = await supabase
      .from('mcq_assessment_questions')
      .insert(assessmentQuestions);

    if (linkError) throw linkError;
  }

  return assessmentData;
}

export async function generateRandomAssessment(
  categoryId: string,
  numQuestions: number,
  difficultyDistribution: { easy: number; medium: number; hard: number }
) {
  const { data, error } = await supabase
    .rpc('generate_random_mcq_assessment', {
      p_category_id: categoryId,
      p_num_questions: numQuestions,
      p_difficulty_distribution: difficultyDistribution
    });

  if (error) throw error;
  return data;
}

// Attempt Management
export async function startAttempt(assessmentId: string, userId: string) {
  // Check previous attempts
  const { data: previousAttempts, error: countError } = await supabase
    .from('mcq_attempts')
    .select('attempt_number')
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .order('attempt_number', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const attemptNumber = previousAttempts && previousAttempts.length > 0 
    ? previousAttempts[0].attempt_number + 1 
    : 1;

  const { data, error } = await supabase
    .from('mcq_attempts')
    .insert({
      assessment_id: assessmentId,
      user_id: userId,
      attempt_number: attemptNumber,
      ip_address: window.location.hostname,
      user_agent: navigator.userAgent
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionIds: string[],
  timeSpentSeconds: number
) {
  // Get correct options for the question
  const { data: correctOptions, error: optionsError } = await supabase
    .from('mcq_options')
    .select('id')
    .eq('question_id', questionId)
    .eq('is_correct', true);

  if (optionsError) throw optionsError;

  const correctOptionIds = correctOptions?.map(opt => opt.id) || [];
  const isCorrect = 
    selectedOptionIds.length === correctOptionIds.length &&
    selectedOptionIds.every(id => correctOptionIds.includes(id));

  // Get question points
  const { data: question, error: questionError } = await supabase
    .from('mcq_questions')
    .select('points')
    .eq('id', questionId)
    .single();

  if (questionError) throw questionError;

  const pointsEarned = isCorrect ? question.points : 0;

  const { data, error } = await supabase
    .from('mcq_user_answers')
    .insert({
      attempt_id: attemptId,
      question_id: questionId,
      selected_option_ids: selectedOptionIds,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      time_spent_seconds: timeSpentSeconds
    })
    .select()
    .single();

  if (error) throw error;

  // Update question analytics
  await updateQuestionAnalytics(questionId, isCorrect, timeSpentSeconds);

  return data;
}

export async function completeAttempt(attemptId: string) {
  const { data, error } = await supabase
    .rpc('calculate_mcq_score', { p_attempt_id: attemptId });

  if (error) throw error;
  return data;
}

// Analytics
export async function updateQuestionAnalytics(
  questionId: string,
  isCorrect: boolean,
  timeSpentSeconds: number
) {
  // Check if analytics record exists
  const { data: existing, error: checkError } = await supabase
    .from('mcq_question_analytics')
    .select('*')
    .eq('question_id', questionId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') throw checkError;

  if (existing) {
    const newTotalAttempts = existing.total_attempts + 1;
    const newCorrectAttempts = existing.correct_attempts + (isCorrect ? 1 : 0);
    const newIncorrectAttempts = existing.incorrect_attempts + (isCorrect ? 0 : 1);
    const newAvgTime = existing.average_time_seconds
      ? (existing.average_time_seconds * existing.total_attempts + timeSpentSeconds) / newTotalAttempts
      : timeSpentSeconds;

    const { error: updateError } = await supabase
      .from('mcq_question_analytics')
      .update({
        total_attempts: newTotalAttempts,
        correct_attempts: newCorrectAttempts,
        incorrect_attempts: newIncorrectAttempts,
        average_time_seconds: Math.round(newAvgTime),
        difficulty_rating: 1 - (newCorrectAttempts / newTotalAttempts),
        last_updated: new Date().toISOString()
      })
      .eq('question_id', questionId);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase
      .from('mcq_question_analytics')
      .insert({
        question_id: questionId,
        total_attempts: 1,
        correct_attempts: isCorrect ? 1 : 0,
        incorrect_attempts: isCorrect ? 0 : 1,
        average_time_seconds: timeSpentSeconds,
        difficulty_rating: isCorrect ? 0 : 1
      });

    if (insertError) throw insertError;
  }
}

export async function getAssessmentAnalytics(assessmentId: string) {
  const { data: attempts, error: attemptsError } = await supabase
    .from('mcq_attempts')
    .select('*')
    .eq('assessment_id', assessmentId);

  if (attemptsError) throw attemptsError;

  const { data: questions, error: questionsError } = await supabase
    .from('mcq_assessment_questions')
    .select(`
      question_id,
      mcq_questions!inner(
        difficulty,
        points
      ),
      mcq_question_analytics(*)
    `)
    .eq('assessment_id', assessmentId);

  if (questionsError) throw questionsError;

  const totalAttempts = attempts?.length || 0;
  const passedAttempts = attempts?.filter(a => a.passed).length || 0;
  const averageScore = attempts?.reduce((sum, a) => sum + a.percentage_score, 0) / totalAttempts || 0;
  const averageTimeMinutes = attempts?.reduce((sum, a) => {
    if (!a.time_spent) return sum;
    const [hours, minutes] = a.time_spent.split(':').map(Number);
    return sum + (hours * 60 + minutes);
  }, 0) / totalAttempts || 0;

  return {
    totalAttempts,
    passedAttempts,
    passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
    averageScore,
    averageTimeMinutes,
    questionAnalytics: questions
  };
}

export async function getUserPerformance(userId: string, categoryId?: string) {
  let query = supabase
    .from('mcq_attempts')
    .select(`
      *,
      assessment:mcq_assessments!inner(
        title,
        category_id
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (categoryId) {
    query = query.eq('assessment.category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const totalAttempts = data?.length || 0;
  const completedAttempts = data?.filter(a => a.completed_at).length || 0;
  const passedAttempts = data?.filter(a => a.passed).length || 0;
  const averageScore = data?.reduce((sum, a) => sum + (a.percentage_score || 0), 0) / totalAttempts || 0;

  return {
    totalAttempts,
    completedAttempts,
    passedAttempts,
    averageScore,
    recentAttempts: data?.slice(0, 10) || []
  };
}

// Difficulty Scaling
export async function getAdaptiveQuestions(
  userId: string,
  categoryId: string,
  numQuestions: number
) {
  // Get user's performance history
  const { data: userAnswers, error: answersError } = await supabase
    .from('mcq_user_answers')
    .select(`
      is_correct,
      question:mcq_questions!inner(
        difficulty,
        category_id
      )
    `)
    .eq('question.category_id', categoryId)
    .eq('attempt.user_id', userId)
    .order('answered_at', { ascending: false })
    .limit(20);

  if (answersError) throw answersError;

  // Calculate user's current skill level
  let userSkillLevel: 'easy' | 'medium' | 'hard' = 'medium';
  if (userAnswers && userAnswers.length >= 5) {
    const recentCorrectRate = userAnswers
      .slice(0, 10)
      .filter(a => a.is_correct).length / 10;

    if (recentCorrectRate >= 0.8) {
      userSkillLevel = 'hard';
    } else if (recentCorrectRate <= 0.4) {
      userSkillLevel = 'easy';
    }
  }

  // Get questions based on adaptive difficulty
  const difficultyDistribution = {
    easy: userSkillLevel === 'easy' ? 0.6 : userSkillLevel === 'medium' ? 0.3 : 0.1,
    medium: userSkillLevel === 'easy' ? 0.3 : userSkillLevel === 'medium' ? 0.4 : 0.3,
    hard: userSkillLevel === 'easy' ? 0.1 : userSkillLevel === 'medium' ? 0.3 : 0.6
  };

  const easyCount = Math.round(numQuestions * difficultyDistribution.easy);
  const mediumCount = Math.round(numQuestions * difficultyDistribution.medium);
  const hardCount = numQuestions - easyCount - mediumCount;

  const questions: MCQQuestion[] = [];

  // Fetch questions by difficulty
  for (const [difficulty, count] of Object.entries({ easy: easyCount, medium: mediumCount, hard: hardCount })) {
    if (count > 0) {
      const { data, error } = await supabase
        .from('mcq_questions')
        .select('*')
        .eq('category_id', categoryId)
        .eq('difficulty', difficulty)
        .eq('is_active', true)
        .order('RANDOM()')
        .limit(count);

      if (error) throw error;
      if (data) questions.push(...data);
    }
  }

  return questions;
}
