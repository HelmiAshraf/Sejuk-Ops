import type { MockUser, OrderStatus } from '../types';

export const SERVICE_TYPES = [
  'AC Cleaning',
  'AC Repair',
  'Gas Refill',
  'AC Installation',
  'Inspection',
];

export const ORDER_STATUSES: OrderStatus[] = [
  'New',
  'Assigned',
  'In Progress',
  'Job Done',
  'Reviewed',
  'Closed',
];

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'E-Wallet'] as const;

// These IDs must match what is seeded in the database (003_seed_data.sql)
export const TECHNICIAN_IDS = {
  Ali: 'a1000000-0000-0000-0000-000000000001',
  John: 'a1000000-0000-0000-0000-000000000002',
  Bala: 'a1000000-0000-0000-0000-000000000003',
  Yusoff: 'a1000000-0000-0000-0000-000000000004',
};

export const MOCK_USERS: MockUser[] = [
  { role: 'admin', name: 'Admin Farid' },
  { role: 'manager', name: 'Manager Helmi' },
  { role: 'technician', name: 'Ali', technicianId: TECHNICIAN_IDS.Ali },
  { role: 'technician', name: 'John', technicianId: TECHNICIAN_IDS.John },
  { role: 'technician', name: 'Bala', technicianId: TECHNICIAN_IDS.Bala },
  { role: 'technician', name: 'Yusoff', technicianId: TECHNICIAN_IDS.Yusoff },
];

export const STATUS_COLORS: Record<OrderStatus, string> = {
  New: 'bg-gray-100 text-gray-700',
  Assigned: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  'Job Done': 'bg-green-100 text-green-700',
  Reviewed: 'bg-purple-100 text-purple-700',
  Closed: 'bg-gray-200 text-gray-500',
};
