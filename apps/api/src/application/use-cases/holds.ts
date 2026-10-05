import { HOLD_TTL_SECONDS, HoldResponse } from '@cinetickets/shared';
import { ShowtimeRepository, SeatHoldStore, Clock } from '../ports/index.js';
import { NotFoundError, SeatUnavailableError, ValidationError } from '../../domain/errors.js';
import { validateSeatSelection } from '../../domain/seats.js';

export class HoldSeatsUseCase {
  constructor(
    private readonly showtimeRepo: ShowtimeRepository,
    private readonly seatHoldStore: SeatHoldStore,
    private readonly clock: Clock,
  ) {}

  async execute(showtimeId: string, seatIds: string[]): Promise<HoldResponse> {
    validateSeatSelection(seatIds);

    const showtime = await this.showtimeRepo.findById(showtimeId);
    if (!showtime) {
      throw new NotFoundError('Función', showtimeId);
    }

    // Verificar si la función ya empezó
    const now = this.clock.now();
    if (new Date(showtime.startsAt).getTime() <= now.getTime()) {
      throw new ValidationError('No es posible reservar asientos para una función pasada');
    }

    // Obtener mapa para verificar que los asientos pertenecen a la sala y no están ocupados
    const seatMap = await this.showtimeRepo.getHallSeatMap(showtimeId);
    if (!seatMap) {
      throw new NotFoundError('Mapa de sala para la función', showtimeId);
    }

    const hallSeatIds = new Set(seatMap.seats.map((s) => s.id));
    for (const sid of seatIds) {
      if (!hallSeatIds.has(sid)) {
        throw new NotFoundError(`Asiento '${sid}' no pertenece a la sala de esta función`);
      }
    }

    // Verificar si alguno ya está ocupado definitivamente
    const occupiedSeatIds = new Set(
      seatMap.seats.filter((s) => s.status === 'occupied').map((s) => s.id),
    );
    for (const sid of seatIds) {
      if (occupiedSeatIds.has(sid)) {
        throw new SeatUnavailableError(`El asiento '${sid}' ya ha sido vendido`, {
          seatId: sid,
        });
      }
    }

    // Intentar hold atómico en el store (Redis)
    try {
      const { holdId, expiresAt } = await this.seatHoldStore.holdSeats(
        showtimeId,
        seatIds,
        HOLD_TTL_SECONDS,
      );

      return {
        holdId,
        showtimeId,
        seatIds,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (err: unknown) {
      if (err instanceof SeatUnavailableError) {
        throw err;
      }
      throw new SeatUnavailableError(
        'Uno o más asientos acaban de ser seleccionados por otro usuario',
      );
    }
  }
}

export class ReleaseHoldUseCase {
  constructor(private readonly seatHoldStore: SeatHoldStore) {}

  async execute(holdId: string): Promise<void> {
    await this.seatHoldStore.releaseHold(holdId);
  }
}
