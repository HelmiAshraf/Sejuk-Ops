import type { OrderStatus, Role } from '../types';

type Transition = {
  to: OrderStatus;
  allowedRoles: Role[];
};

const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  New: [{ to: 'Assigned', allowedRoles: ['admin'] }],
  Assigned: [{ to: 'In Progress', allowedRoles: ['technician'] }],
  'In Progress': [{ to: 'Job Done', allowedRoles: ['technician'] }],
  'Job Done': [{ to: 'Reviewed', allowedRoles: ['manager'] }],
  Reviewed: [{ to: 'Closed', allowedRoles: ['admin', 'manager'] }],
  Closed: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus, role: Role): boolean {
  const allowed = TRANSITIONS[from] ?? [];
  return allowed.some((t) => t.to === to && t.allowedRoles.includes(role));
}

export function getNextStatuses(from: OrderStatus, role: Role): OrderStatus[] {
  return (TRANSITIONS[from] ?? [])
    .filter((t) => t.allowedRoles.includes(role))
    .map((t) => t.to);
}
