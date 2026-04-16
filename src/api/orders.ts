import { supabase } from '../lib/supabase';
import { canTransition } from '../lib/statusMachine';
import type { Order, CreateOrderInput, OrderFilters, OrderStatus, Role } from '../types';
import { logAction } from './audit';

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  const { data: order, error } = await supabase
    .from('orders')
    .insert(data)
    .select('*, technician:technicians(*)')
    .single();
  if (error) throw error;

  await logAction({
    order_id: order.id,
    action: 'ORDER_CREATED',
    from_status: null,
    to_status: 'New',
    actor_role: 'admin',
    actor_name: data.created_by,
    metadata: { service_type: data.service_type },
  });

  return order;
}

export async function getOrders(filters: OrderFilters = {}): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*, technician:technicians(*)')
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.technician_id) query = query.eq('assigned_technician_id', filters.technician_id);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getOrderById(id: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, technician:technicians(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function assignTechnician(
  orderId: string,
  technicianId: string,
  actorName: string,
  currentStatus: OrderStatus
): Promise<void> {
  const toStatus: OrderStatus = 'Assigned';

  if (!canTransition(currentStatus, toStatus, 'admin')) {
    throw new Error(`Cannot transition from ${currentStatus} to ${toStatus}`);
  }

  const { error } = await supabase
    .from('orders')
    .update({ assigned_technician_id: technicianId, status: toStatus })
    .eq('id', orderId);
  if (error) throw error;

  await logAction({
    order_id: orderId,
    action: 'TECHNICIAN_ASSIGNED',
    from_status: currentStatus,
    to_status: toStatus,
    actor_role: 'admin',
    actor_name: actorName,
    metadata: { technician_id: technicianId },
  });
}

export async function updateServiceDetails(
  orderId: string,
  details: { service_type: string; quoted_price: number; problem_description: string; admin_notes: string },
  actorName: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update(details)
    .eq('id', orderId);
  if (error) throw error;

  await logAction({
    order_id: orderId,
    action: 'SERVICE_DETAILS_UPDATED',
    from_status: null,
    to_status: null,
    actor_role: 'admin',
    actor_name: actorName,
    metadata: { service_type: details.service_type, quoted_price: details.quoted_price },
  });
}

export async function updateCustomerDetails(
  orderId: string,
  details: { customer_name: string; customer_phone: string; customer_address: string },
  actorName: string,
  actorRole: Role
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update(details)
    .eq('id', orderId);
  if (error) throw error;

  await logAction({
    order_id: orderId,
    action: 'CUSTOMER_DETAILS_UPDATED',
    from_status: null,
    to_status: null,
    actor_role: actorRole,
    actor_name: actorName,
    metadata: null,
  });
}

export async function updateOrderStatus(
  orderId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  role: Role,
  actorName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!canTransition(fromStatus, toStatus, role)) {
    throw new Error(`Cannot transition from ${fromStatus} to ${toStatus} as ${role}`);
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: toStatus })
    .eq('id', orderId);
  if (error) throw error;

  await logAction({
    order_id: orderId,
    action: 'STATUS_CHANGED',
    from_status: fromStatus,
    to_status: toStatus,
    actor_role: role,
    actor_name: actorName,
    metadata: metadata ?? null,
  });
}
