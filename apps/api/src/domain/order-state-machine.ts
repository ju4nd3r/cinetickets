import { OrderStatus } from '@cinetickets/shared';
import { InvalidOrderStateError } from './errors.js';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['SEATS_HELD', 'CANCELLED'],
  SEATS_HELD: ['PAYMENT_PENDING', 'EXPIRED', 'CANCELLED'],
  PAYMENT_PENDING: ['CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED'],
  CONFIRMED: [],
  EXPIRED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransitionOrder(current: OrderStatus, target: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function transitionOrder(current: OrderStatus, target: OrderStatus): OrderStatus {
  if (!canTransitionOrder(current, target)) {
    throw new InvalidOrderStateError(current, target);
  }
  return target;
}
