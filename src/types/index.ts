export type OrderStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Job Done'
  | 'Reviewed'
  | 'Closed';

export type Role = 'admin' | 'technician' | 'manager';

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'E-Wallet';

export interface Technician {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
}

/** Technician enriched with live workload data for the assignment map */
export interface TechnicianWithWorkload extends Technician {
  latitude: number | null;
  longitude: number | null;
  activeOrders: number;
  inProgressOrders: number;
  workStatus: 'Idle' | 'On the way' | 'On-site';
}

export interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  problem_description: string;
  service_type: string;
  quoted_price: number;
  assigned_technician_id: string | null;
  status: OrderStatus;
  admin_notes: string;
  preferred_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  latitude?: number | null;
  longitude?: number | null;
  technician?: Technician;
}

export interface JobCompletion {
  id: string;
  order_id: string;
  technician_id: string;
  work_done: string;
  extra_charges: number;
  final_amount: number;
  remarks: string;
  completed_at: string;
  payment_amount: number | null;
  payment_method: PaymentMethod | null;
  receipt_photo_url: string | null;
  payment_remarks: string | null;
}

export interface JobPhoto {
  id: string;
  order_id: string;
  storage_path: string;
  public_url: string;
  uploaded_at: string;
  uploaded_by: string;
  file_type: string;
}

export interface AuditLog {
  id: string;
  order_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_role: string;
  actor_name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ManagerReview {
  id: string;
  order_id: string;
  reviewed_by: string;
  review_notes: string;
  outcome: 'Approved' | 'Flagged';
  reviewed_at: string;
}

export interface AIFlag {
  type: 'price_mismatch' | 'no_photos' | 'fast_completion';
  severity: 'warning' | 'critical';
  message: string;
}

export interface WorkflowSupervisorResult {
  flags: AIFlag[];
  summary: string;
}

export interface MockUser {
  role: Role;
  name: string;
  technicianId?: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  problem_description: string;
  service_type: string;
  quoted_price: number;
  assigned_technician_id: string | null;
  admin_notes: string;
  preferred_date: string | null;
  created_by: string;
}

export interface CreateCompletionInput {
  order_id: string;
  technician_id: string;
  work_done: string;
  extra_charges: number;
  final_amount: number;
  remarks: string;
  payment_amount: number | null;
  payment_method: PaymentMethod | null;
  receipt_photo_url: string | null;
}

export interface OrderFilters {
  status?: OrderStatus;
  technician_id?: string;
}
