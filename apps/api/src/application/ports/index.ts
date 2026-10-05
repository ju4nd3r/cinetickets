import {
  Movie,
  Showtime,
  HallSeatMap,
  CinemaShowtimesGroup,
  Order,
  OrderStatus,
  TicketType,
  FoodItem,
} from '@cinetickets/shared';

export interface Clock {
  now(): Date;
}

export interface MovieRepository {
  findById(id: string): Promise<Movie | null>;
  search(params: {
    search?: string;
    genre?: string;
    cinemaId?: string;
    format?: string;
  }): Promise<Movie[]>;
}

export interface ShowtimeRepository {
  findById(id: string): Promise<Showtime | null>;
  findByMovieAndDate(movieId: string, dateStr: string): Promise<CinemaShowtimesGroup[]>;
  getHallSeatMap(showtimeId: string): Promise<HallSeatMap | null>;
}

export interface SeatHoldStore {
  holdSeats(
    showtimeId: string,
    seatIds: string[],
    ttlSeconds: number,
  ): Promise<{ holdId: string; expiresAt: Date }>;
  verifyHold(showtimeId: string, holdId: string, seatIds: string[]): Promise<boolean>;
  releaseHold(holdId: string): Promise<void>;
  getHeldSeatIds(showtimeId: string): Promise<string[]>;
}

export interface CreateOrderData {
  userId: string;
  showtimeId: string;
  idempotencyKey: string;
  holdExpiresAt: Date;
  subtotalCents: number;
  feesCents: number;
  totalCents: number;
  seats: {
    seatId: string;
    ticketTypeId: string;
    priceCents: number;
  }[];
  food: {
    foodItemId: string;
    size?: string | null;
    qty: number;
    priceCents: number;
  }[];
}

export interface OrderRepository {
  create(data: CreateOrderData): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus, qrCode?: string): Promise<Order>;
}

export interface PaymentDetails {
  cardNumber: string;
  cardHolderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

export interface ProcessPaymentInput {
  orderId: string;
  amountCents: number;
  paymentDetails: PaymentDetails;
  idempotencyKey?: string;
}

export interface ProcessPaymentOutput {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentGateway {
  process(input: ProcessPaymentInput): Promise<ProcessPaymentOutput>;
}

export interface CatalogRepository {
  getFoodItems(category?: string): Promise<FoodItem[]>;
  getTicketTypes(): Promise<TicketType[]>;
}
