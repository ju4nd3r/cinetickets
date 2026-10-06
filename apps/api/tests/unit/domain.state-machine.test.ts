import { describe, it, expect } from 'vitest';
import { transitionOrder, canTransitionOrder } from '../../src/domain/order-state-machine.js';
import { InvalidOrderStateError } from '../../src/domain/errors.js';

describe('Domain: Order State Machine', () => {
  describe('Valid transitions', () => {
    it('transitions DRAFT -> SEATS_HELD', () => {
      expect(transitionOrder('DRAFT', 'SEATS_HELD')).toBe('SEATS_HELD');
    });

    it('transitions SEATS_HELD -> PAYMENT_PENDING', () => {
      expect(transitionOrder('SEATS_HELD', 'PAYMENT_PENDING')).toBe('PAYMENT_PENDING');
    });

    it('transitions SEATS_HELD -> EXPIRED', () => {
      expect(transitionOrder('SEATS_HELD', 'EXPIRED')).toBe('EXPIRED');
    });

    it('transitions SEATS_HELD -> CANCELLED', () => {
      expect(transitionOrder('SEATS_HELD', 'CANCELLED')).toBe('CANCELLED');
    });

    it('transitions PAYMENT_PENDING -> CONFIRMED', () => {
      expect(transitionOrder('PAYMENT_PENDING', 'CONFIRMED')).toBe('CONFIRMED');
    });

    it('transitions PAYMENT_PENDING -> FAILED', () => {
      expect(transitionOrder('PAYMENT_PENDING', 'FAILED')).toBe('FAILED');
    });

    it('transitions PAYMENT_PENDING -> EXPIRED', () => {
      expect(transitionOrder('PAYMENT_PENDING', 'EXPIRED')).toBe('EXPIRED');
    });
  });

  describe('Invalid transitions', () => {
    it('rejects transitioning from terminal CONFIRMED state', () => {
      expect(canTransitionOrder('CONFIRMED', 'CANCELLED')).toBe(false);
      expect(() => transitionOrder('CONFIRMED', 'CANCELLED')).toThrow(InvalidOrderStateError);
    });

    it('rejects transitioning from terminal EXPIRED state', () => {
      expect(() => transitionOrder('EXPIRED', 'PAYMENT_PENDING')).toThrow(InvalidOrderStateError);
    });

    it('rejects transitioning from terminal FAILED state', () => {
      expect(() => transitionOrder('FAILED', 'CONFIRMED')).toThrow(InvalidOrderStateError);
    });

    it('rejects skipping states like DRAFT -> CONFIRMED', () => {
      expect(() => transitionOrder('DRAFT', 'CONFIRMED')).toThrow(InvalidOrderStateError);
    });
  });
});
