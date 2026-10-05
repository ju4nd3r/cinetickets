import { describe, it, expect } from 'vitest';
import {
  HealthResponseSchema,
  ApiErrorResponseSchema,
  ErrorCode,
  MovieSchema,
  CinemaSchema,
  HallSchema,
  SeatSchema,
  ShowtimeSchema,
  FoodItemSchema,
  TicketTypeSchema,
  CreateHoldRequestSchema,
  CreateOrderRequestSchema,
  PaymentRequestSchema,
  TICKET_TYPES,
  MAX_SEATS_PER_ORDER,
} from '../index.js';

describe('Shared Schemas & Validations', () => {
  describe('Health and Errors', () => {
    it('validates a correct HealthResponse', () => {
      const valid = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: { database: 'up', redis: 'up' },
      };
      expect(HealthResponseSchema.safeParse(valid).success).toBe(true);
    });

    it('validates ApiErrorResponse', () => {
      const err = {
        error: {
          code: ErrorCode.SEAT_UNAVAILABLE,
          message: 'Asiento ocupado',
          details: { seatId: 'seat-1' },
        },
      };
      expect(ApiErrorResponseSchema.safeParse(err).success).toBe(true);
    });
  });

  describe('Movie Schema', () => {
    const validMovie = {
      id: 'movie-1',
      title: 'Inception',
      originalTitle: 'Inception',
      director: 'Christopher Nolan',
      cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
      synopsis: 'A thief who steals corporate secrets through dream-sharing technology.',
      genres: ['Sci-Fi', 'Action'],
      durationMin: 148,
      rating: 'PG-13',
      language: 'Inglés',
      subtitles: ['Español'],
      releaseDate: '2010-07-16',
      posterUrl: 'https://images.example.com/poster.jpg',
      trailerUrl: 'https://youtube.com/watch?v=8hP9D6kZseM',
      score: 8.8,
      country: 'Estados Unidos',
      year: 2010,
    };

    it('accepts valid movie data', () => {
      expect(MovieSchema.safeParse(validMovie).success).toBe(true);
    });

    it('rejects movie with invalid score (>10)', () => {
      expect(MovieSchema.safeParse({ ...validMovie, score: 12 }).success).toBe(false);
    });

    it('rejects movie with invalid URL', () => {
      expect(MovieSchema.safeParse({ ...validMovie, posterUrl: 'not-url' }).success).toBe(false);
    });
  });

  describe('Cinema & Hall & Seat Schemas', () => {
    it('validates Cinema schema', () => {
      const cinema = {
        id: 'cin-1',
        name: 'CineTickets Central',
        address: 'Av. Corrientes 1234',
        city: 'Buenos Aires',
        timezone: 'America/Argentina/Buenos_Aires',
        amenities: ['Estacionamiento', 'IMAX', 'Cafetería'],
      };
      expect(CinemaSchema.safeParse(cinema).success).toBe(true);
    });

    it('validates Hall schema with valid format', () => {
      const hall = {
        id: 'hall-1',
        cinemaId: 'cin-1',
        name: 'Sala 1 - IMAX',
        format: 'IMAX',
        rows: 10,
        cols: 14,
      };
      expect(HallSchema.safeParse(hall).success).toBe(true);
    });

    it('rejects Hall with invalid format', () => {
      const hall = {
        id: 'hall-1',
        cinemaId: 'cin-1',
        name: 'Sala 1',
        format: '4DX', // Not in enum
        rows: 10,
        cols: 14,
      };
      expect(HallSchema.safeParse(hall).success).toBe(false);
    });

    it('validates Seat schema', () => {
      const seat = {
        id: 'seat-1',
        hallId: 'hall-1',
        row: 'F',
        number: 7,
        type: 'vip',
        x: 6,
        y: 5,
      };
      expect(SeatSchema.safeParse(seat).success).toBe(true);
    });
  });

  describe('Showtime & Pricing Schemas', () => {
    it('validates Showtime with cents integers', () => {
      const showtime = {
        id: 'st-1',
        movieId: 'mov-1',
        hallId: 'hall-1',
        startsAt: '2026-10-06T20:00:00Z',
        language: 'Subtitulada',
        format: 'IMAX',
        priceStandardCents: 450000,
        priceVipCents: 600000,
        priceAccessibleCents: 350000,
      };
      expect(ShowtimeSchema.safeParse(showtime).success).toBe(true);
    });

    it('rejects Showtime with negative price', () => {
      const showtime = {
        id: 'st-1',
        movieId: 'mov-1',
        hallId: 'hall-1',
        startsAt: '2026-10-06T20:00:00Z',
        language: 'Subtitulada',
        format: '2D',
        priceStandardCents: -100,
        priceVipCents: 500,
        priceAccessibleCents: 400,
      };
      expect(ShowtimeSchema.safeParse(showtime).success).toBe(false);
    });
  });

  describe('Food & Ticket Types', () => {
    it('validates FoodItem schema', () => {
      const food = {
        id: 'food-1',
        name: 'Combo Mega Palomitas + 2 Bebidas',
        description: 'Balde de palomitas saladas o dulces más 2 gaseosas medianas',
        category: 'combo',
        priceCents: 120000,
        imageUrl: 'https://images.example.com/combo1.jpg',
        sizes: ['Mediano', 'Grande'],
        available: true,
      };
      expect(FoodItemSchema.safeParse(food).success).toBe(true);
    });

    it('verifies standard TicketTypes discounts', () => {
      expect(TICKET_TYPES.length).toBe(4);
      const adult = TICKET_TYPES.find((t) => t.id === 'adult');
      const child = TICKET_TYPES.find((t) => t.id === 'child');
      const senior = TICKET_TYPES.find((t) => t.id === 'senior');
      const student = TICKET_TYPES.find((t) => t.id === 'student');

      expect(adult?.discountPct).toBe(0);
      expect(child?.discountPct).toBe(30);
      expect(senior?.discountPct).toBe(25);
      expect(student?.discountPct).toBe(15);

      TICKET_TYPES.forEach((tt) => {
        expect(TicketTypeSchema.safeParse(tt).success).toBe(true);
      });
    });
  });

  describe('Holds, Orders and Payment', () => {
    it('accepts hold request with 1 to 10 seats', () => {
      expect(CreateHoldRequestSchema.safeParse({ seatIds: ['s1', 's2'] }).success).toBe(true);
    });

    it('rejects hold request with 0 seats', () => {
      expect(CreateHoldRequestSchema.safeParse({ seatIds: [] }).success).toBe(false);
    });

    it('rejects hold request with more than 10 seats', () => {
      const elevenSeats = Array.from({ length: MAX_SEATS_PER_ORDER + 1 }, (_, i) => `seat-${i}`);
      expect(CreateHoldRequestSchema.safeParse({ seatIds: elevenSeats }).success).toBe(false);
    });

    it('validates Order Creation schema', () => {
      const orderReq = {
        holdId: 'hold-123',
        showtimeId: 'st-456',
        seats: [
          { seatId: 's1', ticketTypeId: 'adult' },
          { seatId: 's2', ticketTypeId: 'student' },
        ],
        food: [{ foodItemId: 'f1', qty: 2, size: 'Grande' }],
      };
      expect(CreateOrderRequestSchema.safeParse(orderReq).success).toBe(true);
    });

    it('validates Payment Request schema', () => {
      const paymentReq = {
        paymentMethod: {
          cardNumber: '4111111111111234',
          cardHolderName: 'Juan Perez',
          expMonth: 12,
          expYear: 2028,
          cvv: '123',
        },
      };
      expect(PaymentRequestSchema.safeParse(paymentReq).success).toBe(true);
    });
  });
});
