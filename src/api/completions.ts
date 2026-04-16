import { supabase } from '../lib/supabase';
import type { JobCompletion, CreateCompletionInput } from '../types';

export async function createCompletion(data: CreateCompletionInput): Promise<JobCompletion> {
  const { data: completion, error } = await supabase
    .from('job_completions')
    .upsert(data, { onConflict: 'order_id' })
    .select()
    .single();
  if (error) throw error;
  return completion;
}

export async function getCompletionByOrderId(orderId: string): Promise<JobCompletion | null> {
  const { data, error } = await supabase
    .from('job_completions')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
