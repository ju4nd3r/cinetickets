import { describe, it, expect } from 'vitest';
import { HealthResponseSchema, ApiErrorResponseSchema, ErrorCode } from '../index.js';

describe('Shared Schemas & Constants', () => {
  it('should validate a valid HealthResponse', () => {
    const valid = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    };
    const result = HealthResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid HealthResponse', () => {
    const invalid = {
      status: 'unknown',
      timestamp: 'not-iso',
    };
    const result = HealthResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate ApiErrorResponse format', () => {
    const errorPayload = {
      error: {
        code: ErrorCode.SEAT_UNAVAILABLE,
        message: 'Seats are already taken',
      },
    };
    const result = ApiErrorResponseSchema.safeParse(errorPayload);
    expect(result.success).toBe(true);
  });
});
