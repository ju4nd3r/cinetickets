import { PrismaClient, Prisma, HallFormat, SeatType } from '@prisma/client';
import { CreateOrderData, OrderRepository } from '../../application/ports/index.js';
import { Order, OrderStatus } from '@cinetickets/shared';
import { SeatUnavailableError } from '../../domain/errors.js';

const orderIncludes = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    seats: {
      include: {
        seat: true,
        ticketType: true,
      },
    },
    food: {
      include: {
        foodItem: true,
      },
    },
    showtime: {
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
          },
        },
      },
    },
    user: true,
  },
});

type DbOrderWithRelations = Prisma.OrderGetPayload<typeof orderIncludes>;

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapFormat(fmt: HallFormat): '2D' | '3D' | 'IMAX' | 'VIP' {
    if (fmt === HallFormat.TWO_D) return '2D';
    if (fmt === HallFormat.THREE_D) return '3D';
    if (fmt === HallFormat.IMAX) return 'IMAX';
    return 'VIP';
  }

  private mapSeatType(t: SeatType): 'standard' | 'vip' | 'accessible' {
    if (t === SeatType.vip) return 'vip';
    if (t === SeatType.accessible) return 'accessible';
    return 'standard';
  }

  private mapOrder(dbOrder: DbOrderWithRelations): Order {
    return {
      id: dbOrder.id,
      userId: dbOrder.userId,
      showtimeId: dbOrder.showtimeId,
      status: dbOrder.status as OrderStatus,
      subtotalCents: dbOrder.subtotalCents,
      feesCents: dbOrder.feesCents,
      totalCents: dbOrder.totalCents,
      holdExpiresAt: dbOrder.holdExpiresAt.toISOString(),
      idempotencyKey: dbOrder.idempotencyKey,
      qrCode: dbOrder.qrCode ?? null,
      createdAt: dbOrder.createdAt.toISOString(),
      seats: dbOrder.seats?.map((s) => ({
        id: s.id,
        orderId: s.orderId,
        showtimeId: s.showtimeId,
        seatId: s.seatId,
        ticketTypeId: s.ticketTypeId,
        priceCents: s.priceCents,
        seat: s.seat
          ? {
              id: s.seat.id,
              hallId: s.seat.hallId,
              row: s.seat.row,
              number: s.seat.number,
              type: this.mapSeatType(s.seat.type),
              x: s.seat.x,
              y: s.seat.y,
            }
          : undefined,
        ticketType: s.ticketType
          ? {
              id: s.ticketType.id,
              label: s.ticketType.label,
              discountPct: s.ticketType.discountPct,
            }
          : undefined,
      })),
      food: dbOrder.food?.map((f) => ({
        id: f.id,
        orderId: f.orderId,
        foodItemId: f.foodItemId,
        size: f.size ?? null,
        qty: f.qty,
        priceCents: f.priceCents,
        foodItem: f.foodItem
          ? {
              id: f.foodItem.id,
              name: f.foodItem.name,
              description: f.foodItem.description,
              category: f.foodItem.category,
              priceCents: f.foodItem.priceCents,
              imageUrl: f.foodItem.imageUrl,
              sizes: f.foodItem.sizes,
              available: f.foodItem.available,
            }
          : undefined,
      })),
      showtime: dbOrder.showtime
        ? {
            id: dbOrder.showtime.id,
            movieId: dbOrder.showtime.movieId,
            hallId: dbOrder.showtime.hallId,
            startsAt: dbOrder.showtime.startsAt.toISOString(),
            language: dbOrder.showtime.language,
            format: this.mapFormat(dbOrder.showtime.format),
            priceStandardCents: dbOrder.showtime.priceStandardCents,
            priceVipCents: dbOrder.showtime.priceVipCents,
            priceAccessibleCents: dbOrder.showtime.priceAccessibleCents,
            hall: dbOrder.showtime.hall
              ? {
                  id: dbOrder.showtime.hall.id,
                  cinemaId: dbOrder.showtime.hall.cinemaId,
                  name: dbOrder.showtime.hall.name,
                  format: this.mapFormat(dbOrder.showtime.hall.format),
                  rows: dbOrder.showtime.hall.rows,
                  cols: dbOrder.showtime.hall.cols,
                }
              : undefined,
            cinema: dbOrder.showtime.hall?.cinema
              ? {
                  id: dbOrder.showtime.hall.cinema.id,
                  name: dbOrder.showtime.hall.cinema.name,
                  address: dbOrder.showtime.hall.cinema.address,
                  city: dbOrder.showtime.hall.cinema.city,
                  timezone: dbOrder.showtime.hall.cinema.timezone,
                  amenities: dbOrder.showtime.hall.cinema.amenities,
                }
              : undefined,
            movie: dbOrder.showtime.movie
              ? {
                  id: dbOrder.showtime.movie.id,
                  title: dbOrder.showtime.movie.title,
                  originalTitle: dbOrder.showtime.movie.originalTitle ?? undefined,
                  director: dbOrder.showtime.movie.director,
                  cast: dbOrder.showtime.movie.cast,
                  synopsis: dbOrder.showtime.movie.synopsis,
                  genres: dbOrder.showtime.movie.genres,
                  durationMin: dbOrder.showtime.movie.durationMin,
                  rating: dbOrder.showtime.movie.rating,
                  language: dbOrder.showtime.movie.language,
                  subtitles: dbOrder.showtime.movie.subtitles,
                  releaseDate: dbOrder.showtime.movie.releaseDate.toISOString().split('T')[0],
                  posterUrl: dbOrder.showtime.movie.posterUrl,
                  trailerUrl: dbOrder.showtime.movie.trailerUrl ?? undefined,
                  score: dbOrder.showtime.movie.score,
                  country: dbOrder.showtime.movie.country,
                  year: dbOrder.showtime.movie.year,
                }
              : undefined,
          }
        : undefined,
      user: dbOrder.user
        ? {
            id: dbOrder.user.id,
            name: dbOrder.user.name,
            email: dbOrder.user.email,
            phone: dbOrder.user.phone ?? undefined,
          }
        : undefined,
    };
  }

  private defaultIncludes = orderIncludes.include;

  async create(data: CreateOrderData): Promise<Order> {
    try {
      const created = await this.prisma.order.create({
        data: {
          userId: data.userId,
          showtimeId: data.showtimeId,
          idempotencyKey: data.idempotencyKey,
          status: 'SEATS_HELD',
          subtotalCents: data.subtotalCents,
          feesCents: data.feesCents,
          totalCents: data.totalCents,
          holdExpiresAt: data.holdExpiresAt,
          seats: {
            create: data.seats.map((s) => ({
              showtimeId: data.showtimeId,
              seatId: s.seatId,
              ticketTypeId: s.ticketTypeId,
              priceCents: s.priceCents,
            })),
          },
          food: {
            create: data.food.map((f) => ({
              foodItemId: f.foodItemId,
              size: f.size,
              qty: f.qty,
              priceCents: f.priceCents,
            })),
          },
        },
        include: this.defaultIncludes,
      });

      return this.mapOrder(created);
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : '';
          if (target.includes('idempotencyKey')) {
            const existing = await this.findByIdempotencyKey(data.idempotencyKey);
            if (existing) return existing;
          }
          throw new SeatUnavailableError(
            'Uno o más asientos ya han sido vendidos para esta función',
          );
        }
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.defaultIncludes,
    });
    return order ? this.mapOrder(order) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: this.defaultIncludes,
    });
    return order ? this.mapOrder(order) : null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: this.defaultIncludes,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.mapOrder(o));
  }

  async updateStatus(id: string, status: OrderStatus, qrCode?: string): Promise<Order> {
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        ...(qrCode !== undefined ? { qrCode } : {}),
      },
      include: this.defaultIncludes,
    });
    return this.mapOrder(updated);
  }
}
