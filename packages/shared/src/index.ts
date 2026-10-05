import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string(),
  services: z.object({
    database: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ErrorCode = {
  SEAT_UNAVAILABLE: 'SEAT_UNAVAILABLE',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const HOLD_TTL_SECONDS = 480; // 8 minutes
export const SERVICE_FEE_PERCENTAGE = 0.05; // 5%
export const MAX_SEATS_PER_ORDER = 10;
