import { describe, it, expect } from 'vitest';
import { validateSeatSelection } from '../../src/domain/seats.js';
import { ValidationError } from '../../src/domain/errors.js';

describe('Domain: Seat Rules', () => {
  it('allows valid selection between 1 and 10 seats', () => {
    expect(() => validateSeatSelection(['seat-1', 'seat-2'])).not.toThrow();
    const tenSeats = Array.from({ length: 10 }, (_, i) => `seat-${i + 1}`);
    expect(() => validateSeatSelection(tenSeats)).not.toThrow();
  });

  it('rejects empty seat selection', () => {
    expect(() => validateSeatSelection([])).toThrow(ValidationError);
  });

  it('rejects selection with more than 10 seats', () => {
    const elevenSeats = Array.from({ length: 11 }, (_, i) => `seat-${i + 1}`);
    expect(() => validateSeatSelection(elevenSeats)).toThrow(ValidationError);
  });

  it('rejects duplicate seats in selection', () => {
    expect(() => validateSeatSelection(['seat-1', 'seat-2', 'seat-1'])).toThrow(ValidationError);
  });
});
