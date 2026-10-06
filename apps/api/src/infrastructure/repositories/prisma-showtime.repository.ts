import { PrismaClient, HallFormat, SeatType } from '@prisma/client';
import { ShowtimeRepository } from '../../application/ports/index.js';
import { Showtime, CinemaShowtimesGroup, HallSeatMap, SeatWithStatus } from '@cinetickets/shared';

export class PrismaShowtimeRepository implements ShowtimeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapFormat(fmt: HallFormat): '2D' | '3D' | 'IMAX' | 'VIP' {
    if (fmt === HallFormat.TWO_D) return '2D';
    if (fmt === HallFormat.THREE_D) return '3D';
    if (fmt === HallFormat.IMAX) return 'IMAX';
    return 'VIP';
  }

  async findById(id: string): Promise<Showtime | null> {
    const st = await this.prisma.showtime.findUnique({
      where: { id },
      include: {
        hall: {
          include: {
            cinema: true,
          },
        },
      },
    });

    if (!st) return null;

    return {
      id: st.id,
      movieId: st.movieId,
      hallId: st.hallId,
      startsAt: st.startsAt.toISOString(),
      language: st.language,
      format: this.mapFormat(st.format),
      priceStandardCents: st.priceStandardCents,
      priceVipCents: st.priceVipCents,
      priceAccessibleCents: st.priceAccessibleCents,
      hall: {
        id: st.hall.id,
        cinemaId: st.hall.cinemaId,
        name: st.hall.name,
        format: this.mapFormat(st.hall.format),
        rows: st.hall.rows,
        cols: st.hall.cols,
      },
      cinema: {
        id: st.hall.cinema.id,
        name: st.hall.cinema.name,
        address: st.hall.cinema.address,
        city: st.hall.cinema.city,
        timezone: st.hall.cinema.timezone,
        amenities: st.hall.cinema.amenities,
      },
    };
  }

  async findByMovieAndDate(movieId: string, dateStr: string): Promise<CinemaShowtimesGroup[]> {
    // Definir ventana del día UTC
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const showtimes = await this.prisma.showtime.findMany({
      where: {
        movieId,
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        hall: {
          include: {
            cinema: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    // Agrupar por cine
    const cinemaMap = new Map<
      string,
      { cinema: CinemaShowtimesGroup['cinema']; showtimes: Showtime[] }
    >();

    for (const st of showtimes) {
      const cinema = st.hall.cinema;
      if (!cinemaMap.has(cinema.id)) {
        cinemaMap.set(cinema.id, {
          cinema: {
            id: cinema.id,
            name: cinema.name,
            address: cinema.address,
            city: cinema.city,
            timezone: cinema.timezone,
            amenities: cinema.amenities,
          },
          showtimes: [],
        });
      }

      cinemaMap.get(cinema.id)!.showtimes.push({
        id: st.id,
        movieId: st.movieId,
        hallId: st.hallId,
        startsAt: st.startsAt.toISOString(),
        language: st.language,
        format: this.mapFormat(st.format),
        priceStandardCents: st.priceStandardCents,
        priceVipCents: st.priceVipCents,
        priceAccessibleCents: st.priceAccessibleCents,
        hall: {
          id: st.hall.id,
          cinemaId: st.hall.cinemaId,
          name: st.hall.name,
          format: this.mapFormat(st.hall.format),
          rows: st.hall.rows,
          cols: st.hall.cols,
        },
      });
    }

    return Array.from(cinemaMap.values());
  }

  async getHallSeatMap(showtimeId: string): Promise<HallSeatMap | null> {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        hall: {
          include: {
            cinema: true,
            seats: {
              orderBy: [{ row: 'asc' }, { number: 'asc' }],
            },
          },
        },
      },
    });

    if (!showtime) return null;

    // Buscar asientos con órdenes confirmadas en esta función
    const soldOrderSeats = await this.prisma.orderSeat.findMany({
      where: {
        showtimeId,
        order: {
          status: 'CONFIRMED',
        },
      },
      select: { seatId: true },
    });

    const soldSeatIds = new Set(soldOrderSeats.map((os) => os.seatId));

    const mapSeatType = (t: SeatType): 'standard' | 'vip' | 'accessible' => {
      if (t === SeatType.vip) return 'vip';
      if (t === SeatType.accessible) return 'accessible';
      return 'standard';
    };

    const seats: SeatWithStatus[] = showtime.hall.seats.map((s) => ({
      id: s.id,
      hallId: s.hallId,
      row: s.row,
      number: s.number,
      type: mapSeatType(s.type),
      x: s.x,
      y: s.y,
      status: soldSeatIds.has(s.id) ? 'occupied' : 'available',
    }));

    return {
      hall: {
        id: showtime.hall.id,
        cinemaId: showtime.hall.cinemaId,
        name: showtime.hall.name,
        format: this.mapFormat(showtime.hall.format),
        rows: showtime.hall.rows,
        cols: showtime.hall.cols,
      },
      showtime: {
        id: showtime.id,
        movieId: showtime.movieId,
        hallId: showtime.hallId,
        startsAt: showtime.startsAt.toISOString(),
        language: showtime.language,
        format: this.mapFormat(showtime.format),
        priceStandardCents: showtime.priceStandardCents,
        priceVipCents: showtime.priceVipCents,
        priceAccessibleCents: showtime.priceAccessibleCents,
      },
      seats,
    };
  }
}
