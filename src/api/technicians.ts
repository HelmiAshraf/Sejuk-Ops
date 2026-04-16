import { supabase } from '../lib/supabase';
import type { Technician, TechnicianWithWorkload } from '../types';

export async function getTechnicians(): Promise<Technician[]> {
  const { data, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/**
 * Returns active technicians enriched with live workload data:
 * how many "Assigned" or "In Progress" orders they currently have,
 * and a derived work status (Idle / On the way / On-site).
 */
export async function getTechniciansWithWorkload(): Promise<TechnicianWithWorkload[]> {
  const [techRes, ordersRes] = await Promise.all([
    supabase.from('technicians').select('*').eq('is_active', true).order('name'),
    supabase
      .from('orders')
      .select('assigned_technician_id, status')
      .in('status', ['Assigned', 'In Progress']),
  ]);
  if (techRes.error) throw techRes.error;

  const activeOrders = ordersRes.data ?? [];

  return (techRes.data ?? []).map(tech => {
    const mine = activeOrders.filter(o => o.assigned_technician_id === tech.id);
    const inProgress = mine.filter(o => o.status === 'In Progress').length;
    const total = mine.length;

    let workStatus: TechnicianWithWorkload['workStatus'];
    if (inProgress > 0) workStatus = 'On-site';
    else if (total > 0) workStatus = 'On the way';
    else workStatus = 'Idle';

    return {
      ...tech,
      latitude: tech.latitude ?? null,
      longitude: tech.longitude ?? null,
      activeOrders: total,
      inProgressOrders: inProgress,
      workStatus,
    };
  });
}
