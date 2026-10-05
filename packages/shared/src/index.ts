import { z } from 'zod';

// ==========================================
// CONSTANTS & ENUMS
// ==========================================

export const HOLD_TTL_SECONDS = 480; // 8 minutes
export const SERVICE_FEE_PERCENTAGE = 0.05; // 5%
export const MAX_SEATS_PER_ORDER = 10;

export const HallFormatEnum = z.enum(['2D', '3D', 'IMAX', 'VIP']);
export type HallFormat = z.infer<typeof HallFormatEnum>;

export const SeatTypeEnum = z.enum(['standard', 'vip', 'accessible']);
export type SeatType = z.infer<typeof SeatTypeEnum>;

export const SeatStatusEnum = z.enum(['available', 'held', 'occupied', 'selected']);
export type SeatStatus = z.infer<typeof SeatStatusEnum>;

export const FoodCategoryEnum = z.enum(['combo', 'popcorn', 'drink', 'candy']);
export type FoodCategory = z.infer<typeof FoodCategoryEnum>;

export const OrderStatusEnum = z.enum([
  'DRAFT',
  'SEATS_HELD',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'EXPIRED',
  'FAILED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const ErrorCode = {
  SEAT_UNAVAILABLE: 'SEAT_UNAVAILABLE',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
} as const;
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export const TICKET_TYPES = [
  { id: 'adult', label: 'Adulto', discountPct: 0 },
  { id: 'child', label: 'Niño', discountPct: 30 },
  { id: 'senior', label: 'Senior (60+)', discountPct: 25 },
  { id: 'student', label: 'Estudiante', discountPct: 15 },
] as const;

// ==========================================
// SCHEMAS & TYPES
// ==========================================

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string(),
  services: z.object({
    database: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']),
  }),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// User
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
});
export type User = z.infer<typeof UserSchema>;

// Movie
export const MovieSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  originalTitle: z.string().optional().nullable(),
  director: z.string().min(1),
  cast: z.array(z.string()),
  synopsis: z.string().min(1),
  genres: z.array(z.string()),
  durationMin: z.number().int().positive(),
  rating: z.string().min(1),
  language: z.string().min(1),
  subtitles: z.array(z.string()),
  releaseDate: z.string(),
  posterUrl: z.string().url(),
  trailerUrl: z.string().url().optional().nullable(),
  score: z.number().min(0).max(10),
  country: z.string().min(1),
  year: z.number().int(),
});
export type Movie = z.infer<typeof MovieSchema>;

// Cinema
export const CinemaSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  timezone: z.string().min(1),
  amenities: z.array(z.string()),
});
export type Cinema = z.infer<typeof CinemaSchema>;

// Hall
export const HallSchema = z.object({
  id: z.string(),
  cinemaId: z.string(),
  name: z.string().min(1),
  format: HallFormatEnum,
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
});
export type Hall = z.infer<typeof HallSchema>;

// Seat
export const SeatSchema = z.object({
  id: z.string(),
  hallId: z.string(),
  row: z.string().min(1),
  number: z.number().int().positive(),
  type: SeatTypeEnum,
  x: z.number(),
  y: z.number(),
});
export type Seat = z.infer<typeof SeatSchema>;

// Showtime
export const ShowtimeSchema = z.object({
  id: z.string(),
  movieId: z.string(),
  hallId: z.string(),
  startsAt: z.string(), // ISO UTC
  language: z.string(),
  format: HallFormatEnum,
  priceStandardCents: z.number().int().nonnegative(),
  priceVipCents: z.number().int().nonnegative(),
  priceAccessibleCents: z.number().int().nonnegative(),
  hall: HallSchema.optional(),
  cinema: CinemaSchema.optional(),
  movie: MovieSchema.optional(),
});
export type Showtime = z.infer<typeof ShowtimeSchema>;

// Food Item
export const FoodItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  category: FoodCategoryEnum,
  priceCents: z.number().int().positive(),
  imageUrl: z.string().url(),
  sizes: z.array(z.string()).optional().nullable(),
  available: z.boolean(),
});
export type FoodItem = z.infer<typeof FoodItemSchema>;

// Ticket Type
export const TicketTypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  discountPct: z.number().min(0).max(100),
});
export type TicketType = z.infer<typeof TicketTypeSchema>;

// Seat in map with real-time status
export const SeatWithStatusSchema = SeatSchema.extend({
  status: SeatStatusEnum,
});
export type SeatWithStatus = z.infer<typeof SeatWithStatusSchema>;

export const HallSeatMapSchema = z.object({
  hall: HallSchema,
  showtime: ShowtimeSchema,
  seats: z.array(SeatWithStatusSchema),
});
export type HallSeatMap = z.infer<typeof HallSeatMapSchema>;

// Holds
export const CreateHoldRequestSchema = z.object({
  seatIds: z.array(z.string()).min(1).max(MAX_SEATS_PER_ORDER),
});
export type CreateHoldRequest = z.infer<typeof CreateHoldRequestSchema>;

export const HoldResponseSchema = z.object({
  holdId: z.string(),
  showtimeId: z.string(),
  seatIds: z.array(z.string()),
  expiresAt: z.string(),
});
export type HoldResponse = z.infer<typeof HoldResponseSchema>;

// Order & Items
export const OrderSeatItemSchema = z.object({
  seatId: z.string(),
  ticketTypeId: z.string(),
  priceCents: z.number().int().nonnegative().optional(),
});
export type OrderSeatItem = z.infer<typeof OrderSeatItemSchema>;

export const OrderFoodItemSchema = z.object({
  foodItemId: z.string(),
  size: z.string().optional().nullable(),
  qty: z.number().int().positive(),
  priceCents: z.number().int().nonnegative().optional(),
});
export type OrderFoodItem = z.infer<typeof OrderFoodItemSchema>;

export const CreateOrderRequestSchema = z.object({
  holdId: z.string(),
  showtimeId: z.string(),
  userId: z.string().optional(),
  customer: z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
    })
    .optional(),
  seats: z.array(OrderSeatItemSchema).min(1).max(MAX_SEATS_PER_ORDER),
  food: z.array(OrderFoodItemSchema).default([]),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const OrderSeatSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  showtimeId: z.string(),
  seatId: z.string(),
  ticketTypeId: z.string(),
  priceCents: z.number().int().nonnegative(),
  seat: SeatSchema.optional(),
  ticketType: TicketTypeSchema.optional(),
});
export type OrderSeat = z.infer<typeof OrderSeatSchema>;

export const OrderFoodSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  foodItemId: z.string(),
  size: z.string().optional().nullable(),
  qty: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  foodItem: FoodItemSchema.optional(),
});
export type OrderFood = z.infer<typeof OrderFoodSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  showtimeId: z.string(),
  status: OrderStatusEnum,
  subtotalCents: z.number().int().nonnegative(),
  feesCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  holdExpiresAt: z.string(),
  idempotencyKey: z.string(),
  qrCode: z.string().optional().nullable(),
  createdAt: z.string(),
  seats: z.array(OrderSeatSchema).optional(),
  food: z.array(OrderFoodSchema).optional(),
  showtime: ShowtimeSchema.optional(),
  user: UserSchema.optional(),
});
export type Order = z.infer<typeof OrderSchema>;

// Payment
export const PaymentRequestSchema = z.object({
  paymentMethod: z.object({
    cardNumber: z.string().min(12).max(19),
    cardHolderName: z.string().min(2),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(2024).max(2050),
    cvv: z.string().min(3).max(4),
  }),
});
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

export const PaymentResponseSchema = z.object({
  orderId: z.string(),
  status: OrderStatusEnum,
  qrCode: z.string().optional().nullable(),
  message: z.string(),
});
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

// Cinema Grouped Showtimes for Movie Detail
export const CinemaShowtimesGroupSchema = z.object({
  cinema: CinemaSchema,
  showtimes: z.array(ShowtimeSchema),
});
export type CinemaShowtimesGroup = z.infer<typeof CinemaShowtimesGroupSchema>;
