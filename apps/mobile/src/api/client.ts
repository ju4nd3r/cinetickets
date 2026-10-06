import {
  Movie,
  MovieSchema,
  CinemaShowtimesGroup,
  CinemaShowtimesGroupSchema,
  HallSeatMap,
  HallSeatMapSchema,
  HoldResponse,
  HoldResponseSchema,
  FoodItem,
  FoodItemSchema,
  TicketType,
  TicketTypeSchema,
  Order,
  OrderSchema,
  PaymentResponse,
  PaymentResponseSchema,
  CreateOrderRequest,
  PaymentRequest,
} from '@cinetickets/shared';
import { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    const raw = baseUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const clean = raw.replace(/\/+$/, '');
    this.baseUrl = clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }

  setBaseUrl(url: string) {
    const clean = url.replace(/\/+$/, '');
    this.baseUrl = clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    schema?: z.ZodType<T>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let code = 'NETWORK_ERROR';
      let message = `Error del servidor HTTP ${res.status}`;
      let details: unknown = undefined;

      try {
        const body = await res.json();
        if (body?.error) {
          code = body.error.code || code;
          message = body.error.message || message;
          details = body.error.details;
        }
      } catch {
        // Fallback al statusText
        message = res.statusText || message;
      }

      throw new ApiError(code, message, res.status, details);
    }

    const json = await res.json();
    if (schema) {
      return schema.parse(json);
    }
    return json as T;
  }

  // --- Películas & Catálogo ---
  async getMovies(params?: {
    search?: string;
    genre?: string;
    cinemaId?: string;
    format?: string;
  }): Promise<Movie[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.genre) searchParams.set('genre', params.genre);
    if (params?.cinemaId) searchParams.set('cinemaId', params.cinemaId);
    if (params?.format) searchParams.set('format', params.format);

    const query = searchParams.toString();
    const endpoint = `/movies${query ? `?${query}` : ''}`;
    return this.request(endpoint, { method: 'GET' }, z.array(MovieSchema));
  }

  async getMovie(id: string): Promise<Movie> {
    return this.request(`/movies/${id}`, { method: 'GET' }, MovieSchema);
  }

  async getMovieShowtimes(movieId: string, date: string): Promise<CinemaShowtimesGroup[]> {
    return this.request(
      `/movies/${movieId}/showtimes?date=${encodeURIComponent(date)}`,
      { method: 'GET' },
      z.array(CinemaShowtimesGroupSchema),
    );
  }

  async getSeatMap(showtimeId: string): Promise<HallSeatMap> {
    return this.request(`/showtimes/${showtimeId}/seats`, { method: 'GET' }, HallSeatMapSchema);
  }

  async getFoodItems(category?: string): Promise<FoodItem[]> {
    const endpoint = `/food${category ? `?category=${encodeURIComponent(category)}` : ''}`;
    return this.request(endpoint, { method: 'GET' }, z.array(FoodItemSchema));
  }

  async getTicketTypes(): Promise<TicketType[]> {
    return this.request('/ticket-types', { method: 'GET' }, z.array(TicketTypeSchema));
  }

  // --- Holds & Órdenes ---
  async createHold(showtimeId: string, seatIds: string[]): Promise<HoldResponse> {
    return this.request(
      `/showtimes/${showtimeId}/holds`,
      {
        method: 'POST',
        body: JSON.stringify({ seatIds }),
      },
      HoldResponseSchema,
    );
  }

  async releaseHold(holdId: string): Promise<{ success: boolean }> {
    return this.request(`/holds/${holdId}`, { method: 'DELETE' });
  }

  async createOrder(data: CreateOrderRequest, idempotencyKey: string): Promise<Order> {
    return this.request(
      '/orders',
      {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(data),
      },
      OrderSchema,
    );
  }

  async payOrder(
    orderId: string,
    paymentMethod: PaymentRequest['paymentMethod'],
    idempotencyKey: string,
  ): Promise<PaymentResponse> {
    return this.request(
      `/orders/${orderId}/pay`,
      {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ paymentMethod }),
      },
      PaymentResponseSchema,
    );
  }

  async getOrders(userId?: string): Promise<Order[]> {
    const endpoint = `/orders${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`;
    return this.request(endpoint, { method: 'GET' }, z.array(OrderSchema));
  }

  async getOrder(id: string): Promise<Order> {
    return this.request(`/orders/${id}`, { method: 'GET' }, OrderSchema);
  }
}

export const apiClient = new ApiClient();
