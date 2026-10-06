import {
  Clock,
  MovieRepository,
  ShowtimeRepository,
  SeatHoldStore,
  OrderRepository,
  PaymentGateway,
  CatalogRepository,
  CreateOrderData,
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '../../../src/application/ports/index.js';
import {
  Movie,
  Showtime,
  CinemaShowtimesGroup,
  HallSeatMap,
  Order,
  OrderStatus,
  FoodItem,
  TicketType,
} from '@cinetickets/shared';
import { SeatUnavailableError } from '../../../src/domain/errors.js';

export class FakeClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: Date = new Date('2026-10-06T12:00:00Z')) {
    this.currentTime = new Date(initialTime);
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  advanceSeconds(seconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
  }

  advanceMinutes(minutes: number): void {
    this.advanceSeconds(minutes * 60);
  }

  advanceHours(hours: number): void {
    this.advanceMinutes(hours * 60);
  }

  setTime(time: Date): void {
    this.currentTime = new Date(time);
  }
}

export class InMemoryMovieRepository implements MovieRepository {
  public movies: Movie[] = [];

  async findById(id: string): Promise<Movie | null> {
    return this.movies.find((m) => m.id === id) || null;
  }

  async search(params: {
    search?: string;
    genre?: string;
    cinemaId?: string;
    format?: string;
  }): Promise<Movie[]> {
    return this.movies.filter((m) => {
      if (params.search && !m.title.toLowerCase().includes(params.search.toLowerCase())) {
        return false;
      }
      if (params.genre && !m.genres.includes(params.genre)) {
        return false;
      }
      return true;
    });
  }
}

export class InMemoryShowtimeRepository implements ShowtimeRepository {
  public showtimes: Showtime[] = [];
  public seatMaps: Map<string, HallSeatMap> = new Map();
  public cinemaGroups: CinemaShowtimesGroup[] = [];

  async findById(id: string): Promise<Showtime | null> {
    return this.showtimes.find((s) => s.id === id) || null;
  }

  async findByMovieAndDate(movieId: string, _dateStr: string): Promise<CinemaShowtimesGroup[]> {
    return this.cinemaGroups.filter((g) => g.showtimes.some((s) => s.movieId === movieId));
  }

  async getHallSeatMap(showtimeId: string): Promise<HallSeatMap | null> {
    return this.seatMaps.get(showtimeId) || null;
  }
}

export class InMemorySeatHoldStore implements SeatHoldStore {
  // Map of showtimeId + seatId -> { holdId, expiresAt }
  private heldSeats = new Map<string, { holdId: string; expiresAt: Date; showtimeId: string }>();
  // Map of holdId -> seatKey[]
  private holds = new Map<string, { showtimeId: string; seatIds: string[]; expiresAt: Date }>();

  constructor(private readonly clock: Clock) {}

  async holdSeats(
    showtimeId: string,
    seatIds: string[],
    ttlSeconds: number,
  ): Promise<{ holdId: string; expiresAt: Date }> {
    const now = this.clock.now();

    // Limpiar expirados primero
    for (const [key, val] of this.heldSeats.entries()) {
      if (val.expiresAt.getTime() <= now.getTime()) {
        this.heldSeats.delete(key);
      }
    }

    // Verificar si alguno ya está held
    for (const sid of seatIds) {
      const key = `${showtimeId}:${sid}`;
      if (this.heldSeats.has(key)) {
        throw new SeatUnavailableError(`Asiento ${sid} ya se encuentra reservado temporalmente`);
      }
    }

    const holdId = `hold-${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    for (const sid of seatIds) {
      const key = `${showtimeId}:${sid}`;
      this.heldSeats.set(key, { holdId, expiresAt, showtimeId });
    }

    this.holds.set(holdId, { showtimeId, seatIds, expiresAt });
    return { holdId, expiresAt };
  }

  async verifyHold(showtimeId: string, holdId: string, seatIds: string[]): Promise<boolean> {
    const now = this.clock.now();
    const hold = this.holds.get(holdId);
    if (!hold) return false;
    if (hold.showtimeId !== showtimeId) return false;
    if (hold.expiresAt.getTime() <= now.getTime()) return false;

    for (const sid of seatIds) {
      const held = this.heldSeats.get(`${showtimeId}:${sid}`);
      if (!held || held.holdId !== holdId) {
        return false;
      }
    }

    return true;
  }

  async releaseHold(holdId: string): Promise<void> {
    const hold = this.holds.get(holdId);
    if (!hold) return;

    for (const sid of hold.seatIds) {
      this.heldSeats.delete(`${hold.showtimeId}:${sid}`);
    }
    this.holds.delete(holdId);
  }

  async getHeldSeatIds(showtimeId: string): Promise<string[]> {
    const now = this.clock.now();
    const result: string[] = [];

    for (const [key, val] of this.heldSeats.entries()) {
      if (val.showtimeId === showtimeId && val.expiresAt.getTime() > now.getTime()) {
        const [, seatId] = key.split(':');
        result.push(seatId);
      }
    }

    return result;
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  public orders: Order[] = [];

  async create(data: CreateOrderData): Promise<Order> {
    const order: Order = {
      id: `ord-${Math.random().toString(36).slice(2, 9)}`,
      userId: data.userId,
      showtimeId: data.showtimeId,
      status: 'SEATS_HELD',
      subtotalCents: data.subtotalCents,
      feesCents: data.feesCents,
      totalCents: data.totalCents,
      holdExpiresAt: data.holdExpiresAt.toISOString(),
      idempotencyKey: data.idempotencyKey,
      createdAt: new Date().toISOString(),
      seats: data.seats.map((s, idx) => ({
        id: `oseat-${idx}`,
        orderId: `ord-pending`,
        showtimeId: data.showtimeId,
        seatId: s.seatId,
        ticketTypeId: s.ticketTypeId,
        priceCents: s.priceCents,
      })),
      food: data.food.map((f, idx) => ({
        id: `ofood-${idx}`,
        orderId: `ord-pending`,
        foodItemId: f.foodItemId,
        size: f.size || null,
        qty: f.qty,
        priceCents: f.priceCents,
      })),
    };

    this.orders.push(order);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.find((o) => o.id === id) || null;
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    return this.orders.find((o) => o.idempotencyKey === key) || null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.orders.filter((o) => o.userId === userId);
  }

  async updateStatus(id: string, status: OrderStatus, qrCode?: string): Promise<Order> {
    const order = this.orders.find((o) => o.id === id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }
    order.status = status;
    if (qrCode) {
      order.qrCode = qrCode;
    }
    return order;
  }
}

export class InMemoryCatalogRepository implements CatalogRepository {
  public foodItems: FoodItem[] = [];
  public ticketTypes: TicketType[] = [];

  async getFoodItems(): Promise<FoodItem[]> {
    return this.foodItems;
  }

  async getTicketTypes(): Promise<TicketType[]> {
    return this.ticketTypes;
  }
}

export class DeterministicPaymentGateway implements PaymentGateway {
  async process(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    const card = input.paymentDetails.cardNumber;

    if (card.endsWith('0000')) {
      return {
        success: false,
        errorCode: 'PAYMENT_DECLINED',
        errorMessage: 'Tarjeta rechazada por la entidad bancaria (0000)',
      };
    }

    if (card.endsWith('1111')) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Error de conexión con la pasarela de pagos (1111)',
      };
    }

    return {
      success: true,
      transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  }
}
