import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';

interface AuditLogEntry {
  order_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_role: string;
  actor_name: string;
  metadata?: Record<string, unknown> | null;
}

export async function logAction(entry: AuditLogEntry): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert(entry);
  if (error) console.error('Audit log failed:', error);
}

export async function getAuditLog(orderId: string): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
