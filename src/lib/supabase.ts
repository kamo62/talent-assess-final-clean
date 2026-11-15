import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  return userRoles?.some(role => role.roles.name === 'admin') ?? false;
}

export async function reorderAssessment(
  assessmentId: string,
  assessmentType: string,
  newPosition: number
) {
  const { data: currentOrder } = await supabase
    .from('assessment_order')
    .select('position')
    .eq('assessment_id', assessmentId)
    .eq('assessment_type', assessmentType)
    .single();

  if (!currentOrder) return;

  const currentPosition = currentOrder.position;

  if (currentPosition === newPosition) return;

  const increment = currentPosition < newPosition ? -1 : 1;
  const start = currentPosition < newPosition ? currentPosition : newPosition;
  const end = currentPosition < newPosition ? newPosition : currentPosition;

  await supabase.rpc('reorder_assessments', {
    p_assessment_id: assessmentId,
    p_assessment_type: assessmentType,
    p_new_position: newPosition,
    p_current_position: currentPosition
  });
}