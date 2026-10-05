import { CinemaShowtimesGroup, HallSeatMap } from '@cinetickets/shared';
import { ShowtimeRepository, SeatHoldStore } from '../ports/index.js';
import { NotFoundError } from '../../domain/errors.js';

export class GetShowtimesUseCase {
  constructor(private readonly showtimeRepo: ShowtimeRepository) {}

  async execute(movieId: string, dateStr: string): Promise<CinemaShowtimesGroup[]> {
    return this.showtimeRepo.findByMovieAndDate(movieId, dateStr);
  }
}

export class GetSeatMapUseCase {
  constructor(
    private readonly showtimeRepo: ShowtimeRepository,
    private readonly seatHoldStore: SeatHoldStore,
  ) {}

  async execute(showtimeId: string): Promise<HallSeatMap> {
    const seatMap = await this.showtimeRepo.getHallSeatMap(showtimeId);
    if (!seatMap) {
      throw new NotFoundError('Función', showtimeId);
    }

    // Consultar holds activos en tiempo real en Redis/store
    const heldSeatIds = await this.seatHoldStore.getHeldSeatIds(showtimeId);
    const heldSet = new Set(heldSeatIds);

    const updatedSeats = seatMap.seats.map((seat) => {
      if (seat.status === 'occupied') {
        return seat;
      }
      if (heldSet.has(seat.id)) {
        return { ...seat, status: 'held' as const };
      }
      return seat;
    });

    return {
      ...seatMap,
      seats: updatedSeats,
    };
  }
}
