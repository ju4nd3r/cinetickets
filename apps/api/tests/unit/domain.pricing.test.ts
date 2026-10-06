import { describe, it, expect } from 'vitest';
import { calculateSeatPrice, calculateOrderPricing } from '../../src/domain/pricing.js';
import { ValidationError } from '../../src/domain/errors.js';

describe('Domain: Pricing & Fees Rules', () => {
  describe('calculateSeatPrice', () => {
    it('applies adult 0% discount without price reduction', () => {
      const price = calculateSeatPrice(500000, 0);
      expect(price).toBe(500000);
    });

    it('applies child 30% discount with correct cent rounding', () => {
      const price = calculateSeatPrice(500000, 30);
      expect(price).toBe(350000);
    });

    it('applies senior 25% discount with correct cent rounding', () => {
      const price = calculateSeatPrice(500000, 25);
      expect(price).toBe(375000);
    });

    it('applies student 15% discount with correct cent rounding', () => {
      const price = calculateSeatPrice(500000, 15);
      expect(price).toBe(425000);
    });

    it('rounds odd cent fractions accurately to nearest integer cent', () => {
      // 555555 * (1 - 0.15) = 472221.75 -> Math.round -> 472222
      const price = calculateSeatPrice(555555, 15);
      expect(price).toBe(472222);
    });

    it('throws on negative base price', () => {
      expect(() => calculateSeatPrice(-100, 10)).toThrow(ValidationError);
    });

    it('throws on invalid discount percentage (>100 or <0)', () => {
      expect(() => calculateSeatPrice(1000, -5)).toThrow(ValidationError);
      expect(() => calculateSeatPrice(1000, 105)).toThrow(ValidationError);
    });
  });

  describe('calculateOrderPricing', () => {
    it('calculates seats, food, 5% service fee and total correctly', () => {
      // 2 adult standard seats ($50.00 each = 5000 cents each)
      // 1 student standard seat ($50.00 with 15% off = 4250 cents)
      // subtotalEntradas = 5000 + 5000 + 4250 = 14250 cents
      // 2 combos ($15.00 each = 1500 cents * 2 = 3000 cents)
      // subtotal = 14250 + 3000 = 17250 cents
      // serviceFee = round(14250 * 0.05) = round(712.5) = 713 cents
      // total = 17250 + 713 = 17963 cents
      const seats = [
        { basePriceCents: 5000, discountPct: 0 },
        { basePriceCents: 5000, discountPct: 0 },
        { basePriceCents: 5000, discountPct: 15 },
      ];
      const food = [{ priceCents: 1500, qty: 2 }];

      const result = calculateOrderPricing(seats, food);

      expect(result.seatPrices).toEqual([5000, 5000, 4250]);
      expect(result.subtotalEntradasCents).toBe(14250);
      expect(result.subtotalComidaCents).toBe(3000);
      expect(result.subtotalCents).toBe(17250);
      expect(result.feesCents).toBe(713);
      expect(result.totalCents).toBe(17963);
    });

    it('calculates order with 0 food items', () => {
      const seats = [{ basePriceCents: 6000, discountPct: 0 }];
      const result = calculateOrderPricing(seats, []);

      expect(result.subtotalEntradasCents).toBe(6000);
      expect(result.subtotalComidaCents).toBe(0);
      expect(result.subtotalCents).toBe(6000);
      expect(result.feesCents).toBe(300); // 6000 * 0.05 = 300
      expect(result.totalCents).toBe(6300);
    });

    it('throws if order contains 0 seats', () => {
      expect(() => calculateOrderPricing([], [{ priceCents: 100, qty: 1 }])).toThrow(
        ValidationError,
      );
    });

    it('throws if food quantity is 0 or negative', () => {
      const seats = [{ basePriceCents: 5000, discountPct: 0 }];
      expect(() => calculateOrderPricing(seats, [{ priceCents: 500, qty: 0 }])).toThrow(
        ValidationError,
      );
    });

    it('throws if food price is negative', () => {
      const seats = [{ basePriceCents: 5000, discountPct: 0 }];
      expect(() => calculateOrderPricing(seats, [{ priceCents: -500, qty: 1 }])).toThrow(
        ValidationError,
      );
    });
  });
});
