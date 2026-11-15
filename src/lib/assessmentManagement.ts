import { supabase } from './supabase';

export interface UnifiedAssessment {
  id: string;
  title: string;
  type: 'code' | 'case_study' | 'mcq';
  difficulty: string;
  tags: string[];
  created_at: string;
  usage_count: number;
  is_template: boolean;
  organization_id: string;
}

export interface AssessmentFilters {
  type?: 'code' | 'case_study' | 'mcq' | 'all';
  difficulty?: string;
  tags?: string[];
  search?: string;
  is_template?: boolean;
}

export interface BulkOperation {
  operation: 'delete' | 'duplicate' | 'tag';
  assessmentIds: string[];
  assessmentType: string;
  metadata?: any;
}

// Get all assessments with unified interface
export async function getAllAssessments(filters?: AssessmentFilters): Promise<UnifiedAssessment[]> {
  const assessments: UnifiedAssessment[] = [];
  
  // Helper function to apply filters
  const applyFilters = (query: any, tableName: string) => {
    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters?.is_template !== undefined) {
      query = query.eq('is_template', filters.is_template);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    return query;
  };

  try {
    // Fetch code assessments
    if (!filters?.type || filters.type === 'all' || filters.type === 'code') {
      let codeQuery = supabase
        .from('code_assessments')
        .select('id, title, difficulty, tags, created_at, usage_count, is_template, organization_id');
      
      codeQuery = applyFilters(codeQuery, 'code_assessments');
      
      const { data: codeAssessments, error: codeError } = await codeQuery;
      
      if (codeError) throw codeError;
      
      if (codeAssessments) {
        assessments.push(...codeAssessments.map(a => ({
          ...a,
          type: 'code' as const
        })));
      }
    }

    // Fetch case studies
    if (!filters?.type || filters.type === 'all' || filters.type === 'case_study') {
      let caseQuery = supabase
        .from('case_studies')
        .select('id, title, difficulty, tags, created_at, usage_count, is_template, organization_id');
      
      caseQuery = applyFilters(caseQuery, 'case_studies');
      
      const { data: caseStudies, error: caseError } = await caseQuery;
      
      if (caseError) throw caseError;
      
      if (caseStudies) {
        assessments.push(...caseStudies.map(a => ({
          ...a,
          type: 'case_study' as const
        })));
      }
    }

    // Fetch MCQ assessments
    if (!filters?.type || filters.type === 'all' || filters.type === 'mcq') {
      let mcqQuery = supabase
        .from('mcq_assessments')
        .select('id, title, tags, created_at, usage_count, is_template, organization_id');
      
      // MCQ doesn't have difficulty field, so we'll add a default
      if (filters?.search) {
        mcqQuery = mcqQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.tags && filters.tags.length > 0) {
        mcqQuery = mcqQuery.contains('tags', filters.tags);
      }
      if (filters?.is_template !== undefined) {
        mcqQuery = mcqQuery.eq('is_template', filters.is_template);
      }
      
      const { data: mcqAssessments, error: mcqError } = await mcqQuery;
      
      if (mcqError) throw mcqError;
      
      if (mcqAssessments) {
        assessments.push(...mcqAssessments.map(a => ({
          ...a,
          type: 'mcq' as const,
          difficulty: 'medium' // Default difficulty for MCQ
        })));
      }
    }

    // Sort by creation date
    assessments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return assessments;
  } catch (error) {
    console.error('Error fetching assessments:', error);
    throw error;
  }
}

// Bulk delete assessments
export async function bulkDeleteAssessments(ids: string[], type: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('bulk_update_assessments', {
      assessment_ids: ids,
      assessment_type: type,
      operation: 'delete'
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error bulk deleting assessments:', error);
    throw error;
  }
}

// Bulk duplicate assessments
export async function bulkDuplicateAssessments(ids: string[], type: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('bulk_update_assessments', {
      assessment_ids: ids,
      assessment_type: type,
      operation: 'duplicate'
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error bulk duplicating assessments:', error);
    throw error;
  }
}

// Bulk tag assessments
export async function bulkTagAssessments(ids: string[], type: string, tags: string[]): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('bulk_update_assessments', {
      assessment_ids: ids,
      assessment_type: type,
      operation: 'tag',
      metadata: { tags }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error bulk tagging assessments:', error);
    throw error;
  }
}

// Convert assessment to template
export async function convertToTemplate(
  id: string, 
  type: string, 
  templateName: string,
  description?: string,
  category?: string,
  tags?: string[],
  isPublic?: boolean
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('create_assessment_template', {
      p_assessment_id: id,
      p_assessment_type: type,
      p_template_name: templateName,
      p_description: description || null,
      p_category: category || null,
      p_tags: tags || [],
      p_is_public: isPublic || false
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error converting to template:', error);
    throw error;
  }
}

// Get all available tags
export async function getAllTags(): Promise<string[]> {
  try {
    const tags = new Set<string>();
    
    // Get tags from all assessment types
    const tables = ['code_assessments', 'case_studies', 'mcq_assessments'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('tags')
        .not('tags', 'is', null);
      
      if (error) throw error;
      
      if (data) {
        data.forEach(item => {
          if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => tags.add(tag));
          }
        });
      }
    }
    
    return Array.from(tags).sort();
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
}

// Delete single assessment
export async function deleteAssessment(id: string, type: string): Promise<void> {
  try {
    let table = '';
    switch (type) {
      case 'code':
        table = 'code_assessments';
        break;
      case 'case_study':
        table = 'case_studies';
        break;
      case 'mcq':
        table = 'mcq_assessments';
        break;
      default:
        throw new Error('Invalid assessment type');
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting assessment:', error);
    throw error;
  }
}

// Duplicate single assessment
export async function duplicateAssessment(id: string, type: string): Promise<string> {
  try {
    let table = '';
    let selectFields = '';
    
    switch (type) {
      case 'code':
        table = 'code_assessments';
        selectFields = 'title, description, problem_statement, starter_code, solution_code, test_cases, difficulty, time_limit, language, organization_id, tags';
        break;
      case 'case_study':
        table = 'case_studies';
        selectFields = 'title, description, scenario, tasks, evaluation_criteria, difficulty, time_limit, organization_id, tags';
        break;
      case 'mcq':
        table = 'mcq_assessments';
        selectFields = 'title, description, passing_score, time_limit, randomize_questions, show_explanations, organization_id, tags';
        break;
      default:
        throw new Error('Invalid assessment type');
    }

    // Get the original assessment
    const { data: original, error: fetchError } = await supabase
      .from(table)
      .select(selectFields)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!original) throw new Error('Assessment not found');

    // Create a copy with modified title
    const copy = {
      ...(original as any),
      title: `${(original as any).title} (Copy)`
    };

    const { data: newAssessment, error: insertError } = await supabase
      .from(table)
      .insert(copy)
      .select('id')
      .single();

    if (insertError) throw insertError;
    if (!newAssessment) throw new Error('Failed to create duplicate');

    return newAssessment.id;
  } catch (error) {
    console.error('Error duplicating assessment:', error);
    throw error;
  }
}
