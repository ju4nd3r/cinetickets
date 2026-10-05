import { describe, it, expect } from 'vitest';
import { createRng, SEED_NUMBER } from '../../prisma/seed.js';
import { TICKET_TYPES } from '@cinetickets/shared';

describe('Seed Determinism & Validation', () => {
  it('PRNG generates strictly identical sequence for seed 42', () => {
    const rng1 = createRng(SEED_NUMBER);
    const rng2 = createRng(SEED_NUMBER);

    const values1 = Array.from({ length: 50 }, () => rng1());
    const values2 = Array.from({ length: 50 }, () => rng2());

    expect(values1).toEqual(values2);
  });

  it('PRNG generates different sequences for different seeds', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(43);

    const val1 = rng1();
    const val2 = rng2();

    expect(val1).not.toEqual(val2);
  });

  it('Verifies required ticket types discounts', () => {
    const adult = TICKET_TYPES.find((t) => t.id === 'adult');
    const child = TICKET_TYPES.find((t) => t.id === 'child');
    const senior = TICKET_TYPES.find((t) => t.id === 'senior');
    const student = TICKET_TYPES.find((t) => t.id === 'student');

    expect(adult?.discountPct).toBe(0);
    expect(child?.discountPct).toBe(30);
    expect(senior?.discountPct).toBe(25);
    expect(student?.discountPct).toBe(15);
  });
});
